# Engine Compatibility

## Pinned engine version used for development and testing

| Property | Value |
|---|---|
| Engine package | `llmverify@1.6.1` (pre-release build — NOT the npm registry artifact) |
| Source | `subodhkc/llmverify-npm`, PR #21 `fix/llmverify-contract-audit-hardening` |
| **Tested commit** | `758c002aeb4668b42e41dc3bf397c952b8d2c2f6` |
| Tarball | `vendor/llmverify-1.6.1-758c002.tgz` (built with `npm run build && npm pack` on that commit) |
| Dependency declaration | `"llmverify": "file:vendor/llmverify-1.6.1-758c002.tgz"` |

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
- `HallucinationEngine`, `DEFAULT_CONFIG`, `VERSION`
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

## Node compatibility

- Adapter: `engines.node >= 22` (tested on Node 24.11.1).
- Engine: `engines.node >= 18`; validated by its CI on 18/20/22/24.
- The adapter is ESM (`"type": "module"`); the engine is CJS — imports
  go through Node's CJS/ESM interop, verified by the e2e suite.
