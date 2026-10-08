# Changelog

## [0.1.0] - 2026-10-08

Initial implementation.

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
