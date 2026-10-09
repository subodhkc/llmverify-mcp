# Auto-Verify AI Responses in Your IDE

**No manual pasting required!** Automatically verify every AI response with inline scores.

---

## Quick Start

### Step 1: Start the Server

```bash
npx llmverify-serve
```

Keep this running in a terminal.

### Step 2: Import in Your IDE

```javascript
const { createIDEExtension } = require('llmverify');

const verifier = createIDEExtension();

// Verify any AI response
const result = await verifier.verify("AI response here");

console.log(result.verdict);    // [PASS] SAFE TO USE
console.log(result.riskScore);  // 5.8
console.log(result.safe);       // true
```

---

## IDE Integration Methods

### Method 1: JavaScript/TypeScript Extension

```typescript
import { createIDEExtension, VerificationResult } from 'llmverify';

const verifier = createIDEExtension('http://localhost:9009');

// Intercept AI responses
async function onAIResponse(content: string) {
  const result = await verifier.verify(content);
  
  // Show inline score
  console.log(verifier.formatInline(result));
  // Output: [llmverify] [PASS] SAFE TO USE (Risk: 5.8%)
  
  // Show detailed results if needed
  if (!result.safe) {
    console.log(verifier.formatDetailed(result));
  }
  
  return result;
}
```

### Method 2: HTTP API Integration

```javascript
// Call from any language
async function verifyAI(content) {
  const response = await fetch('http://localhost:9009/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  
  const data = await response.json();
  return data.result.risk;
}
```

### Method 3: Windsurf Extension

```javascript
// examples/windsurf-extension.js
const { createIDEExtension } = require('llmverify');

const verifier = createIDEExtension();

// Auto-verify all AI responses
async function interceptAIResponse(aiResponse) {
  const result = await verifier.verify(aiResponse);
  
  // Show score under AI response
  console.log(`\n${verifier.formatInline(result)}\n`);
  
  return {
    content: aiResponse,
    verification: result,
    safe: result.safe
  };
}
```

---

## API Reference

### createIDEExtension(serverUrl?)

Creates an IDE extension instance.

```typescript
const verifier = createIDEExtension('http://localhost:9009');
```

### verify(content: string)

Verifies AI content and returns result.

```typescript
const result = await verifier.verify("AI response");

// Result structure:
{
  verdict: "[PASS] SAFE TO USE",
  riskLevel: "LOW",
  riskScore: 5.8,
  explanation: "This AI response passed all safety checks.",
  safe: true
}
```

### formatInline(result)

Formats result for inline display.

```typescript
const inline = verifier.formatInline(result);
// "[llmverify] [PASS] SAFE TO USE (Risk: 5.8%)"
```

### formatDetailed(result)

Formats result for detailed display.

```typescript
const detailed = verifier.formatDetailed(result);
// Multi-line formatted output
```

### isServerAvailable()

Checks if server is running.

```typescript
const available = await verifier.isServerAvailable();
if (!available) {
  console.log('Start server: npx llmverify-serve');
}
```

---

## Real-World Example

### Auto-Verify Windsurf AI Chat

```javascript
const { createIDEExtension } = require('llmverify');

const verifier = createIDEExtension();

// Hook into AI chat (pseudo-code)
windsurf.ai.onResponse(async (response) => {
  // Verify automatically
  const result = await verifier.verify(response.text);
  
  // Show score under response
  const score = verifier.formatInline(result);
  windsurf.ui.showInline(score, {
    color: result.safe ? 'green' : 'red'
  });
  
  // Block high-risk responses
  if (!result.safe && result.riskScore > 50) {
    windsurf.ui.showWarning(
      'High-risk AI response detected. Review before using.'
    );
  }
});
```

---

## Risk Levels

| Level | Score | Verdict | Action |
|-------|-------|---------|--------|
| LOW | 0-25% | [PASS] SAFE TO USE | Use confidently |
| MODERATE | 26-50% | [WARN] REVIEW RECOMMENDED | Review before using |
| HIGH | 51-75% | [FAIL] HIGH RISK | Do not use without fixes |
| CRITICAL | 76-100% | [BLOCK] CRITICAL RISK | Block immediately |

---

## Tests Performed

Every AI response is checked for:

1. **Hallucination Detection** - False or fabricated claims
2. **Consistency Analysis** - Logical contradictions
3. **Security Scan** - Injection attacks, malicious code
4. **Privacy Check** - PII leaks (emails, phones, SSNs)
5. **Safety Review** - Harmful or dangerous content

---

## Performance

- **Average latency:** 2-10ms
- **Throughput:** 100+ requests/second
- **Memory:** <50MB
- **CPU:** Minimal impact

---

## Troubleshooting

### Server Not Running

```bash
# Start the server
npx llmverify-serve

# Check health
curl http://localhost:9009/health
```

### Connection Failed

```javascript
// Check if server is available
const available = await verifier.isServerAvailable();
if (!available) {
  console.error('Server not running. Start with: npx llmverify-serve');
}
```

### Slow Responses

```bash
# Check baseline stats
npx llmverify baseline:stats

# Reset if needed
npx llmverify baseline:reset
```

---

## Examples

See `examples/windsurf-extension.js` for a complete working example.

```bash
# Run the example
node examples/windsurf-extension.js
```

---

## Next Steps

1. Start server: `npx llmverify-serve`
2. Import extension: `const verifier = createIDEExtension()`
3. Verify responses: `await verifier.verify(content)`
4. Show scores inline in your IDE

---

**Documentation:**
- [Quick Start Guide](QUICK-START-IDE.md)
- [API Reference](API-REFERENCE.md)
- [GitHub](https://github.com/subodhkc/llmverify-npm)

**No emojis, no manual pasting, just automatic verification!**
