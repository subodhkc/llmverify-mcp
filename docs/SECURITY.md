# Security

## Trust model

The server is designed to run on a developer/operator machine and
consume **untrusted model-generated text**. Content is always data —
never executed, never interpreted as instructions, never used as a file
path, never able to modify the tool registry or server configuration.

## Boundaries

- **stdio only.** No HTTP listener, no socket server, no remote access.
  A stdio server is reachable only by the MCP host that spawned it —
  it is NOT remotely accessible (from ChatGPT or anything else).
- **Zero outbound network** in the default execution path. All engine
  heuristics are local. The adapter performs no network I/O.
- **No embedded secrets.** No API keys exist in this codebase.
- **stdout is protocol-only.** `console.log/info/debug` are rerouted to
  stderr at startup; nothing but MCP frames can reach stdout.
- **No shell execution, no file-path tools, no dynamic code
  evaluation.** Tool inputs are strings analyzed as text.

## Input limits

| Control | Default | Env override |
|---|---|---|
| Max input chars per `content`/`input` arg | 1,000,000 | `LLMVERIFY_MCP_MAX_INPUT_CHARS` |
| Tool wall-clock timeout | 60,000 ms | `LLMVERIFY_MCP_TIMEOUT_MS` |
| Max items in any output array | 50 | `LLMVERIFY_MCP_MAX_OUTPUT_ITEMS` |
| Max chars per output text field | 2,000 | `LLMVERIFY_MCP_MAX_TEXT_FIELD_CHARS` |
| Max serialized `structuredContent` bytes | 262,144 | `LLMVERIFY_MCP_MAX_OUTPUT_BYTES` |
| Max queued/running stateful verify calls | 16 | `LLMVERIFY_MCP_MAX_QUEUE_DEPTH` |
| `expectedSchema` input | ≤64 KiB serialized, ≤32 nesting depth | not configurable |

Oversized input is rejected at the zod schema layer before the engine
runs. Bounded output fields report omissions explicitly via
`output.truncations` — never silently.

## Timeout & cancellation semantics

The engine has no abort/cancellation hook. The adapter timeout bounds
the **caller-facing wait**, not the engine's work:

- Stateful `verify()` calls execute in a serialized in-process lane
  (`src/security/lane.ts`). The lane tracks the real completion of the
  underlying work — never the raced timeout.
- On timeout the caller receives one of two distinct outcomes:
  - `MCP_ADAPTER_TIMEOUT` — the call was **running** when the deadline
    hit. The engine call is **not** cancelled and continues to hold
    the lane until it actually settles; a later verify call cannot
    start while a timed-out one may still be writing usage, audit, or
    baseline state. The outcome is indeterminate — do not blindly
    retry (state may have been written).
  - `MCP_ADAPTER_QUEUE_EXPIRED` — the deadline passed while the call
    was still **queued**. The engine call never started and never
    will: no usage-quota consumption, no audit record. Safe to retry.
- A timed-out operation never silently resolves as a successful result
  or audit receipt — the caller observed a rejection, period.
- The lane is bounded (`LLMVERIFY_MCP_MAX_QUEUE_DEPTH`, default 16);
  excess calls fail fast with `MCP_ADAPTER_QUEUE_FULL` instead of
  building an unbounded backlog.
- Pure read-only tools (hallucination, injection, PII, redact,
  capabilities) do not share the lane; they are state-free.

## Serialized output budget

`LLMVERIFY_MCP_MAX_OUTPUT_BYTES` is measured on the serialized
`structuredContent`, not estimated per field. When a result exceeds it:

- `verify_llm_content` drops the bulky `engineResults` pass-through to
  `{omittedForSize: true, engines: [...]}` and records the omission in
  `output.truncations`. If still over budget it fails with
  `MCP_ADAPTER_OUTPUT_TOO_LARGE`.
- `check_pii` / `check_prompt_injection` drop the `findings` (and
  `recommendations`) arrays to `[]` + an `*Omitted` count, recorded in
  `output.truncations`. `findingsCount` always reports the true total.
- `redact_pii` **never truncates the redacted document** — a redaction
  that cannot fit returns an explicit `MCP_ADAPTER_OUTPUT_TOO_LARGE`
  error with no `redacted` field. Supported alternatives: raise the
  budget env var, or call `redactPII` programmatically.

## Output privacy

The MCP response is a **privacy-filtered projection** of the engine's
internal result — the internal `VerifyResult` is richer; the client
receives a masked view. Masking is provable, never silent:
`structuredContent.privacy.piiFieldsMasked` reports how many fields
were scrubbed.

- `verify_llm_content` — every input-echoing field passes through the
  engine's own `redactPII()`: hallucination claim text, consistency
  sections/contradictions, `json.schemaErrors`, `risk.interpretation`,
  `warnings`, and all CSM6 finding `evidence` fields. For
  privacy-category findings, `evidence.textSample` is the sensitive
  match itself (the engine only partial-masks prefix/suffix) — it is
  hard-replaced with `[REDACTED]`. `evidence.context` excerpts are
  PII-scrubbed, not dropped.
- `check_pii` findings mask evidence text samples (`[REDACTED]`) — a
  PII scanner must not echo the PII it found.
- `redact_pii` returns only the redacted text plus type/position
  metadata; original matched values are never returned. The
  `replacement` marker is caller-controlled text inserted into the
  output — it substitutes markers, it cannot recover originals.
- Error messages pass through `sanitizeMessage()`, which strips
  secret-looking `key=value` pairs and common token shapes, then a
  final `redactPII` pass masks any PII echoed in engine error text.
  Stack traces are never returned to clients.
- `get_llmverify_capabilities` withholds absolute host paths by
  default (`localState` reports field slots + env-var names only;
  `resultSchemaFile` is `null`). `includeLocalPaths: true` is the
  documented opt-in for real paths.
- VerifyResult `json.parsed` and `consistency.similarityMatrix` are
  dropped from tool output (echo the input / O(n²) payload).

Heuristic redaction is NOT exhaustive: PII in formats the engine's
patterns do not detect still passes through input-echoing fields.

## Local state disclosure

Zero network ≠ zero local writes. The engine may write under
`LLMVERIFY_HOME` (default `~/.llmverify`):

- `usage.json` — daily call counter (tier quota enforcement)
- `audit/*.jsonl` — integrity-digested audit records (enabled by
  default; content stored as digests, never raw text)
- `baseline/` — drift-detection baseline state
- `logs/` — sanitized operational logs

The adapter writes no files of its own.

## Audit integrity semantics

- `audit.entryDigest` (`sha256:<hex>`) proves the stored record was not
  modified after write — tamper-evidence only. It is **not a digital
  signature** and proves nothing about who produced the record.
- `audit.status` describes the actual outcome: `PERSISTED`, `DISABLED`,
  `FAILED`, `NOT_ATTEMPTED`. A successful verification does NOT imply a
  persisted audit record.
- `requireAuditPersistence: true` = evidence-required mode: the tool
  fails with a typed `AuditPersistenceError` (`LLMVERIFY_8001`) unless
  the record is actually `PERSISTED` — `FAILED`, `DISABLED`, and
  `NOT_ATTEMPTED` all escalate.
- Audit privacy knobs (operator-configured):
  `LLMVERIFY_AUDIT_NO_CONTENT_HASH=1` disables content hashes;
  `LLMVERIFY_AUDIT_HASH_KEY` enables keyed `hmac-sha256` digests
  (recommended for low-entropy/sensitive content, since unkeyed hashes
  can be brute-forced).

## Concurrency & durability limits

- In-process: stateful `verify()` calls are serialized; atomic file
  writes prevent torn JSON.
- Cross-process: multiple `llmverify-mcp` processes (or other engine
  consumers) sharing one `LLMVERIFY_HOME` can lose read-modify-write
  updates (usage counter, baselines) — last writer wins. Audit JSONL is
  append-oriented but not lock-coordinated. No distributed locking is
  provided; run one server per state home if durability matters.

## What the tools do not establish

- Hallucination risk score ≠ factual verdict. No ground-truth
  verification exists.
- `inputSafe=true` / no findings ≠ safe. Pattern detection is
  heuristic and not exhaustive.
- Verification output is not regulatory certification, compliance
  clearance, or a safety guarantee.

## Dependency posture

Runtime dependencies: `@modelcontextprotocol/server` (v2),
`llmverify` (published npm dependency `^1.7.0`), `zod` v4.
`npm audit --omit=dev` reported **0 vulnerabilities** for the adapter's
production tree — including the engine's published dependency tree —
at release time.
