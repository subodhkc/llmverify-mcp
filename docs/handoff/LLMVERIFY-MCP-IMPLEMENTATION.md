# LLMVerify MCP — Implementation Handoff

## Summary

Standalone, local-first MCP server exposing the `llmverify` engine's
public API as six read-mostly tools over stdio. No verification logic is
implemented in this repository — the adapter wraps the engine's
supported package exports only.

## Dependency boundaries

- Engine consumed as vendored npm tarball
  `vendor/llmverify-1.6.1-758c002.tgz`, declared `file:` +
  `bundleDependencies: ["llmverify"]` — the `file:` spec serves
  `npm ci`/checkout installs; the bundle serves packed-tarball installs
  (a nested `file:` tgz cannot resolve mid-extraction — see
  release-readiness doc §Dependency & packaging).
- Adapter code imports ONLY `from 'llmverify'` (package root). No
  `dist/` internals, no copied engine source.
- MCP SDK: `@modelcontextprotocol/server@^2.3.1` (stable **v2** line,
  2026-07-28 protocol spec) + `zod@^4` (Standard Schema). Tests use
  `@modelcontextprotocol/client@^2.3.1`.
- Engine commit tested: **`758c002aeb4668b42e41dc3bf397c952b8d2c2f6`**
  (PR #21 head; CI green on Node 18/20/22/24 at that commit).

## Architecture (see docs/ARCHITECTURE.md)

- `src/index.ts` — stdio entry; stdout reserved for protocol frames
  (console.* rerouted to stderr).
- `src/server.ts` — `McpServer` factory.
- `src/tools/` — one file per tool with zod v4 input/output schemas and
  accurate annotations.
- `src/adapters/llmverify.ts` — engine facade + public↔engine id
  mapping (`jsonValidator`→`json`).
- `src/security/` — input limits, output bounding, PII masking,
  `lane.ts` (serialized execution lane; timeout races the CALLER's
  promise only — the lane holds real work completion so a timed-out
  stateful call can never overlap a later one; bounded depth →
  `MCP_ADAPTER_QUEUE_FULL`), `size.ts` (serialized `structuredContent`
  byte budget → `MCP_ADAPTER_OUTPUT_TOO_LARGE`).
- `src/errors/` — typed-error normalization with secret scrubbing.

## Tool contracts

See `docs/MCP-TOOLS.md`. Implemented: `verify_llm_content`,
`assess_hallucination_risk`, `check_prompt_injection`, `check_pii`,
`redact_pii`, `get_llmverify_capabilities`.

Key semantics preserved: `enginesNotChecked` is never presented as
success; `audit.status` reports actual persistence (PERSISTED/DISABLED/
FAILED/NOT_ATTEMPTED); `requireAuditPersistence: true` fails closed via
typed `AuditPersistenceError` (`LLMVERIFY_8001`) unless the record is
`PERSISTED`; risk scores are labeled heuristic signals, not verdicts;
PII raw values are masked; `verify()` results are re-validated with
`validateVerifyResult` before exposure; all output arrays are bounded
with explicit `truncations` metadata.

## Schema versions

- Engine result schema: `"1.0"` (llmverify `RESULT_SCHEMA_VERSION`)
- Adapter structured-content contract: `1.0` (`adapter.contractVersion`)
- MCP protocol: negotiated by SDK v2 (latest + legacy 2025-era
  compatibility handled by the SDK)

## Privacy

Local-only; zero network in default path; no adapter file writes; PII
values masked; error messages secret-scrubbed; audit digests disclosed
as tamper-evidence, not signatures. Engine local state honored via
`LLMVERIFY_HOME` + per-directory env overrides (see README table).

## Concurrency

`verify_llm_content` calls are serialized in-process (engine state
writes are atomic but not cross-process coordinated). Multi-process
lost-update limitation documented in docs/SECURITY.md — no locks added.

## Test results (Node 24.11.1, Windows — Task 03B updated)

- `npm ci` — clean; **`npm audit --omit=dev`: 0 vulnerabilities**
  (34 dev-side advisories via the vendored engine's own dev-dependency
  tree — jest/babel/istanbul/sprintf-js — none in the runtime path or
  the packed artifact)
- `npm run typecheck` — clean
- `npm run lint` (eslint 10 flat config) — clean
- `npm test` — **65/65 tests, 10/10 files**:
  - `tests/unit` — tool registration, schema contracts, capabilities
  - `tests/integration` — verify paths, skipEngines→notChecked, isJSON
    gating, profile, audit PERSISTED with on-disk `sha256:` entry digest,
    fail-closed evidence-required mode (LLMVERIFY_8001), developer-mode
    FAILED receipt, burst concurrency + usage counter integrity,
    hallucination/injection/PII/redact semantics
  - `tests/security` — injection payloads can't alter the server,
    serialized-JS-as-content, oversized/empty input rejection, schema
    rejection, truncation metadata, path-as-content handling
  - `tests/e2e` — real `StdioClientTransport` ↔ spawned
    `node dist/index.js`: protocol negotiation, tool listing, all six
    tool calls, error path + session survival, stdout purity
  - `tests/unit/lane.test.ts` — ExecutionLane: serialization, timeout
    semantics (caller rejects, lane holds real work until settle,
    second call cannot overlap), rejection propagation, bounded queue
    (`MCP_ADAPTER_QUEUE_FULL`), repeated timeouts, timed-out calls
    never silently resolving as success
  - `tests/integration/skip-engines.test.ts` — `jsonValidator`→`json`
    mapping with `isJSON:true` + valid/invalid JSON, multi-skip,
    public alias never leaks into `notChecked`, unknown-id rejection
  - `tests/integration/pii-privacy.test.ts` — `piiTypes` from real
    `metadata.piiType` (email/phone/SSN/multi/dupes/none), malformed-
    metadata tolerance, no raw PII anywhere in serialized
    `CallToolResult`, redact metadata is type+position only
  - `tests/integration/output-limits.test.ts` — serialized budget:
    honest `engineResults` degradation, `MCP_ADAPTER_OUTPUT_TOO_LARGE`,
    redacted document never truncated, `expectedSchema` byte+depth caps
- `npm pack` → clean packed-tarball install verified in isolated dir
  (`bundleDependencies` carries `llmverify`); `import('llmverify-mcp')`
  returns the pure `createLlmverifyMcpServer` factory with no side
  effects; `bin` serves a real MCP `initialize` handshake over stdio
- GitHub CI: single Node 22 job (install + typecheck + lint + build +
  tests + pack dry-run)

## Known limitations

- Timeout bounds the caller's wait, not engine work — the engine has
  no cancellation hook. The lane guarantees no overlap but a timed-out
  call still consumes CPU until it settles. Documented in
  docs/SECURITY.md §Timeout & cancellation semantics.
- Multi-process usage/baseline updates are last-writer-wins (no locks).
- `assess_hallucination_risk` `riskLabel` uses the engine's own
  `getHallucinationLabel` (low/medium/high) — distinct vocabulary from
  verify()'s four-band `risk.level`; preserved, not remapped.
- Engine `notChecked` uses `json` (not `jsonValidator`) — preserved
  verbatim as engine semantics; the public alias maps at the boundary.
- `verify_llm_content` output schema changed vs 0.1.0-pre: none
  breaking (added fields only); `assess_hallucination_risk` renamed
  `riskLevel`→`riskLabel` with the engine's own label domain —
  acceptable pre-release change, documented in docs/MCP-TOOLS.md.
- Registry consumers still can't install until a hardened engine ships
  (packed install works via the bundle).

## Remaining integration gaps / next steps

- Swap `file:vendor/llmverify` + `bundleDependencies` for a semver
  range once the hardened engine ships (see
  docs/ENGINE-COMPATIBILITY.md).
- Optional: `classify_output` tool (engine `classify`/`detectIntent`) —
  deliberately deferred; current set covers the required surface.
- Remote/hosted transport is an explicitly separate future task.
