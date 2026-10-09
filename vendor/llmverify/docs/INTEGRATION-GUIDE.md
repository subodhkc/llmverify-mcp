# Integration Guide

## Overview

This guide provides comprehensive integration patterns for llmverify across different deployment scenarios. The package is designed for production environments where AI output verification is critical for security, compliance, and reliability.

## Table of Contents

1. [Server Mode Integration](#server-mode-integration)
2. [AI Agent Integration](#ai-agent-integration)
3. [IDE Integration](#ide-integration)
4. [Algorithm Details](#algorithm-details)
5. [Badge System](#badge-system)
6. [Developer Patterns](#developer-patterns)

---

## Server Mode Integration

### Starting the Server

The llmverify server provides an HTTP API for verification services. This is the recommended approach for IDE extensions, CI/CD pipelines, and distributed systems.

#### Installation

```bash
npm install llmverify
```

#### Starting the Server

```bash
# Method 1: Using npm script
npm run serve

# Method 2: Direct execution
node node_modules/llmverify/start-server.js

# Method 3: Using npx (may buffer output)
npx llmverify-serve

# Method 4: Custom port
node node_modules/llmverify/start-server.js --port=8080
```

#### Server Configuration

The server runs on port 9009 by default. Configuration can be provided via:

1. Environment variables
2. Configuration file (`llmverify.config.json`)
3. Command-line arguments

```javascript
// llmverify.config.json
{
  "tier": "free",
  "privacy": {
    "allowNetworkRequests": false,
    "telemetryEnabled": false
  },
  "engines": {
    "hallucination": { "enabled": true },
    "consistency": { "enabled": true },
    "csm6": {
      "enabled": true,
      "profile": "baseline"
    }
  },
  "performance": {
    "timeout": 30000,
    "maxContentLength": 10000
  }
}
```

### API Endpoints

#### Health Check

```http
GET /health
```

Response:
```json
{
  "ok": true,
  "version": "1.0.0",
  "service": "llmverify",
  "timestamp": "2024-12-04T15:49:18.085Z"
}
```

#### Verify AI Output

```http
POST /verify
Content-Type: application/json

{
  "content": "AI response to verify",
  "prompt": "Optional: original prompt",
  "config": {}
}
```

Response:
```json
{
  "success": true,
  "summary": {
    "verdict": "[PASS] SAFE TO USE",
    "riskLevel": "LOW",
    "riskScore": "6.3%",
    "explanation": "Content passed all safety checks",
    "testsRun": ["hallucination", "consistency", "csm6"],
    "findings": [],
    "nextSteps": ["Content approved for use"]
  },
  "result": {
    "verification": {
      "hallucination": { "riskScore": 0.18 },
      "consistency": { "stable": true },
      "csm6": { "passed": true }
    },
    "risk": {
      "overall": 0.063,
      "level": "low",
      "action": "allow"
    }
  }
}
```

#### Check Input Safety

```http
POST /check-input
Content-Type: application/json

{
  "text": "User input to validate"
}
```

#### Detect PII

```http
POST /check-pii
Content-Type: application/json

{
  "text": "Text containing potential PII"
}
```

#### Classify Output

```http
POST /classify
Content-Type: application/json

{
  "prompt": "Original prompt",
  "output": "AI response"
}
```

### Production Deployment

#### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 9009
CMD ["node", "start-server.js"]
```

```bash
docker build -t llmverify-server .
docker run -p 9009:9009 llmverify-server
```

#### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llmverify
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llmverify
  template:
    metadata:
      labels:
        app: llmverify
    spec:
      containers:
      - name: llmverify
        image: llmverify-server:latest
        ports:
        - containerPort: 9009
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: llmverify
spec:
  selector:
    app: llmverify
  ports:
  - port: 9009
    targetPort: 9009
```

---

## AI Agent Integration

### OpenAI Integration

```typescript
import OpenAI from 'openai';
import { verify, isInputSafe, redactPII } from 'llmverify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function safeCompletion(prompt: string) {
  // Validate input
  if (!isInputSafe(prompt)) {
    throw new Error('Input validation failed');
  }

  // Get AI response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  });

  const content = completion.choices[0].message.content;

  // Verify output
  const verification = await verify({ content, prompt });

  if (verification.risk.level === 'critical') {
    throw new Error('Output blocked for safety');
  }

  // Redact PII
  const { redacted } = redactPII(content);

  return {
    content: redacted,
    verification: verification.risk,
    usage: completion.usage
  };
}
```

### Anthropic Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { verify, isInputSafe } from 'llmverify';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function safeClaudeCompletion(prompt: string) {
  if (!isInputSafe(prompt)) {
    throw new Error('Input validation failed');
  }

  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = message.content[0].text;
  const verification = await verify({ content, prompt });

  return {
    content,
    verification: verification.risk,
    blocked: verification.risk.level === 'critical'
  };
}
```

### Express Middleware

```typescript
import express from 'express';
import { verify, isInputSafe, redactPII } from 'llmverify';

const app = express();
app.use(express.json());

// Input validation middleware
app.use('/api/ai/*', (req, res, next) => {
  if (req.body.message && !isInputSafe(req.body.message)) {
    return res.status(400).json({
      error: 'Input validation failed',
      code: 'INVALID_INPUT'
    });
  }
  next();
});

// Output verification middleware
async function verifyOutput(content: string) {
  const result = await verify({ content });
  
  if (result.risk.level === 'critical') {
    return {
      blocked: true,
      reason: 'Safety check failed',
      risk: result.risk
    };
  }

  const { redacted } = redactPII(content);
  return {
    blocked: false,
    content: redacted,
    risk: result.risk
  };
}

app.post('/api/ai/chat', async (req, res) => {
  const aiResponse = await getAIResponse(req.body.message);
  const verified = await verifyOutput(aiResponse);

  if (verified.blocked) {
    return res.status(403).json({
      error: 'Response blocked',
      reason: verified.reason
    });
  }

  res.json({
    response: verified.content,
    risk: verified.risk
  });
});
```

---

## IDE Integration

### Windsurf IDE Extension

```javascript
const { createIDEExtension } = require('llmverify');

class WindsurfVerifier {
  constructor(serverUrl = 'http://localhost:9009') {
    this.verifier = createIDEExtension(serverUrl);
  }

  async initialize() {
    const available = await this.verifier.isServerAvailable();
    if (!available) {
      throw new Error('llmverify server not running');
    }
    return true;
  }

  async verifyAIResponse(content) {
    const result = await this.verifier.verify(content);
    return {
      safe: result.safe,
      verdict: result.verdict,
      riskScore: result.riskScore,
      inline: this.verifier.formatInline(result)
    };
  }

  formatForDisplay(result) {
    return this.verifier.formatInline(result);
  }
}

module.exports = WindsurfVerifier;
```

### VS Code Extension

```typescript
import * as vscode from 'vscode';
import { createIDEExtension } from 'llmverify';

export function activate(context: vscode.ExtensionContext) {
  const verifier = createIDEExtension('http://localhost:9009');

  const disposable = vscode.commands.registerCommand(
    'llmverify.verify',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      const result = await verifier.verify(text);

      vscode.window.showInformationMessage(
        verifier.formatInline(result)
      );
    }
  );

  context.subscriptions.push(disposable);
}
```

---

## Algorithm Details

### Hallucination Detection

The hallucination detection engine uses heuristic-based pattern analysis to identify potential fabricated or unreliable content.

**Detection Methods:**

1. **Claim Extraction**: Identifies factual claims in text
2. **Specificity Analysis**: Measures vagueness and lack of detail
3. **Citation Detection**: Flags missing sources for verifiable claims
4. **Confidence Scoring**: Assigns risk scores based on linguistic patterns

**Limitations:**

- Pattern-based detection only (no external fact-checking)
- Cannot verify factual accuracy without ground truth
- English language only
- Context-dependent false positives possible

**Risk Indicators:**

- `lackOfSpecificity`: 0-1 score for vague language
- `missingCitation`: Boolean for claims without sources
- `vagueLanguage`: Boolean for imprecise statements
- `contradictionSignal`: Boolean for internal conflicts

### Consistency Analysis

Analyzes text sections for internal logical consistency.

**Detection Methods:**

1. **Section Segmentation**: Splits text into logical sections
2. **Similarity Metrics**: Compares sections for semantic drift
3. **Contradiction Detection**: Identifies conflicting statements
4. **Tone Analysis**: Detects style and sentiment shifts

**Metrics:**

- `avgSimilarity`: 0-1 score for section coherence
- `stable`: Boolean indicating consistent content
- `drift`: Boolean for semantic drift
- `contradictions`: Array of detected conflicts

### CSM6 Security Framework

Implements OWASP LLM Top 10 aligned security checks.

**Security Checks:**

1. **Prompt Injection Detection**: Pattern-based attack detection
2. **PII Detection**: Regex-based sensitive data identification
3. **Harmful Content**: Pattern matching for dangerous content
4. **Audit Trail**: Logging for compliance requirements

**Compliance Standards:**

- NIST AI RMF
- OWASP LLM Top 10
- ISO 42001
- EU AI Act (High-risk AI systems)

---

## Badge System

### Verification Badge

Display verification status in your application:

```html
<img src="https://img.shields.io/badge/llmverify-verified-green" alt="Verified by llmverify">
```

### Risk Level Badges

```html
<!-- Low Risk -->
<img src="https://img.shields.io/badge/risk-low-green" alt="Low Risk">

<!-- Moderate Risk -->
<img src="https://img.shields.io/badge/risk-moderate-yellow" alt="Moderate Risk">

<!-- High Risk -->
<img src="https://img.shields.io/badge/risk-high-orange" alt="High Risk">

<!-- Critical Risk -->
<img src="https://img.shields.io/badge/risk-critical-red" alt="Critical Risk">
```

### Dynamic Badge Generation

```javascript
function generateBadge(verification) {
  const level = verification.risk.level;
  const color = {
    low: 'green',
    moderate: 'yellow',
    high: 'orange',
    critical: 'red'
  }[level];

  return `https://img.shields.io/badge/llmverify-${level}-${color}`;
}
```

---

## Developer Patterns

### Pattern 1: Async Verification Queue

For high-throughput applications, use background verification:

```typescript
import Queue from 'bull';
import { verify } from 'llmverify';

const verificationQueue = new Queue('llmverify');

verificationQueue.process(async (job) => {
  const { content, id } = job.data;
  const result = await verify({ content });
  
  await db.saveVerification(id, result);
  
  if (result.risk.level === 'critical') {
    await notifyTeam(id, result);
  }
});

// In your API
app.post('/api/ai/chat', async (req, res) => {
  const response = await getAIResponse(req.body.message);
  const id = await db.saveResponse(response);
  
  // Queue verification (non-blocking)
  verificationQueue.add({ content: response, id });
  
  res.json({ response, id });
});
```

### Pattern 2: Confidence Thresholds

Adjust thresholds based on context:

```typescript
const THRESHOLDS = {
  'public-facing': 0.2,   // Very strict
  'customer-service': 0.3, // Strict
  'internal-tool': 0.6,    // Relaxed
  'development': 0.8       // Very relaxed
};

async function verifyWithContext(content: string, context: string) {
  const result = await verify({ content });
  const threshold = THRESHOLDS[context] || 0.5;
  
  return {
    ...result,
    blocked: result.risk.overall > threshold,
    threshold
  };
}
```

### Pattern 3: Monitoring and Metrics

Track verification metrics:

```typescript
import { Counter, Histogram } from 'prom-client';

const verificationCounter = new Counter({
  name: 'llmverify_total',
  help: 'Total verifications',
  labelNames: ['risk_level']
});

const verificationDuration = new Histogram({
  name: 'llmverify_duration_ms',
  help: 'Verification duration'
});

async function verifyWithMetrics(content: string) {
  const start = Date.now();
  const result = await verify({ content });
  const duration = Date.now() - start;
  
  verificationCounter.inc({ risk_level: result.risk.level });
  verificationDuration.observe(duration);
  
  return result;
}
```

---

## Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/subodhkc/llmverify-npm/issues
- Documentation: https://github.com/subodhkc/llmverify-npm/docs
- NPM Package: https://www.npmjs.com/package/llmverify
