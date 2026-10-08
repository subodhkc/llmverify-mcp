# MCP Tools

All tools return `structuredContent` (the machine contract, validated by
the tool's registered output schema) plus a bounded human-readable text
summary. Adapter contract version: `1.0` (`adapter.contractVersion`).

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
| `skipEngines` | enum[] | no | Any of `hallucination`, `consistency`, `jsonValidator`, `csm6` |
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
| `engineResults` | Bounded pass-through: `hallucination`, `consistency`, `json`, `csm6` |
| `warnings` | Engine warnings (e.g. usage-limit proximity) |

## assess_hallucination_risk

Hallucination-risk signals only, via `HallucinationEngine`. Read-only —
no state writes. **Input:** `content`.

**Output:** `riskScore`, `riskLevel` (engine thresholds: ≥0.75 critical,
≥0.5 high, ≥0.25 moderate), `riskIndicators`, `suspiciousClaims`
(bounded), `claimsEvaluated`, `confidence`, `methodology`, `limitations`,
`evaluation: "COMPLETED"`.

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

## get_llmverify_capabilities

Capability discovery via `getEngineCapabilities()` + `getPackageInfo()`.
Read-only. **Input:** none.

**Output:** engine identity + `resultSchemaVersion`, `capabilities`
(each with `observes` / `doesNotEstablish` / `networkAccess` /
`persistsContent` / `entrypoints`), `package` info, adapter `limits`,
`localState` paths, `resultSchemaFile`.

## Error codes returned in structuredContent.error

| Code | Source | Meaning |
|---|---|---|
| `LLMVERIFY_8001` | `AuditPersistenceError` | Persistence required but status was FAILED/DISABLED/NOT_ATTEMPTED |
| `MCP_ADAPTER_TIMEOUT` | adapter | Tool exceeded `LLMVERIFY_MCP_TIMEOUT_MS` |
| `MCP_ADAPTER_CONTRACT_VIOLATION` | adapter | Engine output failed `validateVerifyResult` |
| `MCP_ADAPTER_INTERNAL` | adapter | Unexpected error |
| engine error codes | llmverify | e.g. `USAGE_LIMIT_EXCEEDED`, `INVALID_INPUT`, `CONTENT_TOO_LARGE` — passed through with their code |
