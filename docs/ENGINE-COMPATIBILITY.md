# Engine Compatibility

## Published engine dependency

| Property | Value |
|---|---|
| Engine package | `llmverify@1.7.0` (npm registry) |
| Source | `subodhkc/llmverify-npm`, PR #21 `fix/llmverify-contract-audit-hardening` |
| Dependency declaration | `"llmverify": "^1.7.0"` — resolves the hardened published artifact; the published `1.6.1` predates the hardened contract and must not be resolved. The `^` range is safe: the hardened API landed as a MINOR (additive, backward-compatible) bump, and `validateVerifyResult` below fails loudly if an incompatible result ever arrives |

The hardened functionality this adapter requires (observable audit
persistence, fail-closed `requirePersistence`, versioned result schema,
`validateVerifyResult`, capability discovery, env-configurable state
paths, atomic state writes) first became available in `llmverify@1.7.0`.
Earlier development used a vendored pre-release tarball; it was removed
once `1.7.0` was published.

## Public API surface consumed

Package-root exports only:

- `verify(options)`, `VerifyOptions`, `VerifyResult`
- `validateVerifyResult`, `getVerifyResultSchemaPath`,
  `RESULT_SCHEMA_VERSION`
- `getEngineCapabilities`, `getPackageInfo`
- `getLLMVerifyHome`, `getLogDir`, `getAuditDir`, `getBaselineDir`,
  `getUsageFile`
- `HallucinationEngine`, `DEFAULT_CONFIG`, `VERSION`,
  `getHallucinationLabel`, `HallucinationLabel`
- `checkPromptInjection`, `getInjectionRiskScore`, `isInputSafe`
- `checkPII`, `containsPII`, `getPIIRiskScore`, `redactPII`
- Typed errors: `AuditPersistenceError` (`LLMVERIFY_8001`), `LLMVerifyError` hierarchy

`VerifyOptions` fields used: `content`, `config.engines.csm6.profile`,
`context.isJSON`, `context.expectedSchema`, `context.skipEngines`,
`audit.requirePersistence`. Tier stays at the engine default (`free`) —
it is deliberately NOT exposed as a tool input.

## Result contract

- Engine result schema: `"1.0"` (`RESULT_SCHEMA_VERSION`,
  `schema/verify-result.schema.json` shipped in the engine package).
- Adapter output contract: `1.0` (`adapter.contractVersion`) — separate
  version domain; adapter envelopes may evolve independently.
- `enginesNotChecked` uses the ENGINE's engine-id vocabulary: note it
  reports the JSON validator as `json` (not `jsonValidator`) in
  `notChecked`/`meta.enginesUsed` — this is engine semantics, preserved
  verbatim.

## Public ↔ engine identifier mapping

The adapter's public `skipEngines` vocabulary is stable and descriptive;
the adapter translates it to the engine's internal ids before calling
`verify()` (`PUBLIC_TO_ENGINE_ID` in `src/adapters/llmverify.ts`):

| Public MCP id | Engine `skipEngines` id |
|---|---|
| `hallucination` | `hallucination` |
| `consistency` | `consistency` |
| `jsonValidator` | `json` |
| `csm6` | `csm6` |

Unknown ids are rejected at input validation (zod enum). Output fields
(`enginesExecuted`, `enginesNotChecked`) always report the engine's own
names — the public alias never leaks into engine-derived output.

## PII finding contract

Engine PII findings carry `metadata.piiType` (pattern name, e.g.
`EMAIL`, `PHONE_US`, `SSN`) and `metadata.piiCategory`
(`personal`/`financial`/`credential`/`location`/`health`). The adapter's
`piiTypes` output is deduplicated `metadata.piiType` — verified against
engine source (`csm6/security/pii-detection.ts`). Findings with missing
or unexpected metadata contribute to `findingsCount` but no type.

## Risk-label semantics (two distinct vocabularies)

- `verify()` → `risk.level`: `low | moderate | high | critical`
  (thresholds 0.25 / 0.50 / 0.75; critical CSM6 findings can force
  `critical`).
- `HallucinationEngine.detect()` → `riskScore` + exported
  `getHallucinationLabel(score)`: `low | medium | high`
  (thresholds 0.3 / 0.6). The adapter exposes this as `riskLabel` —
  the engine's own mapping, NOT re-derived from the four-band model.

## Node compatibility

- Adapter: `engines.node >= 22` (tested on Node 24.11.1).
- Engine: `engines.node >= 18`; validated by its CI on 18/20/22/24.
- The adapter is ESM (`"type": "module"`); the engine is CJS — imports
  go through Node's CJS/ESM interop, verified by the e2e suite.
