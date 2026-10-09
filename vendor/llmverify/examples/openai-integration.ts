/**
 * OpenAI Integration Example
 * 
 * Shows how to integrate llmverify with OpenAI's API for
 * real-time AI output verification.
 * 
 * @example
 * ```bash
 * OPENAI_API_KEY=sk-xxx npx ts-node examples/openai-integration.ts
 * ```
 */

import { 
  run, 
  devVerify,
  prodVerify,
  strictVerify,
  isInputSafe, 
  redactPII,
  createAdapter,
  monitorLLM
} from 'llmverify';

// Note: Install openai package: npm install openai
// import OpenAI from 'openai';

// ============================================================================
// PATTERN 1: Basic OpenAI + llmverify
// ============================================================================

async function basicOpenAIVerification(prompt: string) {
  // Simulated OpenAI response (replace with actual OpenAI call)
  const aiResponse = `Here's the answer to "${prompt}": The result is...`;

  // Verify the response
  const result = await devVerify(aiResponse, prompt);

  return {
    response: aiResponse,
    risk: result.verification.risk.level,
    action: result.verification.risk.action,
    safe: result.verification.risk.level === 'low'
  };
}

// ============================================================================
// PATTERN 2: OpenAI with Full Verification Pipeline
// ============================================================================

interface VerifiedCompletion {
  content: string;
  verified: boolean;
  risk: {
    level: string;
    score: number;
    action: string;
  };
  checks: {
    inputSafe: boolean;
    piiDetected: boolean;
    harmfulContent: boolean;
  };
  meta: {
    latencyMs: number;
    preset: string;
  };
}

async function verifiedOpenAICompletion(
  prompt: string,
  userInput?: string,
  options: { preset?: 'dev' | 'prod' | 'strict' } = {}
): Promise<VerifiedCompletion> {
  const startTime = Date.now();
  const preset = options.preset || 'prod';

  // Step 1: Verify user input if provided
  if (userInput && !isInputSafe(userInput)) {
    return {
      content: '',
      verified: false,
      risk: { level: 'critical', score: 1, action: 'block' },
      checks: { inputSafe: false, piiDetected: false, harmfulContent: false },
      meta: { latencyMs: Date.now() - startTime, preset }
    };
  }

  // Step 2: Call OpenAI (simulated)
  const aiResponse = `Response to: ${prompt}`;

  // Step 3: Full verification
  const result = await run({
    content: aiResponse,
    prompt,
    userInput,
    preset
  });

  // Step 4: Redact PII if needed
  let finalContent = aiResponse;
  if (result.piiCheck?.hasPII) {
    const { redacted } = redactPII(aiResponse);
    finalContent = redacted;
  }

  return {
    content: finalContent,
    verified: result.verification.risk.level !== 'critical',
    risk: {
      level: result.verification.risk.level,
      score: result.verification.risk.overall,
      action: result.verification.risk.action
    },
    checks: {
      inputSafe: result.inputSafety?.safe ?? true,
      piiDetected: result.piiCheck?.hasPII ?? false,
      harmfulContent: result.harmfulCheck?.hasHarmful ?? false
    },
    meta: {
      latencyMs: Date.now() - startTime,
      preset
    }
  };
}

// ============================================================================
// PATTERN 3: OpenAI with Adapter and Monitoring
// ============================================================================

/*
// Uncomment when using with actual OpenAI

import OpenAI from 'openai';

async function monitoredOpenAI() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Create llmverify adapter
  const adapter = createAdapter({
    provider: 'openai',
    client: openai
  });

  // Wrap with monitoring
  const monitored = monitorLLM(adapter, {
    hooks: {
      onHealthCheck: (report) => console.log('Health:', report.status),
      onDegraded: (report) => console.warn('⚠️ LLM Degraded:', report),
      onUnstable: (report) => console.error('🚨 LLM Unstable:', report)
    }
  });

  // Use the monitored client
  const response = await monitored.generate({
    prompt: 'Hello, world!',
    model: 'gpt-4'
  });

  console.log('Response:', response.content);
  console.log('Health:', response.llmverify.health);
  console.log('Latency:', response.llmverify.latency);

  return response;
}
*/

// ============================================================================
// PATTERN 4: Batch Processing with Verification
// ============================================================================

async function batchVerifiedCompletions(
  prompts: string[],
  options: { preset?: 'dev' | 'prod' | 'strict'; parallel?: boolean } = {}
): Promise<VerifiedCompletion[]> {
  const { preset = 'prod', parallel = true } = options;

  if (parallel) {
    // Process all in parallel
    return Promise.all(
      prompts.map(prompt => verifiedOpenAICompletion(prompt, undefined, { preset }))
    );
  } else {
    // Process sequentially
    const results: VerifiedCompletion[] = [];
    for (const prompt of prompts) {
      results.push(await verifiedOpenAICompletion(prompt, undefined, { preset }));
    }
    return results;
  }
}

// ============================================================================
// PATTERN 5: Function Calling with Verification
// ============================================================================

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

async function verifiedFunctionCall(
  functionCall: FunctionCall,
  functionResult: string
): Promise<{ safe: boolean; result: string; risk: string }> {
  // Verify the function result before returning to AI
  const result = await run({
    content: functionResult,
    prompt: `Function ${functionCall.name} with args: ${JSON.stringify(functionCall.arguments)}`,
    preset: 'strict'  // Use strict for function outputs
  });

  // Redact sensitive data
  const { redacted } = redactPII(functionResult);

  return {
    safe: result.verification.risk.level !== 'critical',
    result: redacted,
    risk: result.verification.risk.level
  };
}

// ============================================================================
// PATTERN 6: Streaming with Real-time Verification
// ============================================================================

async function* verifiedStream(prompt: string): AsyncGenerator<{
  chunk: string;
  verified: boolean;
  risk?: string;
}> {
  // Simulated streaming chunks
  const chunks = ['Hello', ', ', 'this', ' is', ' a', ' response', '.'];
  let accumulated = '';

  for (const chunk of chunks) {
    accumulated += chunk;
    
    // Quick verification every few chunks
    if (accumulated.length > 20) {
      const quickCheck = await run({
        content: accumulated,
        preset: 'fast'
      });

      if (quickCheck.verification.risk.level === 'critical') {
        yield { chunk: '[BLOCKED]', verified: false, risk: 'critical' };
        return;
      }
    }

    yield { chunk, verified: true };
  }

  // Final verification
  const finalCheck = await prodVerify(accumulated);
  yield { 
    chunk: '', 
    verified: true, 
    risk: finalCheck.verification.risk.level 
  };
}

// ============================================================================
// DEMO
// ============================================================================

async function demo() {
  console.log('🤖 OpenAI + llmverify Integration Demo\n');
  console.log('='.repeat(50));

  // Demo 1: Basic verification
  console.log('\n📝 Pattern 1: Basic Verification');
  const basic = await basicOpenAIVerification('What is 2+2?');
  console.log(`Risk: ${basic.risk}, Safe: ${basic.safe}`);

  // Demo 2: Full pipeline
  console.log('\n📝 Pattern 2: Full Pipeline');
  const full = await verifiedOpenAICompletion(
    'Explain machine learning',
    'Tell me about ML',
    { preset: 'dev' }
  );
  console.log(`Verified: ${full.verified}, Risk: ${full.risk.level}`);
  console.log(`Latency: ${full.meta.latencyMs}ms`);

  // Demo 3: Batch processing
  console.log('\n📝 Pattern 3: Batch Processing');
  const batch = await batchVerifiedCompletions([
    'What is AI?',
    'Explain neural networks',
    'What is deep learning?'
  ], { preset: 'prod', parallel: true });
  console.log(`Processed ${batch.length} prompts`);
  batch.forEach((r, i) => console.log(`  ${i + 1}. Risk: ${r.risk.level}`));

  // Demo 4: Streaming
  console.log('\n📝 Pattern 4: Streaming');
  process.stdout.write('  Stream: ');
  for await (const { chunk, verified } of verifiedStream('Hello')) {
    process.stdout.write(chunk);
  }
  console.log(' [verified]');
}

// Run demo
demo().catch(console.error);

export {
  basicOpenAIVerification,
  verifiedOpenAICompletion,
  batchVerifiedCompletions,
  verifiedFunctionCall,
  verifiedStream
};
