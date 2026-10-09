# Changelog

## [1.0.0] - 2026-10-09

First public release.

### Changed

- Engine dependency moved from the vendored pre-release tarball
  (`file:vendor/llmverify-1.6.1-758c002.tgz` + `bundleDependencies`) to the
  published npm package `llmverify@^1.7.0`, which ships the hardened
  contract this adapter requires (observable audit persistence,
  `validateVerifyResult`, versioned result schema).

### Removed

- `vendor/` directory and `bundleDependencies` — no longer needed now
  that the hardened engine is on the registry.

## [0.1.0] - 2026-10-08

Initial implementation (private, unreleased).

### Added

- MCP stdio server (`@modelcontextprotocol/server` v2) exposing the
  `llmverify` engine via six tools:
  `verify_llm_content`, `assess_hallucination_risk`,
  `check_prompt_injection`, `check_pii`, `redact_pii`,
  `get_llmverify_capabilities`.
- Serialized in-process lane for stateful `verify()` calls; bounded
  output arrays with explicit truncation metadata; PII value masking;
  sanitized typed-error mapping; stdout protocol-channel protection.
- Vendored engine dependency pinned to llmverify-npm PR #21 commit
  `758c002` (hardened audit persistence + contract alignment, pre-release).
- Test suite: unit + integration + security + real-stdio e2e (36 tests).
- Docs: ARCHITECTURE, SECURITY, MCP-TOOLS, ENGINE-COMPATIBILITY,
  implementation handoff, install/config examples.
