# llmverify IDE Integration Guide

Run llmverify directly in your IDE (Windsurf, VS Code, Cursor, etc.) to verify AI outputs in real-time!

---

## [READY] **Quick Start**

### Step 1: Start the Server

```bash
npx llmverify-serve
```

Server will start on `http://localhost:9009`

### Step 2: Verify AI Outputs

Send POST requests to verify any AI-generated content:

```bash
# PowerShell (Windows)
Invoke-RestMethod -Uri "http://localhost:9009/verify" -Method POST -ContentType "application/json" -Body '{"content": "AI response to verify"}'

# Bash/Linux/Mac
curl -X POST http://localhost:9009/verify \
  -H "Content-Type: application/json" \
  -d '{"content": "AI response to verify"}'
```

---

## [TIP] **Use Cases in IDEs**

### 1. Verify AI Chat Responses
Monitor every AI response in your IDE chat:

```javascript
// In your IDE extension or script
async function verifyAIResponse(content) {
  const response = await fetch('http://localhost:9009/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  
  const result = await response.json();
  
  if (result.result.risk.level === 'high' || result.result.risk.level === 'critical') {
    console.warn('[WARN] High-risk AI response detected!');
    console.log('Risk Score:', result.result.risk.overall);
  }
  
  return result;
}
```

### 2. Real-Time Code Review
Verify AI-generated code before accepting:

```javascript
async function verifyGeneratedCode(code) {
  const result = await fetch('http://localhost:9009/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      content: code,
      config: { tier: 'free' }
    })
  });
  
  const data = await result.json();
  return {
    safe: data.result.risk.level === 'low',
    score: data.result.risk.overall,
    findings: data.result.findings
  };
}
```

### 3. Monitor AI Copilot
Track all AI suggestions in your IDE:

```javascript
// Hook into your IDE's AI copilot
copilot.on('suggestion', async (suggestion) => {
  const verification = await verifyAIResponse(suggestion.text);
  
  if (verification.result.risk.level !== 'low') {
    // Flag suspicious suggestions
    suggestion.addWarning('[WARN] Verification flagged this suggestion');
  }
});
```

---

## [TOOL] **IDE-Specific Integration**

### Windsurf

**1. Start Server:**
```bash
npx llmverify-serve
```

**2. Create Verification Script:**
```javascript
// .windsurf/verify-ai.js
const verifyAI = async (content) => {
  const res = await fetch('http://localhost:9009/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  return res.json();
};

// Use in Windsurf chat
module.exports = { verifyAI };
```

**3. Monitor Chat:**
```javascript
// Automatically verify all AI responses
windsurf.chat.onResponse(async (response) => {
  const result = await verifyAI(response.text);
  console.log('Risk Level:', result.result.risk.level);
});
```

### VS Code

**1. Install REST Client Extension**

**2. Create `verify.http`:**
```http
### Verify AI Output
POST http://localhost:9009/verify
Content-Type: application/json

{
  "content": "AI response to verify"
}
```

**3. Click "Send Request"** to verify any content

### Cursor

**1. Start Server:**
```bash
npx llmverify-serve
```

**2. Use in Terminal:**
```bash
# Verify Cursor AI responses
curl -X POST http://localhost:9009/verify \
  -H "Content-Type: application/json" \
  -d '{"content": "Cursor AI response"}'
```

**3. Create Keyboard Shortcut:**
Add to `keybindings.json`:
```json
{
  "key": "ctrl+shift+v",
  "command": "workbench.action.terminal.sendSequence",
  "args": {
    "text": "curl -X POST http://localhost:9009/verify -H 'Content-Type: application/json' -d '{\"content\": \"${selectedText}\"}'\n"
  }
}
```

---

## [CHART] **API Endpoints**

### 1. Verify Content
```http
POST http://localhost:9009/verify
Content-Type: application/json

{
  "content": "AI output to verify",
  "config": {
    "tier": "free"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "risk": {
      "level": "low",
      "overall": 0.15
    },
    "findings": [],
    "meta": {
      "latency_ms": 45,
      "version": "1.0.0"
    }
  }
}
```

### 2. Check Input Safety
```http
POST http://localhost:9009/check-input
Content-Type: application/json

{
  "content": "User input to check"
}
```

### 3. Detect PII
```http
POST http://localhost:9009/check-pii
Content-Type: application/json

{
  "content": "Text with potential PII"
}
```

### 4. Health Check
```http
GET http://localhost:9009/health
```

---

## [TARGET] **Real-World Example**

### Monitor All AI Responses in Windsurf

**1. Start llmverify server:**
```bash
npx llmverify-serve
```

**2. Create monitoring script:**
```javascript
// monitor-ai.js
const fetch = require('node-fetch');

async function monitorAI(content) {
  try {
    const response = await fetch('http://localhost:9009/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    const data = await response.json();
    const risk = data.result.risk;
    
    // Log risk level
    console.log(`\n[SCAN] AI Verification:`);
    console.log(`   Risk Level: ${risk.level}`);
    console.log(`   Risk Score: ${(risk.overall * 100).toFixed(1)}%`);
    
    // Alert on high risk
    if (risk.level === 'high' || risk.level === 'critical') {
      console.warn(`\n[WARN]  WARNING: High-risk AI response detected!`);
      console.warn(`   Review before using this content.`);
    }
    
    return data;
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

// Export for use
module.exports = { monitorAI };
```

**3. Use in your IDE:**
```javascript
const { monitorAI } = require('./monitor-ai');

// Verify any AI response
const aiResponse = "AI generated code or text...";
await monitorAI(aiResponse);
```

---

## [SYNC] **Continuous Monitoring**

### Auto-Verify All AI Outputs

```javascript
// auto-verify.js
const { monitorAI } = require('./monitor-ai');

// Intercept AI responses
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Clone response to read body
  const clone = response.clone();
  const data = await clone.json();
  
  // If it's an AI response, verify it
  if (data.choices && data.choices[0]?.message?.content) {
    const content = data.choices[0].message.content;
    await monitorAI(content);
  }
  
  return response;
};
```

---

## [GRAPH] **Performance Tracking**

### Track Baseline Performance

```bash
# View baseline statistics
npx llmverify baseline:stats

# Check for drift
npx llmverify baseline:drift
```

**Output:**
```
[CHART] Baseline Statistics

Samples: 150
Average Latency: 45ms
Average Risk Score: 0.18
Risk Distribution:
  Low: 85%
  Moderate: 12%
  High: 3%
```

---

## [SHIELD] **Security Best Practices**

### 1. Local-Only Server
The server runs locally and never sends data externally:
```javascript
// All verification happens locally
const result = await fetch('http://localhost:9009/verify', {
  method: 'POST',
  body: JSON.stringify({ content })
});
```

### 2. Rate Limiting
Built-in rate limiting prevents abuse:
```javascript
// Automatic rate limiting
// 100 requests per minute by default
```

### 3. PII Protection
Automatic PII sanitization in logs:
```javascript
// Emails, phones, SSNs automatically redacted
// Logs stored in ~/.llmverify/logs/
```

---

## [STYLE] **Custom Integration**

### Create Your Own IDE Extension

```javascript
// my-llmverify-extension.js
class LLMVerifyExtension {
  constructor() {
    this.serverUrl = 'http://localhost:9009';
  }
  
  async verify(content) {
    const response = await fetch(`${this.serverUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    return response.json();
  }
  
  async checkInput(content) {
    const response = await fetch(`${this.serverUrl}/check-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    return response.json();
  }
  
  async detectPII(content) {
    const response = await fetch(`${this.serverUrl}/check-pii`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    return response.json();
  }
}

module.exports = LLMVerifyExtension;
```

---

## 🚨 **Troubleshooting**

### Server Not Starting
```bash
# Check if port is in use
netstat -ano | findstr :9009

# Use different port
npx llmverify-serve --port=8080
```

### Connection Refused
```bash
# Verify server is running
curl http://localhost:9009/health

# Check firewall settings
# Allow localhost connections
```

### Slow Verification
```bash
# Check baseline stats
npx llmverify baseline:stats

# Reset baseline if needed
npx llmverify baseline:reset
```

---

## 📚 **Additional Resources**

- [Server Mode Documentation](SERVER-MODE.md)
- [API Reference](API-REFERENCE.md)
- [Badge Guide](BADGE-GUIDE.md)
- [GitHub Repository](https://github.com/subodhkc/llmverify-npm)

---

## [TIP] **Pro Tips**

1. **Keep Server Running:** Start server once and use throughout your session
2. **Monitor Baseline:** Check `baseline:stats` regularly for performance insights
3. **Use Plugins:** Create custom verification rules with the plugin system
4. **Automate:** Set up pre-commit hooks to verify AI-generated code

---

**Start verifying AI outputs in your IDE today!** [READY]

```bash
npx llmverify-serve
```

Then send POST requests to `http://localhost:9009/verify` from anywhere in your IDE!
