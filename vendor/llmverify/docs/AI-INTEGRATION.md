# AI Integration Guide

> How to integrate llmverify into your AI applications, IDEs, and automated pipelines.

---

## Quick Import Reference

### For AI Agents / Copilots

```typescript
// Essential imports for AI verification
import { 
  run,           // Master function - run all engines
  devVerify,     // Quick dev preset
  prodVerify,    // Quick production preset
  isInputSafe,   // Check user input
  redactPII      // Remove sensitive data
} from 'llmverify';

// Verify AI output before returning to user
const result = await run({
  content: aiResponse,
  prompt: originalPrompt,
  preset: 'prod'
});

if (result.verification.risk.level === 'critical') {
  return 'I cannot provide that response.';
}
```

### For IDE Extensions / Plugins

```typescript
// Lightweight imports for IDE integration
import { isInputSafe, getInjectionRiskScore, containsPII } from 'llmverify';

// Quick safety check (< 5ms)
const safe = isInputSafe(userInput);
const riskScore = getInjectionRiskScore(userInput);
const hasPII = containsPII(content);
```

### For CI/CD Pipelines

```bash
# CLI usage in pipelines
npx llmverify run "AI output" --preset ci --output json

# Exit codes:
# 0 = Low risk (allow)
# 1 = Moderate risk (review)  
# 2 = High/Critical risk (block)
```

---

## Import Patterns by Use Case

### 1. AI Chatbot / Assistant

```typescript
import { 
  run, 
  isInputSafe, 
  redactPII,
  PresetMode 
} from 'llmverify';

async function processAIResponse(
  userMessage: string,
  aiResponse: string
): Promise<string> {
  // 1. Validate user input
  if (!isInputSafe(userMessage)) {
    return 'Invalid request detected.';
  }

  // 2. Verify AI response
  const result = await run({
    content: aiResponse,
    prompt: userMessage,
    userInput: userMessage,
    preset: 'prod'
  });

  // 3. Handle based on risk
  if (result.verification.risk.level === 'critical') {
    return 'I cannot provide that information.';
  }

  // 4. Redact PII before returning
  if (result.piiCheck?.hasPII) {
    return redactPII(aiResponse).redacted;
  }

  return aiResponse;
}
```

### 2. AI Code Assistant / Copilot

```typescript
import { 
  verify,
  checkPromptInjection,
  checkPII 
} from 'llmverify';

async function verifyCodeSuggestion(
  code: string,
  context: string
): Promise<{ safe: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Check for embedded secrets/PII in code
  const piiFindings = checkPII(code);
  if (piiFindings.length > 0) {
    issues.push('Code contains sensitive data');
  }

  // Check for injection patterns
  const injectionFindings = checkPromptInjection(code);
  if (injectionFindings.length > 0) {
    issues.push('Code contains suspicious patterns');
  }

  // Full verification
  const result = await verify({ content: code });

  return {
    safe: result.risk.level === 'low' && issues.length === 0,
    issues
  };
}
```

### 3. AI Content Generator

```typescript
import { 
  run,
  strictVerify,
  redactPII,
  CoreRunResult 
} from 'llmverify';

async function generateSafeContent(
  prompt: string,
  generateFn: (p: string) => Promise<string>
): Promise<{ content: string; verified: boolean }> {
  // Generate content
  const generated = await generateFn(prompt);

  // Strict verification for published content
  const result = await strictVerify(generated, prompt);

  // Block high-risk content
  if (['high', 'critical'].includes(result.verification.risk.level)) {
    return { content: '', verified: false };
  }

  // Always redact PII in published content
  const { redacted } = redactPII(generated);

  return { content: redacted, verified: true };
}
```

### 4. AI API Gateway

```typescript
import { 
  run,
  isInputSafe,
  getInjectionRiskScore 
} from 'llmverify';

// Express middleware
export function aiGatewayMiddleware() {
  return async (req: any, res: any, next: any) => {
    const { prompt, userInput } = req.body;

    // Quick input validation
    if (!isInputSafe(userInput || prompt)) {
      return res.status(400).json({ 
        error: 'Invalid input detected' 
      });
    }

    // Attach verifier to request
    req.verifyAIResponse = async (response: string) => {
      return run({
        content: response,
        prompt,
        userInput,
        preset: 'prod'
      });
    };

    next();
  };
}
```

### 5. AI Monitoring Dashboard

```typescript
import { 
  run,
  PRESETS,
  PresetMode,
  CoreRunResult 
} from 'llmverify';

interface AIMetrics {
  totalRequests: number;
  riskDistribution: Record<string, number>;
  avgLatencyMs: number;
  blockedCount: number;
}

class AIMonitor {
  private metrics: AIMetrics = {
    totalRequests: 0,
    riskDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
    avgLatencyMs: 0,
    blockedCount: 0
  };

  async verify(content: string, prompt?: string): Promise<CoreRunResult> {
    const start = Date.now();
    const result = await run({ content, prompt, preset: 'ci' });
    
    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.riskDistribution[result.verification.risk.level]++;
    this.metrics.avgLatencyMs = 
      (this.metrics.avgLatencyMs + (Date.now() - start)) / 2;
    
    if (result.verification.risk.action === 'block') {
      this.metrics.blockedCount++;
    }

    return result;
  }

  getMetrics(): AIMetrics {
    return { ...this.metrics };
  }
}
```

---

## IDE-Specific Setup

### VS Code

1. **Install the package:**
   ```bash
   npm install llmverify
   ```

2. **Add to your extension:**
   ```typescript
   import { isInputSafe, verify } from 'llmverify';
   
   // In your extension activation
   export function activate(context: vscode.ExtensionContext) {
     const verifyCommand = vscode.commands.registerCommand(
       'llmverify.check',
       async () => {
         const editor = vscode.window.activeTextEditor;
         if (editor) {
           const text = editor.document.getText(editor.selection);
           const result = await verify({ content: text });
           vscode.window.showInformationMessage(
             `Risk: ${result.risk.level}`
           );
         }
       }
     );
     context.subscriptions.push(verifyCommand);
   }
   ```

### JetBrains IDEs (IntelliJ, WebStorm)

```typescript
// In your plugin code
import { run, isInputSafe } from 'llmverify';

async function verifySelection(text: string) {
  const result = await run({ content: text, preset: 'dev' });
  return {
    risk: result.verification.risk.level,
    action: result.verification.risk.action,
    findings: result.verification.csm6?.findings || []
  };
}
```

### Cursor / Windsurf / AI IDEs

```typescript
// For AI-powered IDEs, use the fast preset
import { run, fastVerify } from 'llmverify';

// Verify AI suggestions in real-time
async function verifySuggestion(suggestion: string) {
  // Use fast preset for < 10ms verification
  const result = await fastVerify(suggestion);
  return result.verification.risk.level === 'low';
}
```

---

## AI Agent Integration

### LangChain Integration

```typescript
import { run, isInputSafe } from 'llmverify';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';

// Create a verified LangChain chain
async function verifiedChain(input: string) {
  // Pre-check input
  if (!isInputSafe(input)) {
    throw new Error('Unsafe input detected');
  }

  const model = new ChatOpenAI();
  const response = await model.invoke([new HumanMessage(input)]);
  
  // Verify output
  const verification = await run({
    content: response.content as string,
    prompt: input,
    preset: 'prod'
  });

  if (verification.verification.risk.level === 'critical') {
    throw new Error('Unsafe response blocked');
  }

  return response.content;
}
```

### AutoGPT / Agent Frameworks

```typescript
import { run, isInputSafe, strictVerify } from 'llmverify';

class VerifiedAgent {
  async executeTask(task: string): Promise<string> {
    // Verify task description
    if (!isInputSafe(task)) {
      return 'Task rejected: potentially unsafe';
    }

    // Execute task (your agent logic)
    const result = await this.runAgentLogic(task);

    // Strict verification for agent outputs
    const verification = await strictVerify(result, task);

    if (verification.verification.risk.action === 'block') {
      return 'Result blocked due to safety concerns';
    }

    return result;
  }

  private async runAgentLogic(task: string): Promise<string> {
    // Your agent implementation
    return `Completed: ${task}`;
  }
}
```

### CrewAI Integration

```typescript
import { run, redactPII } from 'llmverify';

// Verify crew outputs before final delivery
async function verifyCrewOutput(
  output: string,
  taskDescription: string
): Promise<{ safe: boolean; output: string }> {
  const result = await run({
    content: output,
    prompt: taskDescription,
    preset: 'strict'
  });

  // Always redact PII from crew outputs
  const { redacted } = redactPII(output);

  return {
    safe: result.verification.risk.level !== 'critical',
    output: redacted
  };
}
```

---

## Performance Tips

### For Real-time AI Applications

```typescript
// Use fast preset for < 10ms verification
import { fastVerify } from 'llmverify';

const result = await fastVerify(content);
```

### For Streaming Responses

```typescript
import { run } from 'llmverify';

// Verify chunks periodically, not every chunk
let accumulated = '';
let lastCheck = 0;

for await (const chunk of stream) {
  accumulated += chunk;
  
  // Check every 500 characters
  if (accumulated.length - lastCheck > 500) {
    const result = await run({ content: accumulated, preset: 'fast' });
    if (result.verification.risk.level === 'critical') {
      break; // Stop streaming
    }
    lastCheck = accumulated.length;
  }
}
```

### For High-throughput Pipelines

```typescript
import { run } from 'llmverify';

// Process in parallel batches
async function verifyBatch(contents: string[]) {
  return Promise.all(
    contents.map(content => run({ content, preset: 'ci' }))
  );
}
```

---

## Preset Selection Guide

| Preset | Latency | Use Case |
|--------|---------|----------|
| `fast` | < 10ms | Real-time streaming, autocomplete |
| `prod` | < 20ms | Production APIs, chatbots |
| `ci` | < 15ms | CI/CD pipelines, batch processing |
| `dev` | < 50ms | Development, debugging |
| `strict` | < 100ms | High-stakes content, compliance |

---

## Error Handling

```typescript
import { run, ValidationError } from 'llmverify';

try {
  const result = await run({ content: aiOutput, preset: 'prod' });
  // Handle result
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else {
    console.error('Verification failed:', error);
  }
}
```

---

## TypeScript Types

```typescript
import type {
  CoreRunResult,
  PresetMode,
  VerifyResult,
  Finding,
  RiskLevel
} from 'llmverify';

// Use types for better IDE support
function handleResult(result: CoreRunResult) {
  const risk: RiskLevel = result.verification.risk.level;
  // TypeScript knows all the properties
}
```

---

## Next Steps

- See [CLI-REFERENCE.md](CLI-REFERENCE.md) for command-line usage
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Check `/examples` directory for more patterns
