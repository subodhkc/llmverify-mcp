# Engine Compatibility

## Pinned engine version used for development and testing

| Property | Value |
|---|---|
| Engine package | `llmverify@1.6.1` (pre-release build — NOT the npm registry artifact) |
| Source | `subodhkc/llmverify-npm`, PR #21 `fix/llmverify-contract-audit-hardening` |
| **Tested commit** | `758c002aeb4668b42e41dc3bf397c952b8d2c2f6` |
| Tarball | `vendor/llmverify-1.6.1-758c002.tgz` (built with `npm run build && npm pack` on that commit; sha256 in `vendor/PROVENANCE.md`) |
| Dependency declaration | `"llmverify": "file:vendor/llmverify-1.6.1-758c002.tgz"` + `"bundleDependencies": ["llmverify"]` — the `file:` spec serves `npm ci`/checkouts; the bundle serves packed-tarball installs (npm cannot resolve a nested `file:` tgz mid-extraction). A missing bundle fails loudly — no silent fallback to published `1.6.1` |

## Why the tarball is vendored

PR #21's hardened functionality (observable audit persistence,
fail-closed `requirePersistence`, versioned result schema,
`validateVerifyResult`, capability discovery, env-configurable state
paths, atomic state writes) is **not yet published to npm**. The
published `llmverify@1.6.1` predates it. The vendored tarball makes this
repository independently buildable and testable against the exact
reviewed commit — no git submodule, no registry assumption.

## Before publishing this adapter

When a `llmverify` release containing the PR #21 contract lands on npm:

1. Verify the published version includes the hardened API
   (`validateVerifyResult`, `RESULT_SCHEMA_VERSION`, audit receipts).
2. Replace the `file:vendor/...` dependency with that semver range.
3. Re-run `npm ci && npm test` and update this document + the handoff.

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
  `schema/verify-result.schema.json` shipped in the engine tarball).
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
