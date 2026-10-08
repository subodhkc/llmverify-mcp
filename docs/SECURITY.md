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

Oversized input is rejected at the zod schema layer before the engine
runs. Bounded output fields report omissions explicitly via
`output.truncations` — never silently.

## Output privacy

- `check_pii` findings mask evidence text samples (`[REDACTED]`) — a
  PII scanner must not echo the PII it found.
- `redact_pii` returns only the redacted text plus type/position
  metadata; original matched values are never returned.
- Error messages pass through `sanitizeMessage()`, which strips
  secret-looking `key=value` pairs and common token shapes and caps
  message length. Stack traces are never returned to clients.
- VerifyResult `json.parsed` and `consistency.similarityMatrix` are
  dropped from tool output (echo the input / O(n²) payload).

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
`llmverify` (vendored pinned tarball), `zod` v4. `npm audit` reported
**0 vulnerabilities** at implementation time for the adapter's own tree.
The engine's published dependency tree carries known audit findings
(45 advisories on the upstream `npm ci` baseline, none in code paths
reachable through this adapter's stdio surface — see
`docs/ENGINE-COMPATIBILITY.md` and the handoff doc for the assessment).
