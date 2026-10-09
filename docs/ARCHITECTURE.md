# Architecture

## Design rule

`llmverify-mcp` is a **thin integration layer**. It contains no
detection logic. All hallucination-risk analysis, PII detection,
prompt-injection scanning, consistency scoring, risk scoring, and audit
integrity are delegated to the `llmverify` engine through its **public
package exports only** (`import ... from 'llmverify'` — never
`llmverify/dist/...` internal paths).

## Request flow

```
AI agent / MCP client
  → stdin (JSON-RPC, MCP frames)
  → StdioServerTransport (@modelcontextprotocol/server/stdio)
  → McpServer + zod input schema validation
  → src/adapters/llmverify.ts  (engine facade: serialization lane + timeout)
  → llmverify public API  (verify / HallucinationEngine / check* / redactPII)
  → output bounding + privacy post-processing (src/security/bounds.ts)
  → structuredContent + bounded text summary
  → stdout
```

## Components

| Path | Role |
|---|---|
| `src/index.ts` | Executable entrypoint. Reroutes console.log/info/debug to stderr (stdout is protocol-only), connects `StdioServerTransport`. |
| `src/server.ts` | `createLlmverifyMcpServer()` — `McpServer` factory; registers all tools. |
| `src/tools/*.ts` | One file per tool: zod input/output schemas, annotations, handler. Handlers never throw — errors become `isError` results with a normalized code. |
| `src/adapters/llmverify.ts` | The only file that imports `llmverify`. Maps tool inputs to `VerifyOptions`, wraps stateful `verify()` calls in a serialized lane, applies the tool timeout, validates results with `validateVerifyResult()`. |
| `src/schemas/common.ts` | Shared zod fragments (content field, audit receipt, truncation, error). |
| `src/security/limits.ts` | Env-configurable limits + `withTimeout`. |
| `src/security/bounds.ts` | Output array caps, text-field truncation with explicit `truncations` metadata, PII evidence masking. |
| `src/errors/index.ts` | `normalizeError()` — maps typed engine errors to stable `{name, code, message}` objects with secret-scrubbing. |
| `src/contracts/` | Adapter contract version + result-envelope helpers. |

## Concurrency model

- `verify_llm_content` mutates engine local state (usage counter, audit
  JSONL, drift baseline). Those calls pass through a **single in-process
  serialized lane** — atomic writes prevent torn JSON; serialization
  prevents in-process lost updates. Cross-process coordination is out of
  scope (documented limitation; no locks added).
- Pure read-only tools (`assess_hallucination_risk`,
  `check_prompt_injection`, `check_pii`, `redact_pii`,
  `get_llmverify_capabilities`) perform no state writes and are not
  queued.
- A per-tool wall-clock timeout (`LLMVERIFY_MCP_TIMEOUT_MS`, default
  60 s) bounds each call. Note: a timeout cannot abort synchronous CPU
  work mid-instruction; it bounds the await, not the instruction.

## State and privacy boundaries

- Engine local state lives under `LLMVERIFY_HOME` (default
  `~/.llmverify`): usage counter, audit JSONL, baselines, operational
  logs. All locations are env-configurable.
- The adapter itself writes nothing to disk.
- stdout carries MCP frames only; all diagnostics go to stderr.

## Dependency boundary

```
llmverify-mcp
├── @modelcontextprotocol/server   protocol + stdio transport
├── llmverify                      engine (published npm dependency ^1.7.0)
└── zod                            tool schemas (Standard Schema)
```

The engine is consumed as an npm package. It is NOT vendored as source
and no engine internals are reimplemented.
