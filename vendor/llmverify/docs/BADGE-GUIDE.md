# llmverify Badge Guide

Show the world you're using AI verification with the official "Built with llmverify" badge!

## 📛 Quick Start

### Generate Your Badge

```bash
npx llmverify badge --name "My Project" --url "https://myproject.com"
```

This will output:
- [OK] Markdown code for README.md
- [OK] HTML code for websites
- [OK] Verification signature for authenticity

### Add to README.md

Copy the markdown code and paste it at the top of your README:

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://github.com/subodhkc/llmverify-npm)
```

**Result:**

![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)

---

## [STYLE] Badge Options

### Standard Badge (Recommended)

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://github.com/subodhkc/llmverify-npm)
```

### Badge with Custom Link

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://yourproject.com)
```

### Badge with Shield Icon

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTIgMkw0IDZWMTJDNCAyMC41IDEyIDIyIDEyIDIyQzEyIDIyIDIwIDIwLjUgMjAgMTJWNkwxMiAyWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cGF0aCBkPSJNOSAxMkwxMSAxNEwxNSAxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+)](https://github.com/subodhkc/llmverify-npm)
```

---

## [TOOL] Programmatic Usage

### Generate Badge in Code

```typescript
import { generateBadgeForProject } from 'llmverify';

const { markdown, html, signature } = generateBadgeForProject(
  'My Awesome Project',
  'https://myproject.com'
);

console.log(markdown); // For README.md
console.log(html);     // For website
console.log(signature); // Verification code
```

### Verify Badge Authenticity

```typescript
import { verifyBadgeSignature, extractBadgeVerification } from 'llmverify';

// Verify a badge signature
const isValid = verifyBadgeSignature(
  'My Project',
  '2024-12-04',
  '1.4.0',
  '68f2a30cc863cd61'
);

// Extract and verify from markdown/HTML
const verification = extractBadgeVerification(readmeContent);
if (verification && verification.valid) {
  console.log('Badge is authentic!');
}
```

### Save Badge to File

```typescript
import { saveBadgeToFile } from 'llmverify';

saveBadgeToFile(
  './BADGE.md',
  'My Project',
  'https://myproject.com'
);
```

---

## [WEB] HTML Usage

### For Websites

```html
<a href="https://github.com/subodhkc/llmverify-npm" target="_blank">
  <img src="https://img.shields.io/badge/Built_with-llmverify-blue" 
       alt="Built with llmverify" />
</a>
```

### With Verification Comments

```html
<a href="https://myproject.com" target="_blank">
  <img src="https://img.shields.io/badge/Built_with-llmverify-blue" 
       alt="Built with llmverify" />
</a>

<!-- llmverify badge verification -->
<!-- project: My Project -->
<!-- verified: 2024-12-04 -->
<!-- version: 1.4.0 -->
<!-- signature: 68f2a30cc863cd61 -->
```

---

## 📥 Download Badge Image

The official badge image is available in the repository:

**Location:** `/assets/badge.svg`

**Usage:**
1. Download the SVG file
2. Add to your project's assets
3. Use in documentation or presentations

```markdown
![Built with llmverify](./assets/badge.svg)
```

---

## [OK] Badge Verification

All badges include a cryptographic signature for authenticity:

### How It Works

1. **Generation:** Badge includes project name, date, and version
2. **Signature:** SHA-256 hash generated from badge data
3. **Verification:** Anyone can verify the badge is authentic

### Verify a Badge

```bash
# Extract verification from README
npx llmverify verify-badge README.md
```

Or programmatically:

```typescript
import { extractBadgeVerification } from 'llmverify';

const readme = fs.readFileSync('README.md', 'utf-8');
const verification = extractBadgeVerification(readme);

if (verification?.valid) {
  console.log(`[OK] Verified: ${verification.projectName}`);
  console.log(`  Date: ${verification.verifiedDate}`);
  console.log(`  Version: ${verification.version}`);
} else {
  console.log('[FAIL] Badge verification failed');
}
```

---

## [TARGET] Best Practices

### Placement

**Recommended locations:**
- Top of README.md (after title)
- Project documentation homepage
- Package.json homepage
- Project website footer

### Example README Structure

```markdown
# My Awesome Project

[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://github.com/subodhkc/llmverify-npm)
[![npm version](https://badge.fury.io/js/my-project.svg)](https://www.npmjs.com/package/my-project)

> AI-powered application with verified outputs

## Features
...
```

### Update Regularly

Update your badge when:
- [OK] Upgrading llmverify version
- [OK] Changing project URL
- [OK] Major project milestones

```bash
# Regenerate badge
npx llmverify badge --name "My Project" --url "https://myproject.com"
```

---

## 🔒 Security

### Badge Signatures

Each badge includes a unique signature that:
- [OK] Proves authenticity
- [OK] Prevents tampering
- [OK] Links to specific project and version
- [OK] Can be verified programmatically

### Signature Format

```
SHA-256(projectName:verifiedDate:version).substring(0, 16)
```

Example: `68f2a30cc863cd61`

---

## [CHART] Badge Styles

### Available Styles

```markdown
<!-- Blue (default) -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-blue)

<!-- Green -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-green)

<!-- Red -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-red)

<!-- Custom color -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-ff69b4)
```

### With Icons

```markdown
<!-- Shield icon -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-blue?logo=shield)

<!-- Check icon -->
![Badge](https://img.shields.io/badge/Built_with-llmverify-blue?logo=checkmarx)
```

---

## 🆘 Troubleshooting

### Badge Not Showing

**Problem:** Badge image not loading

**Solution:**
1. Check internet connection
2. Verify shields.io is accessible
3. Use local badge image from `/assets/badge.svg`

### Verification Fails

**Problem:** Badge verification returns invalid

**Solution:**
1. Regenerate badge with current version
2. Ensure all verification comments are present
3. Check for typos in project name or date

### CLI Command Not Found

**Problem:** `npx llmverify badge` not working

**Solution:**
```bash
# Install latest version
npm install -g llmverify

# Or use npx with full path
npx llmverify@latest badge --name "My Project"
```

---

## [TIP] Examples

### Example 1: Simple Badge

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://github.com/subodhkc/llmverify-npm)
```

### Example 2: Badge with Verification

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://myproject.com)

<!-- llmverify badge verification -->
<!-- project: My Project -->
<!-- verified: 2024-12-04 -->
<!-- version: 1.4.0 -->
<!-- signature: 68f2a30cc863cd61 -->
```

### Example 3: Multiple Badges

```markdown
[![Built with llmverify](https://img.shields.io/badge/Built_with-llmverify-blue)](https://github.com/subodhkc/llmverify-npm)
[![npm version](https://badge.fury.io/js/my-project.svg)](https://www.npmjs.com/package/my-project)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

## 📚 Additional Resources

- [llmverify Documentation](https://github.com/subodhkc/llmverify-npm)
- [Badge API Reference](../docs/API-REFERENCE.md#badge-generator-v140)
- [Shields.io Documentation](https://shields.io/)

---

**Show your commitment to AI safety with the llmverify badge!** [SHIELD]
