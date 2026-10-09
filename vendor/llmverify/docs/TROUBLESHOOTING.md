# Troubleshooting Guide

Common errors, their causes, and solutions for llmverify.

---

## Quick Diagnostics

Run these commands first to identify issues:

```bash
# Check system health
npx llmverify doctor

# Verify installation
npx llmverify --version

# Test basic functionality
npx llmverify verify "Hello world"
```

---

## Installation Errors

### Error: `npm ERR! code ERESOLVE`

**What you see:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! peer dep missing: typescript@^5.0.0
```

**Cause:** Conflicting peer dependencies or outdated npm.

**Fix:**
```bash
# Option 1: Force install (safe for llmverify)
npm install llmverify --legacy-peer-deps

# Option 2: Update npm
npm install -g npm@latest
npm install llmverify

# Option 3: Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### Error: `Cannot find module 'llmverify'`

**What you see:**
```
Error: Cannot find module 'llmverify'
    at Function.Module._resolveFilename
```

**Cause:** Package not installed or incorrect import path.

**Fix:**
```bash
# Verify installation
npm list llmverify

# If not installed
npm install llmverify

# If using TypeScript, check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

---

### Error: `Node version not supported`

**What you see:**
```
error llmverify@1.0.0: The engine "node" is incompatible with this module.
Expected version ">=18.0.0". Got "16.14.0"
```

**Cause:** llmverify requires Node.js 18 or higher.

**Fix:**
```bash
# Check current version
node --version

# Update Node.js using nvm
nvm install 18
nvm use 18

# Or download from https://nodejs.org
```

---

## Import Errors

### Error: `SyntaxError: Cannot use import statement outside a module`

**What you see:**
```
SyntaxError: Cannot use import statement outside a module
```

**Cause:** Using ES modules syntax in CommonJS environment.

**Fix:**

Option 1 - Use CommonJS syntax:
```javascript
const { verify, isInputSafe } = require('llmverify');
```

Option 2 - Enable ES modules in package.json:
```json
{
  "type": "module"
}
```

Option 3 - Use .mjs extension:
```bash
mv index.js index.mjs
```

---

### Error: `Named export 'verify' not found`

**What you see:**
```
SyntaxError: Named export 'verify' not found. The requested module 'llmverify' is a CommonJS module
```

**Cause:** ES module importing from CommonJS.

**Fix:**
```javascript
// Use default import then destructure
import llmverify from 'llmverify';
const { verify, isInputSafe } = llmverify;

// Or use createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { verify } = require('llmverify');
```

---

## Runtime Errors

### Error: `TypeError: verify is not a function`

**What you see:**
```
TypeError: verify is not a function
```

**Cause:** Incorrect import or destructuring.

**Fix:**
```typescript
// Correct import
import { verify } from 'llmverify';

// NOT this
import verify from 'llmverify'; // Wrong!
```

---

### Error: `content is required`

**What you see:**
```
Error: content is required for verification
```

**Cause:** Missing or undefined content parameter.

**Fix:**
```typescript
// Ensure content is provided
const result = await verify({ 
  content: aiOutput  // Must be a non-empty string
});

// Check for undefined
if (!aiOutput) {
  throw new Error('No content to verify');
}
```

---

### Error: `Invalid config option`

**What you see:**
```
Error: Invalid config option: unknownOption
```

**Cause:** Using deprecated or invalid configuration keys.

**Fix:**
```typescript
// Valid config structure
const result = await verify({
  content: "text",
  config: {
    tier: 'free',
    engines: {
      hallucination: { enabled: true },
      csm6: { enabled: true }
    }
  }
});
```

---

## CLI Errors

### Error: `command not found: llmverify`

**What you see:**
```bash
bash: llmverify: command not found
```

**Cause:** Global install failed or PATH not configured.

**Fix:**
```bash
# Use npx instead (recommended)
npx llmverify --help

# Or install globally
npm install -g llmverify

# Check global bin path
npm bin -g
# Add to PATH if needed
```

---

### Error: `No content provided`

**What you see:**
```
Error: No content provided. Use --file or provide content as argument.
```

**Cause:** Missing input to verify command.

**Fix:**
```bash
# Provide content directly
npx llmverify verify "Your content here"

# Or use file input
npx llmverify verify --file response.txt

# For JSON content
npx llmverify verify --json '{"key": "value"}'
```

---

### Error: `File not found`

**What you see:**
```
Error: File not found: /path/to/file.txt
```

**Cause:** Incorrect file path or file doesn't exist.

**Fix:**
```bash
# Check file exists
ls -la response.txt

# Use absolute path
npx llmverify verify --file /full/path/to/response.txt

# Use relative path from current directory
npx llmverify verify --file ./response.txt
```

---

## TypeScript Errors

### Error: `Cannot find type definition file for 'llmverify'`

**What you see:**
```
error TS7016: Could not find a declaration file for module 'llmverify'
```

**Cause:** TypeScript can't find type definitions.

**Fix:**
```bash
# llmverify includes types, ensure correct install
npm install llmverify@latest

# Check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "types": ["node"]
  }
}
```

---

### Error: `Type 'VerifyResult' is not assignable`

**What you see:**
```
Type 'VerifyResult' is not assignable to type 'MyCustomType'
```

**Cause:** Type mismatch with custom types.

**Fix:**
```typescript
import { VerifyResult } from 'llmverify';

// Use the correct type
const result: VerifyResult = await verify({ content: text });

// Or extract specific fields
const { risk, csm6 } = result;
```

---

## Adapter Errors

### Error: `Adapter requires client`

**What you see:**
```
Error: Adapter requires client instance
```

**Cause:** Missing LLM client when creating adapter.

**Fix:**
```typescript
import { createAdapter } from 'llmverify';
import OpenAI from 'openai';

// Must provide client instance
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const llm = createAdapter({ 
  provider: 'openai', 
  client: openai  // Required!
});
```

---

### Error: `Unknown provider`

**What you see:**
```
Error: Unknown provider: myProvider
```

**Cause:** Using unsupported provider name.

**Fix:**
```typescript
// Supported providers
type Provider = 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'google' 
  | 'deepseek' 
  | 'mistral' 
  | 'cohere' 
  | 'local' 
  | 'custom';

// For custom providers, use 'custom' or 'local'
const llm = createAdapter({
  provider: 'custom',
  client: myCustomClient,
  providerName: 'MyProvider'
});
```

---

### Error: `API key not set`

**What you see:**
```
Error: OpenAI API key not configured
```

**Cause:** Missing environment variable for LLM provider.

**Fix:**
```bash
# Set environment variable
export OPENAI_API_KEY=sk-your-key-here

# Or in .env file
OPENAI_API_KEY=sk-your-key-here

# Then load in code
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});
```

---

## Performance Issues

### Issue: Slow verification

**Symptoms:** Verification takes >500ms for simple content.

**Cause:** All engines enabled by default.

**Fix:**
```typescript
// Disable unused engines
const result = await verify({
  content: text,
  config: {
    engines: {
      hallucination: { enabled: false },  // Disable if not needed
      consistency: { enabled: false },
      csm6: { enabled: true }  // Keep only what you need
    }
  }
});
```

---

### Issue: High memory usage

**Symptoms:** Node process using excessive memory.

**Cause:** Processing very large content or many concurrent requests.

**Fix:**
```typescript
// Chunk large content
const chunks = splitIntoChunks(largeContent, 10000);
for (const chunk of chunks) {
  await verify({ content: chunk });
}

// Limit concurrency
import pLimit from 'p-limit';
const limit = pLimit(5);  // Max 5 concurrent
await Promise.all(items.map(item => 
  limit(() => verify({ content: item }))
));
```

---

## CI/CD Issues

### Issue: Postinstall message clutters logs

**Fix:**
```bash
# Suppress postinstall message
npm install llmverify --loglevel=silent

# Or set environment variable
CI=true npm install llmverify

# Or in package.json scripts
{
  "scripts": {
    "ci:install": "LLMVERIFY_SILENT=true npm install"
  }
}
```

---

### Issue: Exit codes not working in CI

**Expected:** Non-zero exit on high risk.

**Fix:**
```bash
# llmverify CLI exit codes:
# 0 = low risk (allow)
# 1 = moderate risk (review)
# 2 = high/critical risk (block)

# In CI script
npx llmverify verify "$AI_OUTPUT" || {
  echo "Verification failed with exit code $?"
  exit 1
}
```

---

## Still Having Issues?

### 1. Run Doctor

```bash
npx llmverify doctor
```

### 2. Check Version

```bash
npx llmverify --version
npm list llmverify
```

### 3. Update to Latest

```bash
npm update llmverify
```

### 4. Report Issue

If none of the above helps, please report:

- **GitHub Issues**: https://github.com/subodhkc/llmverify-npm/issues

Include:
- Node.js version (`node --version`)
- npm version (`npm --version`)
- llmverify version (`npx llmverify --version`)
- Full error message and stack trace
- Minimal reproduction code

---

## Error Code Reference

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | Low risk | Allow |
| 1 | Moderate risk | Review |
| 2 | High/Critical risk | Block |

| Error Type | Common Cause |
|------------|--------------|
| `ERESOLVE` | Dependency conflict |
| `MODULE_NOT_FOUND` | Not installed |
| `ERR_REQUIRE_ESM` | Module type mismatch |
| `TypeError` | Incorrect usage |

---

*Last updated: v1.0.0*
