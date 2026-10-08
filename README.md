# llmverify-mcp

Local-first [MCP](https://modelcontextprotocol.io) server that exposes the
[`llmverify`](https://github.com/subodhkc/llmverify-npm) AI output
verification engine to MCP-compatible agents and development
environments (Claude Code, Cursor, and any MCP stdio client).

This is a **thin adapter** — all detection, scoring, and audit logic
lives in the `llmverify` engine. The server handles protocol, input
validation, output bounding, error mapping, and truthful reporting of
what the engine actually established.

## What it does

| Tool | Purpose |
|---|---|
| `verify_llm_content` | Full heuristic verification: hallucination-risk signals, consistency, JSON validation, CSM6 findings, risk score + audit receipt |
| `assess_hallucination_risk` | Hallucination-risk signals only (pure analysis, no state writes) |
| `check_prompt_injection` | Pattern-based injection/jailbreak indicator scan |
| `check_pii` | PII type detection with masked values |
| `redact_pii` | In-memory PII redaction |
| `get_llmverify_capabilities` | Engine version, capabilities, limitations, adapter limits |

Everything runs **locally**: stdio transport only, zero network calls in
the default path, no telemetry.

## What it does NOT do

- Results are **heuristic risk signals for triage** — not factual
  verification, safety certification, compliance clearance, or
  exhaustive detection.
- A clean scan does not prove content is safe; an engine listed in
  `notChecked` did not evaluate the input at all.
- No remote/hosted mode — stdio only, by design.

## Prerequisites

- **Node.js >= 22**
- npm

## Install and build

```bash
git clone https://github.com/subodhkc/llmverify-mcp.git
cd llmverify-mcp
npm ci
npm run build
```

This produces `dist/index.js` (the server entrypoint). The bundled
`llmverify` engine dependency is vendored under `vendor/` — see
`docs/ENGINE-COMPATIBILITY.md` for provenance and how to update it.

## Configure an MCP client

### Claude Code

```jsonc
// ~/.claude/mcp.json  (or project .mcp.json)
{
  "mcpServers": {
    "llmverify": {
      "command": "node",
      "args": ["C:/path/to/llmverify-mcp/dist/index.js"]
    }
  }
}
```

Or register it with the CLI:

```bash
claude mcp add llmverify -- node C:/path/to/llmverify-mcp/dist/index.js
```

### Cursor

```jsonc
// ~/.cursor/mcp.json  (or <project>/.cursor/mcp.json)
{
  "mcpServers": {
    "llmverify": {
      "command": "node",
      "args": ["C:/path/to/llmverify-mcp/dist/index.js"]
    }
  }
}
```

### Any MCP stdio client

Spawn `node dist/index.js` and speak MCP over stdin/stdout. See
`examples/generic-client.mjs` for a minimal working client using the
official SDK.

### Optional environment variables

| Variable | Default | Purpose |
|---|---|---|
| `LLMVERIFY_MCP_MAX_INPUT_CHARS` | `1000000` | Max characters accepted in a `content`/`input` argument |
| `LLMVERIFY_MCP_TIMEOUT_MS` | `60000` | Per-tool wall-clock timeout |
| `LLMVERIFY_MCP_MAX_OUTPUT_ITEMS` | `50` | Cap on any single output array |
| `LLMVERIFY_MCP_MAX_TEXT_FIELD_CHARS` | `2000` | Cap on any single text field in output |
| `LLMVERIFY_HOME` | `~/.llmverify` | Base directory for engine local state |
| `LLMVERIFY_AUDIT_DIR` | `$LLMVERIFY_HOME/audit` | Audit JSONL directory |
| `LLMVERIFY_LOG_DIR` | `$LLMVERIFY_HOME/logs` | Operational log directory |
| `LLMVERIFY_BASELINE_DIR` | `$LLMVERIFY_HOME/baseline` | Drift baseline directory |
| `LLMVERIFY_USAGE_FILE` | `$LLMVERIFY_HOME/usage.json` | Usage counter file |
| `LLMVERIFY_AUDIT_HASH_KEY` | unset | Enables keyed `hmac-sha256` content hashes |
| `LLMVERIFY_AUDIT_NO_CONTENT_HASH` | unset | `1` disables content hashes in audit records |

## Example tool call

```jsonc
// tools/call verify_llm_content
{
  "content": "Studies prove 97% of experts agree this always works.",
  "profile": "baseline",
  "requireAuditPersistence": false
}
```

Returns `structuredContent` with `risk`, `enginesExecuted`,
`enginesNotChecked`, `limitations`, an `audit` persistence receipt, and
bounded per-engine results.

## Privacy

- Zero outbound network access in the default path.
- No raw prompts/responses are logged by this adapter.
- PII tool output masks raw matched values.
- Audit records store content **digests**, not content — disable with
  `LLMVERIFY_AUDIT_NO_CONTENT_HASH=1` or key them with
  `LLMVERIFY_AUDIT_HASH_KEY`.
- "Local" does not mean "writes nothing": the engine writes usage
  counters, optional audit JSONL, baselines, and logs under
  `LLMVERIFY_HOME`. See `docs/SECURITY.md`.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest: unit + integration + security + e2e
npm run test:e2e    # real stdio client/server session only
npm pack --dry-run  # inspect the publishable tarball
```

## Documentation

- `docs/ARCHITECTURE.md` — component and trust boundaries
- `docs/SECURITY.md` — threat model, limits, privacy guarantees
- `docs/MCP-TOOLS.md` — tool contracts and result semantics
- `docs/ENGINE-COMPATIBILITY.md` — pinned engine commit and upgrade path
- `docs/handoff/LLMVERIFY-MCP-IMPLEMENTATION.md` — implementation handoff

## License

MIT
