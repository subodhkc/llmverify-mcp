# MCP Tools

All tools return `structuredContent` (the machine contract, validated by
the tool's registered output schema) plus a bounded human-readable text
summary. Adapter contract version: `1.1` (`adapter.contractVersion`)
— 1.1 adds the `privacy` provenance field on verify results, the
`includeLocalPaths` opt-in on capabilities, and the queue-expiry /
output-size error codes.

Every result envelope includes:

```jsonc
{
  "adapter": { "name": "llmverify-mcp", "version": "0.1.0", "contractVersion": "1.0" },
  "engine":  { "name": "llmverify", "version": "1.6.1" },
  "output":  { "truncated": false, "truncations": [] }
}
```

Errors return `isError: true` with a normalized
`error: { name, code, message, recoverable?, details? }` — handlers never
throw past the tool boundary.

## verify_llm_content

Full heuristic verification via `verify()`. **Not read-only** — may
increment the local usage counter and append an audit record.

**Input**

| Field | Type | Required | Notes |
|---|---|---|---|
| `content` | string | yes | Text to verify. Never executed. Max 1M chars (default). |
| `profile` | enum | no | CSM6 profile: `baseline`, `high_risk`, `finance`, `health`, `research` |
| `isJSON` | boolean | no | Declares content is JSON — gates the JSON validator |
| `expectedSchema` | object | no | JSON Schema for the JSON validator (needs `isJSON: true`) |
| `skipEngines` | enum[] | no | Public ids: `hallucination`, `consistency`, `jsonValidator`, `csm6`. The adapter maps `jsonValidator` → the engine-internal id `json` before calling `verify()`; `enginesNotChecked` reports the engine's own name (`json`). Unknown ids are rejected at input validation. |
| `requireAuditPersistence` | boolean | no | Evidence-required mode (default false) |

**Output (additions to the envelope)**

| Field | Semantics |
|---|---|
| `resultSchemaVersion` | Engine result contract version (`"1.0"`) |
| `risk` | `{overall, level, action, interpretation, ...}` — heuristic triage signal, not a verdict |
| `enginesExecuted` | Engines that actually ran (`meta.enginesUsed`) |
| `enginesNotChecked` | Engines that did NOT evaluate — skipped, disabled, or not applicable. **NOT_CHECKED is not success.** |
| `limitations` | Engine-declared limitations |
| `audit` | `{status, filePath?, entryDigest?, error?}` — actual persistence outcome; `sha256:` digest is tamper-evidence, not a signature |
| `engineResults` | Bounded pass-through: `hallucination`, `consistency`, `json`, `csm6` — **privacy-filtered**: input-echoing fields (claim text, sections, contradictions, schemaErrors, finding evidence) have engine-detected PII masked; privacy-finding `textSample` is `[REDACTED]` |
| `warnings` | Engine warnings (e.g. usage-limit proximity), PII-scrubbed |
| `privacy` | `{piiFieldsMasked, policy}` — provenance for the masking applied; the response is a privacy-filtered projection of the richer internal engine result |

## assess_hallucination_risk

Hallucination-risk signals only, via `HallucinationEngine`. Read-only —
no state writes. **Input:** `content`.

**Output:** `riskScore`, `riskLabel` — the **engine-authoritative**
classification from llmverify's exported `getHallucinationLabel()`:
`low` (≤0.3), `medium` (≤0.6), `high` (>0.6). Note this label set is
deliberately different from `verify()`'s four-band `risk.level`
(`low/moderate/high/critical`) — the hallucination score has its own
semantics and is not re-mapped by the adapter. Also: `riskIndicators`,
`suspiciousClaims` (bounded), `claimsEvaluated`, `confidence`,
`methodology`, `limitations`, `evaluation: "COMPLETED"`.

A flagged claim is not established as false; an unflagged claim is not
established as true.

## check_prompt_injection

Pattern-based injection scan via `checkPromptInjection` /
`getInjectionRiskScore` / `isInputSafe`. Read-only.
**Input:** `input` (string).

**Output:** `inputSafe` (gate heuristic — `true` means no indicators
observed, NOT proof of safety), `riskScore`, `indicatorsObserved`,
`findings` (bounded: id/category/severity/message/recommendation/
confidence/limitations), `findingsCount`, `recommendations`,
`limitations`, `evaluation`.

## check_pii

PII type detection via `checkPII` / `getPIIRiskScore` / `containsPII`.
Read-only. **Input:** `content`.

**Output:** `piiDetected`, `riskScore`, `piiTypes`, `findings` (bounded;
`evidence` values masked `[REDACTED]`), `findingsCount`, `limitations`,
`evaluation`. Raw sensitive values are never returned. Pattern coverage
is not exhaustive.

## redact_pii

In-memory redaction via `redactPII`. Read-only.
**Input:** `content`, optional `replacement` (≤64 chars, default
`[REDACTED]`).

**Output:** `redacted` (full redacted string), `piiCount`, `redactions`
(`[{type, position}]` — original values withheld), `limitations`,
`evaluation`.

If the redacted document exceeds the serialized output budget
(`LLMVERIFY_MCP_MAX_OUTPUT_BYTES`, default 256 KiB) the tool returns
`MCP_ADAPTER_OUTPUT_TOO_LARGE` with **no** `redacted` field — a
truncated redaction is never presented as complete.

## get_llmverify_capabilities

Capability discovery via `getEngineCapabilities()` + `getPackageInfo()`.
Read-only. **Input:** optional `includeLocalPaths` (boolean).

**Output:** engine identity + `resultSchemaVersion`, `capabilities`
(each with `observes` / `doesNotEstablish` / `networkAccess` /
`persistsContent` / `entrypoints`), `package` info, adapter `limits`,
`localState`, `resultSchemaFile`.

`localState` reports field slots and env-var override names
(`LLMVERIFY_HOME`, `LLMVERIFY_LOG_DIR`, `LLMVERIFY_AUDIT_DIR`,
`LLMVERIFY_BASELINE_DIR`, `LLMVERIFY_USAGE_FILE`) — absolute host paths
are withheld by default; `includeLocalPaths: true` adds
`localState.paths` and resolves `resultSchemaFile` (otherwise `null`).

## Error codes returned in structuredContent.error

| Code | Source | Meaning |
|---|---|---|
| `LLMVERIFY_8001` | `AuditPersistenceError` | Persistence required but status was FAILED/DISABLED/NOT_ATTEMPTED |
| `MCP_ADAPTER_TIMEOUT` | `AdapterTimeoutError` | Deadline hit while running; engine work NOT cancelled — outcome indeterminate, do not blindly retry |
| `MCP_ADAPTER_QUEUE_EXPIRED` | `QueueExpiredError` | Deadline hit while queued; the call NEVER ran — no quota, no audit; safe to retry |
| `MCP_ADAPTER_QUEUE_FULL` | `ExecutionQueueError` | Serialized lane at capacity (`LLMVERIFY_MCP_MAX_QUEUE_DEPTH`) — retry later |
| `MCP_ADAPTER_OUTPUT_TOO_LARGE` | `OutputSizeError` | Result exceeded `LLMVERIFY_MCP_MAX_OUTPUT_BYTES` even after honest degradation |
| `MCP_ADAPTER_CONTRACT_VIOLATION` | adapter | Engine output failed `validateVerifyResult` |
| `MCP_ADAPTER_INTERNAL` | adapter | Unexpected error |
| engine error codes | llmverify | e.g. `USAGE_LIMIT_EXCEEDED`, `INVALID_INPUT`, `CONTENT_TOO_LARGE` — passed through with their code |
