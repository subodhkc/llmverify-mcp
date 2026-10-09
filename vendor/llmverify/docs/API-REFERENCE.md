# llmverify API Reference

Complete programmatic API documentation for llmverify v1.4.0+

## What's New in v1.4.0

- **Enhanced Error Handling** - Standardized error codes with actionable suggestions
- **Logging & Audit System** - Structured logging and compliance-ready audit trails
- **Baseline Drift Detection** - Automatic performance tracking and drift alerts
- **Plugin System** - Extensible verification rules
- **Security Utilities** - Rate limiting, PII sanitization, safe regex execution

See [CHANGELOG.md](../CHANGELOG.md) for complete details.

## Table of Contents

- [Installation](#installation)
- [Core API](#core-api)
- [Configuration Management](#configuration-management)
- [Error Handling (v1.4.0)](#error-handling-v140)
- [Logging & Audit (v1.4.0)](#logging--audit-v140)
- [Baseline & Drift (v1.4.0)](#baseline--drift-v140)
- [Plugin System (v1.4.0)](#plugin-system-v140)
- [Security Utilities (v1.4.0)](#security-utilities-v140)
- [Verification Functions](#verification-functions)
- [Security Functions](#security-functions)
- [Classification Functions](#classification-functions)
- [Monitoring Functions](#monitoring-functions)
- [Type Definitions](#type-definitions)
- [JSON Schema](#json-schema)

---

## Installation

```bash
npm install llmverify
```

```typescript
import { verify, isInputSafe, redactPII } from 'llmverify';
```

---

## Core API

### `verify(options: VerifyOptions): Promise<VerifyResult>`

Main verification function. Runs comprehensive AI output verification.

**Parameters:**

```typescript
interface VerifyOptions {
  content: string;           // Required: Text to verify
  config?: Partial<Config>;  // Optional: Configuration overrides
  context?: {                // Optional: Additional context
    isJSON?: boolean;
    prompt?: string;
    userInput?: string;
  };
}
```

**Returns:** `Promise<VerifyResult>`

**Example:**

```typescript
import { verify } from 'llmverify';

const result = await verify({
  content: 'Your AI output here',
  config: {
    engines: {
      hallucination: { enabled: true },
      csm6: { enabled: true }
    }
  }
});

console.log(result.risk.level); // "low" | "moderate" | "high" | "critical"
```

**Result Schema:** See [VerifyResult Schema](#verifyresult-schema)

---

### `run(options: CoreRunOptions): Promise<CoreRunResult>`

Master function with preset configurations.

**Parameters:**

```typescript
interface CoreRunOptions {
  content: string;
  prompt?: string;
  userInput?: string;
  preset?: 'dev' | 'prod' | 'strict' | 'fast' | 'ci';
  config?: Partial<Config>;
}
```

**Presets:**
- `dev` - Development mode (all engines enabled)
- `prod` - Production mode (optimized for speed)
- `strict` - Maximum scrutiny (all checks enabled)
- `fast` - High-throughput mode (minimal checks)
- `ci` - CI/CD optimized (balanced)

**Example:**

```typescript
import { run } from 'llmverify';

const result = await run({
  content: 'AI output',
  prompt: 'Original prompt',
  preset: 'prod'
});
```

---

## Configuration Management

### `loadConfig(runtimeConfig?: Partial<Config>): Config`

Load configuration from multiple sources with priority: runtime > env > file > defaults.

**Sources (in priority order):**
1. Runtime config passed as parameter
2. Environment variables (`LLMVERIFY_*`)
3. Config file (`llmverify.config.json`)
4. Default configuration

**Example:**

```typescript
import { loadConfig } from 'llmverify';

// Load with all sources
const config = loadConfig();

// Load with runtime overrides
const config = loadConfig({
  tier: 'professional',
  engines: {
    hallucination: { enabled: true }
  }
});
```

---

### `loadConfigFromEnv(): Partial<Config>`

Load configuration from environment variables.

**Supported Environment Variables:**
- `LLMVERIFY_TIER` - Tier level (free, team, professional, enterprise)
- `LLMVERIFY_API_KEY` - API key for paid tiers
- `LLMVERIFY_TELEMETRY` - Enable telemetry (true/false)
- `LLMVERIFY_NETWORK_REQUESTS` - Allow network requests (true/false)

**Example:**

```bash
export LLMVERIFY_TIER=professional
export LLMVERIFY_API_KEY=your-api-key
```

```typescript
import { loadConfigFromEnv } from 'llmverify';

const envConfig = loadConfigFromEnv();
console.log(envConfig.tier); // "professional"
```

---

### `loadConfigFile(searchPath?: string): Partial<Config> | null`

Load configuration from `llmverify.config.json` file.

Searches for config file in current directory.

**Returns:** Config object or `null` if not found

**Example:**

```typescript
import { loadConfigFile } from 'llmverify';

const fileConfig = loadConfigFile();
if (fileConfig) {
  console.log('Config loaded from file');
}
```

---

### `createDefaultConfigFile(targetPath?: string): string`

Create a default `llmverify.config.json` file.

**Parameters:**
- `targetPath` - Directory to create config file (default: current directory)

**Returns:** Path to created config file

**Example:**

```typescript
import { createDefaultConfigFile } from 'llmverify';

const configPath = createDefaultConfigFile();
console.log(`Config created at: ${configPath}`);
```

**CLI Usage:**

```bash
npx llmverify init
```

---

## Error Handling (v1.4.0)

### Error Codes

llmverify v1.4.0 introduces standardized error codes for consistent error handling.

```typescript
import { ErrorCode, getErrorMetadata } from 'llmverify';

// Available error codes
ErrorCode.INVALID_INPUT          // LLMVERIFY_1001
ErrorCode.EMPTY_INPUT            // LLMVERIFY_1002
ErrorCode.CONTENT_TOO_LARGE      // LLMVERIFY_1003
ErrorCode.MALFORMED_CONFIG       // LLMVERIFY_2001
ErrorCode.TIMEOUT                // LLMVERIFY_3001
ErrorCode.PORT_IN_USE            // LLMVERIFY_4001
// ... and more

// Get error metadata
const metadata = getErrorMetadata(ErrorCode.CONTENT_TOO_LARGE);
console.log(metadata.suggestion); // Actionable fix
```

### Enhanced Error Classes

All errors now include error codes and metadata:

```typescript
import { verify, ValidationError } from 'llmverify';

try {
  await verify({ content: largeContent });
} catch (error) {
  console.log(error.code);              // LLMVERIFY_1003
  console.log(error.metadata.severity); // 'medium'
  console.log(error.metadata.suggestion); // 'Reduce content size...'
}
```

---

## Logging & Audit (v1.4.0)

### Logger

Structured logging with automatic PII sanitization.

```typescript
import { getLogger, LogLevel } from 'llmverify';

const logger = getLogger({
  level: LogLevel.INFO,
  sanitizePII: true
});

const requestId = logger.startRequest();
logger.info('Processing', { userId: '123' });
logger.warn('High latency detected', { latency: 500 });
logger.error('Operation failed', error);

const duration = logger.endRequest();
```

**Logs stored in:** `~/.llmverify/logs/*.jsonl`

### Audit Logger

Compliance-ready audit trails.

```typescript
import { getAuditLogger } from 'llmverify';

const auditLogger = getAuditLogger();

// Automatically logs all verifications
// Manual logging:
auditLogger.logVerification({
  requestId,
  content,
  riskLevel: 'low',
  findingsCount: 0,
  blocked: false,
  duration: 100,
  enginesUsed: ['hallucination'],
  configTier: 'free'
});
```

**Audit trail stored in:** `~/.llmverify/audit/*.jsonl`

---

## Baseline & Drift (v1.4.0)

### Baseline Storage

Automatic performance tracking and drift detection.

```typescript
import { getBaselineStorage } from 'llmverify';

const storage = getBaselineStorage();

// Get statistics
const stats = storage.getStatistics();
console.log(`Samples: ${stats.sampleCount}`);
console.log(`Drift records: ${stats.driftRecordCount}`);

// Check for drift
const drifts = storage.checkDrift({
  latency: 150,
  riskScore: 0.5
});

if (drifts.length > 0) {
  console.log('Drift detected!', drifts);
}

// Reset baseline
storage.resetBaseline();
```

**CLI Commands:**
```bash
npx llmverify baseline:stats  # Show statistics
npx llmverify baseline:reset  # Reset baseline
npx llmverify baseline:drift  # Show drift history
```

---

## Plugin System (v1.4.0)

### Create Custom Plugins

Extend llmverify with custom verification rules.

```typescript
import { use, createPlugin } from 'llmverify';

const customRule = createPlugin({
  id: 'my-custom-rule',
  name: 'Custom Verification Rule',
  version: '1.0.0',
  category: 'security',
  priority: 10,
  execute: async (context) => {
    const findings = [];
    
    // Your custom logic here
    if (context.content.includes('forbidden')) {
      findings.push({
        category: 'security',
        severity: 'high',
        message: 'Forbidden content detected'
      });
    }
    
    return {
      findings,
      score: findings.length > 0 ? 0.8 : 0
    };
  }
});

// Register plugin
use(customRule);

// Now all verify() calls will use your plugin
```

### Built-in Plugin Helpers

```typescript
import { createBlacklistPlugin, createRegexPlugin } from 'llmverify';

// Blacklist plugin
const blacklist = createBlacklistPlugin(['spam', 'scam']);
use(blacklist);

// Regex plugin
const regex = createRegexPlugin([
  { pattern: /\d{16}/, message: 'Credit card detected', severity: 'high' }
]);
use(regex);
```

---

## Security Utilities (v1.4.0)

### Rate Limiter

Token bucket rate limiting.

```typescript
import { RateLimiter } from 'llmverify';

const limiter = new RateLimiter(100, 60000); // 100 req/min

if (!limiter.isAllowed(userId)) {
  throw new Error('Rate limit exceeded');
}

const remaining = limiter.getRemaining(userId);
console.log(`Remaining: ${remaining}`);
```

### PII Sanitization

```typescript
import { sanitizeForLogging, sanitizeObject } from 'llmverify';

const safe = sanitizeForLogging('Email: test@example.com, Phone: 555-1234');
// "Email: [EMAIL], Phone: [PHONE]"

const safeObj = sanitizeObject({ password: 'secret', data: 'public' });
// { password: '[REDACTED]', data: 'public' }
```

### Safe Regex Execution

```typescript
import { safeRegexTest } from 'llmverify';

const pattern = /complex+pattern/;
const result = safeRegexTest(pattern, text, 100); // 100ms timeout
```

### Input Validation

```typescript
import { validateInput, validateArray, validateUrl } from 'llmverify';

const safe = validateInput(userInput, 10000); // Max 10k chars
const arr = validateArray(items, 1000); // Max 1000 items
const isValid = validateUrl('https://example.com');
```

---

## Verification Functions

### `devVerify(content: string, prompt?: string): Promise<CoreRunResult>`

Quick verification with development preset.

```typescript
import { devVerify } from 'llmverify';

const result = await devVerify('AI output');
```

### `prodVerify(content: string): Promise<CoreRunResult>`

Production-optimized verification.

```typescript
import { prodVerify } from 'llmverify';

const result = await prodVerify('AI output');
```

### `strictVerify(content: string, prompt?: string): Promise<CoreRunResult>`

Maximum scrutiny verification.

```typescript
import { strictVerify } from 'llmverify';

const result = await strictVerify('AI output', 'prompt');
```

---

## Security Functions

### `isInputSafe(input: string): boolean`

Quick check if user input is safe from prompt injection.

**Returns:** `boolean` - `true` if safe, `false` if potentially malicious

**Example:**

```typescript
import { isInputSafe } from 'llmverify';

if (!isInputSafe(userInput)) {
  throw new Error('Potential prompt injection detected');
}
```

---

### `checkPromptInjection(text: string): Finding[]`

Detailed prompt injection detection.

**Returns:** Array of findings with severity and patterns detected

**Example:**

```typescript
import { checkPromptInjection } from 'llmverify';

const findings = checkPromptInjection(userInput);
findings.forEach(finding => {
  console.log(`${finding.severity}: ${finding.message}`);
});
```

---

### `sanitizePromptInjection(text: string): SanitizeResult`

Remove or neutralize prompt injection patterns.

**Returns:**

```typescript
interface SanitizeResult {
  sanitized: string;      // Cleaned text
  removed: string[];      // Patterns removed
  wasModified: boolean;   // Whether text was changed
}
```

**Example:**

```typescript
import { sanitizePromptInjection } from 'llmverify';

const { sanitized, wasModified } = sanitizePromptInjection(userInput);
if (wasModified) {
  console.log('Input was sanitized');
}
```

---

### `getInjectionRiskScore(text: string): number`

Get numerical risk score for prompt injection (0-1).

**Returns:** `number` - Risk score from 0 (safe) to 1 (high risk)

**Example:**

```typescript
import { getInjectionRiskScore } from 'llmverify';

const risk = getInjectionRiskScore(userInput);
if (risk > 0.7) {
  console.log('High injection risk');
}
```

---

### `containsPII(text: string): boolean`

Check if text contains PII.

**Returns:** `boolean`

**Example:**

```typescript
import { containsPII } from 'llmverify';

if (containsPII(aiOutput)) {
  console.log('PII detected in output');
}
```

---

### `redactPII(text: string): RedactResult`

Redact all PII from text.

**Returns:**

```typescript
interface RedactResult {
  redacted: string;    // Text with PII replaced by [REDACTED]
  piiCount: number;    // Number of PII instances found
  patterns: string[];  // Types of PII detected
}
```

**Example:**

```typescript
import { redactPII } from 'llmverify';

const { redacted, piiCount } = redactPII(aiOutput);
console.log(`Redacted ${piiCount} PII instances`);
console.log(redacted); // "Contact [REDACTED] at [REDACTED]"
```

---

### `checkPII(text: string): Finding[]`

Detailed PII detection with locations and types.

**Returns:** Array of PII findings

**Example:**

```typescript
import { checkPII } from 'llmverify';

const findings = checkPII(text);
findings.forEach(finding => {
  console.log(`Found ${finding.category}: ${finding.message}`);
});
```

---

### `checkHarmfulContent(text: string): Finding[]`

Detect harmful content (violence, threats, hate speech).

**Returns:** Array of findings

**Example:**

```typescript
import { checkHarmfulContent } from 'llmverify';

const findings = checkHarmfulContent(text);
if (findings.length > 0) {
  console.log('Harmful content detected');
}
```

---

## Classification Functions

### `classify(prompt: string, output: string, policy?: ClassificationPolicy): ClassificationResult`

Classify AI output with intent detection and hallucination risk.

**Parameters:**

```typescript
interface ClassificationPolicy {
  instructionRules?: InstructionRule[];
  hallucination?: {
    enabled?: boolean;
    weights?: {
      speculative?: number;
      overconfident?: number;
      fabricated?: number;
    };
  };
  json?: {
    enabled?: boolean;
    maxRepairSteps?: number;
  };
}
```

**Returns:**

```typescript
interface ClassificationResult {
  intent: IntentTag;                    // Detected intent
  hallucinationRisk: number;            // 0-1 risk score
  hallucinationLabel: HallucinationLabel; // "low" | "medium" | "high"
  instructionFollowed: boolean;         // If rules provided
  instructionCompliance: number;        // 0-1 ratio
  isJson: boolean;                      // If valid JSON
  normalizedJson?: any;                 // Parsed JSON if valid
  tags: string[];                       // Classification tags
}
```

**Example:**

```typescript
import { classify } from 'llmverify';

const result = classify(
  'List 3 benefits of exercise',
  'Here are 3 benefits: 1. Health 2. Energy 3. Mood',
  {
    instructionRules: [
      { id: 'format', type: 'format', params: { expect: 'list' } },
      { id: 'count', type: 'length', params: { minBullets: 3 } }
    ]
  }
);

console.log(result.intent);              // "list"
console.log(result.instructionFollowed); // true
console.log(result.hallucinationLabel);  // "low"
```

---

### `detectIntent(prompt: string, output: string): IntentTag`

Detect output intent.

**Returns:** `IntentTag` - One of: `"summary"`, `"code"`, `"list"`, `"explanation"`, `"answer"`, `"question"`, `"instruction"`, `"unknown"`

---

### `calculateHallucinationRisk(prompt: string, output: string): number`

Calculate hallucination risk score.

**Returns:** `number` - Risk score from 0 to 1

---

## Monitoring Functions

### `monitorLLM(client: LlmClient, config?: MonitorConfig): MonitoredClient`

Wrap LLM client with health monitoring.

**Parameters:**

```typescript
interface MonitorConfig {
  engines?: {
    latency?: boolean;
    tokenRate?: boolean;
    fingerprint?: boolean;
    structure?: boolean;
  };
  thresholds?: {
    latencyWarnRatio?: number;
    latencyErrorRatio?: number;
  };
  hooks?: {
    onHealthCheck?: (report: HealthReport) => void;
    onDegraded?: (report: HealthReport) => void;
    onUnstable?: (report: HealthReport) => void;
    onRecovery?: (report: HealthReport) => void;
  };
}
```

**Example:**

```typescript
import { monitorLLM, createAdapter } from 'llmverify';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const llm = createAdapter({ provider: 'openai', client: openai });

const monitored = monitorLLM(llm, {
  hooks: {
    onUnstable: (report) => {
      console.error('LLM is unstable!', report);
    }
  }
});

const response = await monitored.generate({ prompt: 'Hello' });
console.log(response.llmverify.health); // 'stable' | 'degraded' | 'unstable'
```

---

### `createAdapter(config: AdapterConfig): LlmClient`

Create unified LLM client adapter.

**Parameters:**

```typescript
interface AdapterConfig {
  provider: ProviderId;  // 'openai' | 'anthropic' | 'groq' | 'google' | etc.
  client: any;           // Provider SDK client
  defaultModel?: string;
  providerName?: string; // For custom providers
}
```

**Supported Providers:**
- `openai` - OpenAI (GPT-4, GPT-3.5)
- `anthropic` - Anthropic (Claude)
- `groq` - Groq (Llama, Mixtral)
- `google` - Google AI (Gemini)
- `deepseek` - DeepSeek
- `mistral` - Mistral AI
- `cohere` - Cohere
- `local` - Local models
- `custom` - Custom providers

**Example:**

```typescript
import { createAdapter } from 'llmverify';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const llm = createAdapter({
  provider: 'openai',
  client: openai,
  defaultModel: 'gpt-4o-mini'
});

const response = await llm.generate({ prompt: 'Hello!' });
```

---

## Type Definitions

### Core Types

```typescript
// Risk levels
type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// Risk actions
type RiskAction = 'allow' | 'review' | 'block';

// Preset modes
type PresetMode = 'dev' | 'prod' | 'strict' | 'fast' | 'ci';

// Intent tags
type IntentTag = 
  | 'summary'
  | 'code'
  | 'list'
  | 'explanation'
  | 'answer'
  | 'question'
  | 'instruction'
  | 'unknown';

// Hallucination labels
type HallucinationLabel = 'low' | 'medium' | 'high';

// Health status
type HealthStatus = 'stable' | 'minor_variation' | 'degraded' | 'unstable';
```

### Finding Interface

```typescript
interface Finding {
  category: string;      // 'security' | 'privacy' | 'safety' | 'structure'
  severity: string;      // 'low' | 'medium' | 'high' | 'critical'
  message: string;       // Human-readable description
  pattern?: string;      // Pattern that triggered the finding
  location?: {           // Optional location info
    start: number;
    end: number;
  };
  metadata?: any;        // Additional context
}
```

---

## JSON Schema

### VerifyResult Schema

Complete JSON schema for `verify()` output:

```typescript
interface VerifyResult {
  // Risk assessment
  risk: {
    level: 'low' | 'moderate' | 'high' | 'critical';
    action: 'allow' | 'review' | 'block';
    score: number;              // 0-1
    confidence: number;         // 0-1
  };

  // Findings array
  findings: Finding[];

  // Engine results
  engines: {
    hallucination?: {
      enabled: boolean;
      score: number;
      signals: string[];
    };
    consistency?: {
      enabled: boolean;
      score: number;
    };
    csm6?: {
      enabled: boolean;
      findings: Finding[];
      categories: {
        security: number;
        privacy: number;
        safety: number;
      };
    };
    jsonValidator?: {
      enabled: boolean;
      valid: boolean;
      repaired: boolean;
    };
  };

  // Metadata
  metadata: {
    version: string;
    timestamp: string;
    latencyMs: number;
    contentLength: number;
  };

  // Limitations
  limitations: string[];

  // Recommendations
  recommendations: string[];
}
```

### Example JSON Output

```json
{
  "risk": {
    "level": "low",
    "action": "allow",
    "score": 0.15,
    "confidence": 0.85
  },
  "findings": [],
  "engines": {
    "hallucination": {
      "enabled": true,
      "score": 0.12,
      "signals": []
    },
    "csm6": {
      "enabled": true,
      "findings": [],
      "categories": {
        "security": 0,
        "privacy": 0,
        "safety": 0
      }
    }
  },
  "metadata": {
    "version": "1.3.0",
    "timestamp": "2024-12-04T12:00:00.000Z",
    "latencyMs": 15,
    "contentLength": 42
  },
  "limitations": [
    "Heuristic-based detection may have false positives/negatives",
    "Cannot verify factual accuracy without ground truth"
  ],
  "recommendations": [
    "Content appears safe for display"
  ]
}
```

---

## Error Handling

All async functions may throw errors:

```typescript
try {
  const result = await verify({ content: 'text' });
} catch (error) {
  if (error instanceof VerificationError) {
    console.error('Verification failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**Error Types:**
- `VerificationError` - Verification process failed
- `ConfigError` - Invalid configuration
- `AdapterError` - LLM adapter error
- `ValidationError` - Input validation failed

---

## Best Practices

### 1. Always Check Risk Level

```typescript
const result = await verify({ content: aiOutput });

if (result.risk.level === 'critical') {
  // Block immediately
  throw new Error('Content blocked for safety');
}

if (result.risk.level === 'high') {
  // Review before displaying
  await reviewContent(aiOutput);
}
```

### 2. Use Presets for Consistency

```typescript
// Development
const devResult = await devVerify(content);

// Production
const prodResult = await prodVerify(content);
```

### 3. Sanitize User Input

```typescript
const { sanitized } = sanitizePromptInjection(userInput);
const aiResponse = await callLLM(sanitized);
```

### 4. Redact PII Before Display

```typescript
const { redacted } = redactPII(aiOutput);
res.json({ message: redacted });
```

### 5. Monitor LLM Health

```typescript
const monitored = monitorLLM(llm, {
  hooks: {
    onUnstable: (report) => {
      // Switch to fallback provider
      switchToBackup();
    }
  }
});
```

---

## TypeScript Support

llmverify is written in TypeScript and includes full type definitions.

```typescript
import type {
  VerifyResult,
  VerifyOptions,
  Finding,
  RiskLevel,
  ClassificationResult
} from 'llmverify';
```

---

## Version Compatibility

This API reference is for llmverify v1.3.0+

- **Breaking changes:** None since v1.0.0
- **Deprecated:** None
- **Stable:** All documented APIs are stable

---

## Support

- **Documentation**: https://github.com/subodhkc/llmverify-npm#readme
- **Issues**: https://github.com/subodhkc/llmverify-npm/issues
- **API Questions**: Open a GitHub Discussion

---

**llmverify v1.3.0** - Complete API Reference
