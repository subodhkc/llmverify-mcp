# CLI Reference

Complete command-line interface documentation for llmverify.

---

## Installation

```bash
# Global install (optional)
npm install -g llmverify

# Or use npx (recommended)
npx llmverify <command>
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `llmverify run` | ★ Master command - run all engines with presets |
| `llmverify wizard` | ★ Interactive setup wizard |
| `llmverify verify` | Run multi-engine verification (default) |
| `llmverify presets` | List available preset configurations |
| `llmverify benchmark` | Benchmark latency across presets |
| `llmverify engines` | List all verification engines |
| `llmverify explain <engine>` | Explain how an engine works |
| `llmverify adapters` | List available LLM adapters |
| `llmverify doctor` | Check system health |
| `llmverify init` | Initialize config file |
| `llmverify privacy` | Show privacy guarantees |
| `llmverify info` | Show package information |
| `llmverify tutorial` | Show usage examples |
| `llmverify --help` | Show help |
| `llmverify --version` | Show version |

---

## Commands

### `llmverify run` ★

Master command that runs all verification engines with preset configurations. **Recommended for most use cases.**

**Usage:**
```bash
llmverify run [content] [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `content` | Text content to verify (or use --file) |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Read content from file | - |
| `-p, --preset <mode>` | Preset mode: dev, prod, strict, fast, ci | dev |
| `--prompt <text>` | Original prompt for classification | - |
| `--input <text>` | User input to check for injection | - |
| `-o, --output <format>` | Output format: text, json, summary | text |
| `--parallel` | Run engines in parallel | true |
| `--no-parallel` | Run engines sequentially | - |

**Presets:**
| Preset | Description | Speed | Thoroughness |
|--------|-------------|-------|--------------|
| `dev` | Development mode - balanced output | [*][*][*][ ][ ] | [*][*][*][*][ ] |
| `prod` | Production mode - optimized for speed | [*][*][*][*][*] | [*][*][*][ ][ ] |
| `strict` | Strict mode - maximum scrutiny | [*][*][ ][ ][ ] | [*][*][*][*][*] |
| `fast` | Fast mode - minimal checks | [*][*][*][*][*] | [*][*][ ][ ][ ] |
| `ci` | CI mode - optimized for pipelines | [*][*][*][*][ ] | [*][*][*][*][ ] |

**Examples:**
```bash
# Development mode (recommended for starting)
npx llmverify run "Your AI output" --preset dev

# Production mode (fast)
npx llmverify run "Your AI output" --preset prod

# Strict mode with classification
npx llmverify run "AI response" --prompt "Original question" --preset strict

# Check user input for injection
npx llmverify run "AI response" --input "User message" --preset strict

# JSON output for CI/CD
npx llmverify run "Your AI output" --preset ci --output json

# Summary output (one-line)
npx llmverify run "Your AI output" --preset prod --output summary
```

---

### `llmverify wizard` ★

Interactive setup wizard for first-time configuration.

**Usage:**
```bash
llmverify wizard
```

**Description:**
Displays a guided walkthrough including:
- Preset selection guide
- Quick start commands
- Programmatic usage examples
- Configuration file setup
- Links to documentation

**Example:**
```bash
npx llmverify wizard
```

---

### `llmverify presets`

List all available preset configurations.

**Usage:**
```bash
llmverify presets [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Example:**
```bash
# Human-readable output
npx llmverify presets

# JSON output
npx llmverify presets --json
```

---

### `llmverify benchmark`

Benchmark verification latency across all presets.

**Usage:**
```bash
llmverify benchmark [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-i, --iterations <n>` | Number of iterations per preset | 3 |
| `-c, --content <text>` | Custom content to benchmark | Default test content |
| `--json` | Output results as JSON | false |

**Examples:**
```bash
# Basic benchmark
npx llmverify benchmark

# More iterations for accuracy
npx llmverify benchmark --iterations 10

# Custom content
npx llmverify benchmark --content "Your specific AI output to test"

# JSON output for analysis
npx llmverify benchmark --json
```

---

### `llmverify verify`

Run multi-engine verification on AI output. This is the default command.

**Usage:**
```bash
llmverify verify [content] [options]
llmverify [content] [options]  # 'verify' is default
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `content` | Text content to verify (or use --file) |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Read content from file | - |
| `-j, --json` | Treat content as JSON | false |
| `-c, --config <path>` | Path to config file | - |
| `-v, --verbose` | Verbose output with limitations | false |
| `-o, --output <format>` | Output format: text, json | text |

**Examples:**
```bash
# Basic verification
npx llmverify verify "The capital of France is Paris."

# Verify from file
npx llmverify verify --file response.txt

# JSON output for CI/CD
npx llmverify verify "content" --output json

# Verbose with limitations
npx llmverify verify "content" --verbose

# With custom config
npx llmverify verify "content" --config ./llmverify.config.json

# Verify JSON content
npx llmverify verify --json '{"status": "ok", "data": []}'
```

**Exit Codes:**
| Code | Risk Level | Recommended Action |
|------|------------|-------------------|
| 0 | Low | Allow |
| 1 | Moderate | Review |
| 2 | High/Critical | Block |

**Output (text format):**
```
[SCAN] Running llmverify...

[CHART] Risk Assessment
   Level: LOW
   Score: 12.5%
   Action: allow

[SCAN] Findings
┌──────────┬──────────┬─────────────────────┬────────────┐
│ Severity │ Category │ Message             │ Confidence │
├──────────┼──────────┼─────────────────────┼────────────┤
│ info     │ pii      │ No PII detected     │ 95%        │
└──────────┴──────────┴─────────────────────┴────────────┘

[NOTE] Interpretation
   Content appears safe with low risk indicators.

Verification ID: abc123
Latency: 45ms | Version: 1.0.0
```

---

### `llmverify engines`

List all verification engines with their current status.

**Usage:**
```bash
llmverify engines [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Example:**
```bash
npx llmverify engines
```

**Output:**
```
[TOOL] Verification Engines

  [*] classification     enabled    Intent, hallucination, reasoning detection
  [*] csm6               enabled    Security checks (PII, harmful content, injection)
  [*] hallucination      enabled    Hallucination and factuality detection
  [*] drift              enabled    Fingerprint drift analysis
  [ ] token-rate         disabled   Token rate monitoring (static mode)
  [ ] latency            disabled   Latency tracking (no wrapping client)
```

---

### `llmverify explain <engine>`

Get detailed explanation of how a specific verification engine works.

**Usage:**
```bash
llmverify explain <engine>
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `engine` | Engine name: hallucination, classification, csm6, drift |

**Examples:**
```bash
npx llmverify explain hallucination
npx llmverify explain csm6
npx llmverify explain classification
npx llmverify explain drift
```

**Output:**
```
[SCAN] Engine: hallucination

──────────────────────────────────────────────────
Detects AI-generated content that may be factually incorrect or fabricated.

Detection Signals:
  • contradiction signal - conflicting statements within response
  • low-confidence signal - hedging language patterns
  • compression signal - information density anomalies
  • domain mismatch signal - out-of-context claims
  • pattern mismatch signal - structural inconsistencies
```

---

### `llmverify adapters`

List available LLM provider adapters.

**Usage:**
```bash
llmverify adapters
```

**Output:**
```
🔌 Available Adapters

  [*] openai       available    OpenAI GPT models
  [*] anthropic    available    Anthropic Claude models
  [*] langchain    available    LangChain integration
  [ ] vercel-ai    planned      Vercel AI SDK
  [ ] ollama       planned      Local Ollama models
```

---

### `llmverify doctor`

Check system health and configuration.

**Usage:**
```bash
llmverify doctor
```

**Output:**
```
[CHECK] llmverify Doctor

──────────────────────────────────────────────────
  [OK] Node.js Version: v20.10.0
  [OK] Config File: Found
  [ ] OPENAI_API_KEY: Not set
  [ ] ANTHROPIC_API_KEY: Not set
  [OK] Postinstall: Present

Run "llmverify init" to create a config file.
```

**Checks performed:**
- Node.js version (requires >=18)
- Config file presence
- Environment variables
- Postinstall script

---

### `llmverify init`

Initialize a llmverify configuration file in the current directory.

**Usage:**
```bash
llmverify init
```

**Creates:** `llmverify.config.json`

**Example config:**
```json
{
  "tier": "free",
  "engines": {
    "hallucination": { "enabled": true },
    "consistency": { "enabled": true },
    "jsonValidator": { "enabled": true },
    "csm6": { "enabled": true }
  },
  "performance": {
    "cacheEnabled": true,
    "maxContentLength": 100000
  },
  "output": {
    "verbose": false,
    "includeEvidence": true,
    "includeMethodology": true,
    "includeLimitations": true
  }
}
```

---

### `llmverify privacy`

Display privacy guarantees and data handling policies.

**Usage:**
```bash
llmverify privacy
```

**Output:**
```
[LIST] llmverify Privacy Guarantees

Free Tier:
  • Network Traffic: ZERO
  • Data Transmission: NONE
  • Telemetry: DISABLED
  • Verification: Run tcpdump - you will see nothing

Paid Tiers:
  • Default: LOCAL_PROCESSING
  • API Calls: OPT_IN_ONLY
  • Requires: EXPLICIT_API_KEY

We NEVER:
  [FAIL] No training on user data
  [FAIL] No third-party data sharing
  [FAIL] No hidden telemetry
  [FAIL] No tracking without explicit consent
```

---

### `llmverify info`

Show package information, documentation links, and funding options.

**Usage:**
```bash
llmverify info [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Output:**
```
[PKG] llmverify Package Information

Package
──────────────────────────────────────────────────
  Name:        llmverify
  Version:     1.0.0
  Maintainer:  Subodh KC (KingCaliber Labs)

Engines Included
──────────────────────────────────────────────────
  [OK] classification (intent, hallucination, reasoning)
  [OK] CSM6 (security, PII, harmful content, injection)
  [OK] hallucination detection
  [OK] drift analysis
  [OK] latency monitoring
  [OK] token-rate tracking

Documentation
──────────────────────────────────────────────────
  README     README.md
  CLI        docs/CLI.md
  ENGINES    docs/ENGINES.md
  API        docs/API.md

Privacy
──────────────────────────────────────────────────
  🔒 No telemetry, no remote logging. All analysis local.

Support Development
──────────────────────────────────────────────────
  ☕ https://www.buymeacoffee.com/subodhkc
```

---

### `llmverify tutorial`

Show usage examples and quick start guide.

**Usage:**
```bash
llmverify tutorial
```

**Output:**
```
📚 llmverify Quick Start Guide

════════════════════════════════════════════════════════════

1. Basic Verification
   Verify AI output directly:
   $ npx llmverify verify "Your AI response here"

2. Verify from File
   Verify content from a file:
   $ npx llmverify verify --file response.txt

3. JSON Output
   Get results as JSON for programmatic use:
   $ npx llmverify verify "content" --output json

4. Initialize Config
   Create a config file for your project:
   $ npx llmverify init

5. Check Engines
   See available verification engines:
   $ npx llmverify engines

6. Learn About Engines
   Understand how detection works:
   $ npx llmverify explain hallucination

7. System Health
   Verify your setup:
   $ npx llmverify doctor

────────────────────────────────────────────────────────────
For more help: npx llmverify --help
Documentation: https://github.com/subodhkc/llmverify-npm
```

---

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help for command |
| `-V, --version` | Show version number |

---

## Configuration File

Create `llmverify.config.json` in your project root:

```json
{
  "tier": "free",
  "engines": {
    "hallucination": {
      "enabled": true,
      "weights": {
        "speculative": 0.3,
        "overconfident": 0.4,
        "fabricated": 0.3
      }
    },
    "consistency": {
      "enabled": true
    },
    "jsonValidator": {
      "enabled": true,
      "maxRepairSteps": 6
    },
    "csm6": {
      "enabled": true,
      "checks": {
        "security": true,
        "privacy": true,
        "safety": true
      },
      "minSeverity": "low"
    }
  },
  "performance": {
    "cacheEnabled": true,
    "maxContentLength": 100000,
    "timeoutMs": 30000
  },
  "output": {
    "verbose": false,
    "includeEvidence": true,
    "includeMethodology": true,
    "includeLimitations": true
  }
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLMVERIFY_SILENT` | Suppress postinstall message | false |
| `LLMVERIFY_CONFIG` | Path to config file | ./llmverify.config.json |
| `OPENAI_API_KEY` | OpenAI API key (for adapters) | - |
| `ANTHROPIC_API_KEY` | Anthropic API key (for adapters) | - |

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Verify AI Output
  run: |
    npx llmverify verify "${{ steps.ai.outputs.response }}" --output json > result.json
    RISK=$(jq -r '.risk.level' result.json)
    if [ "$RISK" = "critical" ] || [ "$RISK" = "high" ]; then
      echo "High risk content detected"
      exit 1
    fi
```

### Exit Code Handling

```bash
#!/bin/bash
npx llmverify verify "$AI_OUTPUT"
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "[OK] Low risk - proceeding" ;;
  1) echo "[WARN] Moderate risk - review required" ;;
  2) echo "[FAIL] High risk - blocked" && exit 1 ;;
esac
```

---

## Piping and Scripting

```bash
# Pipe content
echo "AI response here" | npx llmverify verify

# From file
cat response.txt | npx llmverify verify

# JSON output to file
npx llmverify verify "content" --output json > result.json

# Extract risk level
RISK=$(npx llmverify verify "content" -o json | jq -r '.risk.level')
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common errors and solutions.

---

*CLI Reference v1.0.0*
