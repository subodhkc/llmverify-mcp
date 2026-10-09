/**
 * AI Content Moderation Example
 * 
 * Shows how to use llmverify for AI-generated content moderation
 * in production systems (social media, forums, user-generated content).
 * 
 * @example
 * ```bash
 * npx ts-node examples/content-moderation.ts
 * ```
 */

import {
  run,
  verify,
  isInputSafe,
  containsPII,
  redactPII,
  checkHarmfulContent,
  checkPII,
  getInjectionRiskScore
} from 'llmverify';

// ============================================================================
// CONTENT MODERATION SYSTEM
// ============================================================================

type ModerationAction = 'approve' | 'review' | 'reject' | 'redact';
type ContentType = 'text' | 'ai-response' | 'user-comment' | 'ai-summary';

interface ModerationResult {
  action: ModerationAction;
  originalContent: string;
  processedContent: string;
  flags: string[];
  confidence: number;
  details: {
    pii: { detected: boolean; count: number; types: string[] };
    harmful: { detected: boolean; categories: string[] };
    injection: { detected: boolean; score: number };
    risk: { level: string; score: number };
  };
  processingTimeMs: number;
}

interface ModerationConfig {
  strictMode: boolean;
  autoRedactPII: boolean;
  blockThreshold: number;
  reviewThreshold: number;
  allowedCategories?: string[];
}

const DEFAULT_CONFIG: ModerationConfig = {
  strictMode: false,
  autoRedactPII: true,
  blockThreshold: 0.7,
  reviewThreshold: 0.4,
  allowedCategories: []
};

// ============================================================================
// MAIN MODERATION FUNCTION
// ============================================================================

async function moderateContent(
  content: string,
  contentType: ContentType = 'text',
  config: Partial<ModerationConfig> = {}
): Promise<ModerationResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const flags: string[] = [];

  // Choose preset based on content type and config
  const preset = cfg.strictMode ? 'strict' : 
                 contentType === 'ai-response' ? 'prod' : 'dev';

  // Run full verification
  const result = await run({
    content,
    preset
  });

  // Analyze PII
  const piiFindings = checkPII(content);
  const piiTypes = [...new Set(piiFindings.map(f => f.message.split(':')[0]))];
  if (piiFindings.length > 0) {
    flags.push('pii-detected');
  }

  // Analyze harmful content
  const harmfulFindings = checkHarmfulContent(content);
  const harmfulCategories = [...new Set(harmfulFindings.map(f => f.category))];
  if (harmfulFindings.length > 0) {
    flags.push('harmful-content');
  }

  // Check for injection (if user-generated)
  const injectionScore = contentType === 'user-comment' 
    ? getInjectionRiskScore(content) 
    : 0;
  if (injectionScore > 0.5) {
    flags.push('injection-risk');
  }

  // Determine action
  const riskScore = result.verification.risk.overall;
  let action: ModerationAction;
  let processedContent = content;

  if (riskScore >= cfg.blockThreshold || harmfulFindings.length > 0) {
    action = 'reject';
    flags.push('blocked');
  } else if (riskScore >= cfg.reviewThreshold) {
    action = 'review';
    flags.push('needs-review');
  } else if (piiFindings.length > 0 && cfg.autoRedactPII) {
    action = 'redact';
    const { redacted } = redactPII(content);
    processedContent = redacted;
    flags.push('auto-redacted');
  } else {
    action = 'approve';
  }

  return {
    action,
    originalContent: content,
    processedContent,
    flags,
    confidence: result.verification.risk.confidence?.value ?? 0.8,
    details: {
      pii: {
        detected: piiFindings.length > 0,
        count: piiFindings.length,
        types: piiTypes
      },
      harmful: {
        detected: harmfulFindings.length > 0,
        categories: harmfulCategories
      },
      injection: {
        detected: injectionScore > 0.5,
        score: injectionScore
      },
      risk: {
        level: result.verification.risk.level,
        score: riskScore
      }
    },
    processingTimeMs: Date.now() - startTime
  };
}

// ============================================================================
// BATCH MODERATION
// ============================================================================

async function moderateBatch(
  contents: Array<{ id: string; content: string; type: ContentType }>,
  config: Partial<ModerationConfig> = {}
): Promise<Map<string, ModerationResult>> {
  const results = new Map<string, ModerationResult>();

  // Process in parallel for speed
  const promises = contents.map(async ({ id, content, type }) => {
    const result = await moderateContent(content, type, config);
    return { id, result };
  });

  const processed = await Promise.all(promises);
  processed.forEach(({ id, result }) => results.set(id, result));

  return results;
}

// ============================================================================
// MODERATION QUEUE PROCESSOR
// ============================================================================

class ModerationQueue {
  private queue: Array<{ id: string; content: string; type: ContentType }> = [];
  private config: ModerationConfig;
  private onResult?: (id: string, result: ModerationResult) => void;

  constructor(config: Partial<ModerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  add(id: string, content: string, type: ContentType = 'text') {
    this.queue.push({ id, content, type });
  }

  onModerated(callback: (id: string, result: ModerationResult) => void) {
    this.onResult = callback;
  }

  async process(): Promise<Map<string, ModerationResult>> {
    const results = await moderateBatch(this.queue, this.config);
    
    if (this.onResult) {
      results.forEach((result, id) => this.onResult!(id, result));
    }

    this.queue = [];
    return results;
  }

  get pending() {
    return this.queue.length;
  }
}

// ============================================================================
// REAL-TIME MODERATION MIDDLEWARE
// ============================================================================

function createModerationMiddleware(config: Partial<ModerationConfig> = {}) {
  return async function moderationMiddleware(
    content: string,
    contentType: ContentType = 'text'
  ): Promise<{ allowed: boolean; content: string; reason?: string }> {
    const result = await moderateContent(content, contentType, config);

    switch (result.action) {
      case 'approve':
        return { allowed: true, content: result.processedContent };
      
      case 'redact':
        return { allowed: true, content: result.processedContent };
      
      case 'review':
        return { 
          allowed: false, 
          content: '', 
          reason: 'Content flagged for manual review' 
        };
      
      case 'reject':
        return { 
          allowed: false, 
          content: '', 
          reason: `Content blocked: ${result.flags.join(', ')}` 
        };
      
      default:
        return { allowed: false, content: '', reason: 'Unknown moderation result' };
    }
  };
}

// ============================================================================
// SPECIALIZED MODERATORS
// ============================================================================

// For AI-generated summaries
async function moderateAISummary(summary: string, originalPrompt: string) {
  const result = await run({
    content: summary,
    prompt: originalPrompt,
    preset: 'strict'
  });

  return {
    approved: result.verification.risk.level === 'low',
    summary: result.piiCheck?.hasPII ? redactPII(summary).redacted : summary,
    classification: result.classification,
    risk: result.verification.risk
  };
}

// For user comments on AI content
async function moderateUserComment(comment: string) {
  // Check for injection attempts first
  if (!isInputSafe(comment)) {
    return {
      approved: false,
      reason: 'Potential injection detected',
      comment: ''
    };
  }

  const result = await moderateContent(comment, 'user-comment', {
    strictMode: true,
    autoRedactPII: true
  });

  return {
    approved: result.action === 'approve' || result.action === 'redact',
    reason: result.action === 'reject' ? result.flags.join(', ') : undefined,
    comment: result.processedContent
  };
}

// For AI chatbot responses
async function moderateChatbotResponse(response: string, userQuery: string) {
  const result = await run({
    content: response,
    prompt: userQuery,
    userInput: userQuery,
    preset: 'prod'
  });

  // Always redact PII in chatbot responses
  const { redacted, piiCount } = redactPII(response);

  return {
    safe: result.verification.risk.level !== 'critical',
    response: piiCount > 0 ? redacted : response,
    piiRedacted: piiCount,
    riskLevel: result.verification.risk.level,
    latencyMs: result.meta.totalLatencyMs
  };
}

// ============================================================================
// DEMO
// ============================================================================

async function demo() {
  console.log('🛡️ AI Content Moderation Demo\n');
  console.log('='.repeat(50));

  // Demo 1: Basic moderation
  console.log('\n📝 Demo 1: Basic Content Moderation');
  const result1 = await moderateContent(
    'This is a safe message about programming.',
    'text'
  );
  console.log(`Action: ${result1.action}, Risk: ${result1.details.risk.level}`);

  // Demo 2: PII detection and redaction
  console.log('\n📝 Demo 2: PII Detection');
  const result2 = await moderateContent(
    'Contact me at john@example.com or call 555-123-4567',
    'user-comment',
    { autoRedactPII: true }
  );
  console.log(`Action: ${result2.action}`);
  console.log(`Original: ${result2.originalContent}`);
  console.log(`Processed: ${result2.processedContent}`);

  // Demo 3: Harmful content
  console.log('\n📝 Demo 3: Harmful Content Detection');
  const result3 = await moderateContent(
    'I hate everyone and want to cause harm.',
    'user-comment',
    { strictMode: true }
  );
  console.log(`Action: ${result3.action}, Flags: ${result3.flags.join(', ')}`);

  // Demo 4: Batch moderation
  console.log('\n📝 Demo 4: Batch Moderation');
  const batch = await moderateBatch([
    { id: '1', content: 'Hello world!', type: 'text' },
    { id: '2', content: 'My email is test@test.com', type: 'user-comment' },
    { id: '3', content: 'Great article!', type: 'user-comment' }
  ]);
  batch.forEach((result, id) => {
    console.log(`  ${id}: ${result.action}`);
  });

  // Demo 5: Queue processing
  console.log('\n📝 Demo 5: Queue Processing');
  const queue = new ModerationQueue({ autoRedactPII: true });
  queue.add('msg1', 'First message');
  queue.add('msg2', 'Second message with email@test.com');
  queue.onModerated((id, result) => {
    console.log(`  Processed ${id}: ${result.action}`);
  });
  await queue.process();

  // Demo 6: Middleware
  console.log('\n📝 Demo 6: Middleware');
  const middleware = createModerationMiddleware({ strictMode: false });
  const check = await middleware('Safe content here', 'text');
  console.log(`Allowed: ${check.allowed}`);
}

// Run demo
demo().catch(console.error);

export {
  moderateContent,
  moderateBatch,
  ModerationQueue,
  createModerationMiddleware,
  moderateAISummary,
  moderateUserComment,
  moderateChatbotResponse,
  ModerationResult,
  ModerationConfig
};
