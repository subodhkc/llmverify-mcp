# LLMVerify MCP — Release Readiness (Task 03B)

Contract & release hardening pass on `feat/initial-mcp-server`.
Scope: fix verified integration defects, tighten output/timeout
correctness, validate packaging. No tools removed; the MCP SDK v2
architecture is preserved; no `llmverify-npm` changes were required.

## Defects identified → root cause → fix

### 1. `skipEngines: ['jsonValidator']` never skipped the JSON engine (P0)

**Root cause.** The public tool vocabulary used `jsonValidator`, but
the engine's `verify()` only honors `context.skipEngines` entries
matching its internal ids (`'hallucination'`, `'consistency'`,
`'json'`, `'csm6'`). The value passed through unmapped, so the JSON
engine kept running. The prior integration test was masked: without
`isJSON: true` the JSON engine reports `notChecked` anyway, so the
assertion passed even though the skip was a no-op.

**Fix.** `PUBLIC_TO_ENGINE_ID` map in `src/adapters/llmverify.ts`
translates public ids → engine ids at the adapter boundary. Public ids
remain stable; `notChecked`/`enginesExecuted` keep reporting the
engine's own names (`json`); unknown ids still rejected by the zod
enum. No silent renaming of other ids.

**Before/after.** Before: `isJSON:true` + valid JSON +
`skipEngines:['jsonValidator']` → `engineResults.json` present, JSON
engine ran. After: `engineResults.json` absent, `enginesNotChecked`
contains `json`, `enginesExecuted` lacks it.

**Files:** `src/adapters/llmverify.ts`, `src/schemas/common.ts`
(input doc), `src/tools/verify.ts` (field doc).

### 2. `piiTypes` always empty (P0)

**Root cause.** The adapter read `finding.metadata.type`; engine PII
findings emit `metadata.piiType` (pattern name) + `metadata.piiCategory`
(`src/csm6/security/pii-detection.ts` in the engine). Detection worked —
the type labels were silently dropped.

**Fix.** `extractPiiTypes()` reads `metadata.piiType`, dedupes, and
tolerates findings with missing/unexpected metadata (they still count
in `findingsCount`). Exported for unit tests.

**Files:** `src/adapters/llmverify.ts`.

### 3. Timed-out stateful calls could silently overlap later ones (P0)

**Root cause.** `withTimeout(verify(...))` raced the caller's await
against a timer; a timeout rejection released the serialized lane even
though `verify()` was still running and mutating usage/audit/baseline
state. The next call could interleave with it.

**Fix.** New `src/security/lane.ts` (`ExecutionLane`): the lane holds
the REAL completion promise of the underlying work — the timeout only
rejects the caller's promise. The lane stays occupied until the work
actually settles, so a later stateful call can never start while an
earlier timed-out one may still write state. The queue is bounded
(`LLMVERIFY_MCP_MAX_QUEUE_DEPTH`, default 16) → `MCP_ADAPTER_QUEUE_FULL`
instead of an unbounded backlog. The timeout error message now states
plainly the work is NOT cancelled and continues to settle.

Honest limitation: the engine has no abort hook; a timed-out call
still burns CPU until it finishes. No fake cancellation, no worker
threads — a small, predictable in-process policy.

**Files:** `src/security/lane.ts` (new), `src/security/limits.ts`,
`src/adapters/llmverify.ts`, `src/errors/index.ts` (code passthrough).

### 4. No serialized-response budget (P1)

**Root cause.** Per-field/array caps bounded pieces of output but the
whole `structuredContent` payload had no ceiling; `redact_pii` returned
the full string unbounded.

**Fix.** `src/security/size.ts` measures the serialized payload against
`LLMVERIFY_MCP_MAX_OUTPUT_BYTES` (default 256 KiB). Over-budget results
degrade honestly — `verify` drops `engineResults` to
`{omittedForSize, engines}` + truncation record; `check_pii`/
`check_prompt_injection` empty `findings`/`recommendations` with
`*Omitted` counts + records; still over → `MCP_ADAPTER_OUTPUT_TOO_LARGE`
error. `redact_pii` never truncates the redacted document — an oversize
redaction returns the typed size error with no `redacted` field.
`expectedSchema` input bounded (≤64 KiB, ≤32 depth) at the zod layer.

**Files:** `src/security/size.ts` (new), `src/schemas/common.ts`,
all five tool files.

### 5. Hallucination label used copied risk thresholds (P1)

**Root cause.** The adapter mapped `riskScore` to the four-band
verify() levels with locally copied thresholds — different score type,
different semantics.

**Fix.** `riskLabel` now comes from the engine's own exported
`getHallucinationLabel()` (`low`/`medium`/`high`, thresholds 0.3/0.6).
The field is renamed `riskLevel`→`riskLabel` so the label domain is
unambiguous. No second scoring engine, no algorithm change.

**Files:** `src/adapters/llmverify.ts`, `src/tools/hallucination.ts`.

### 6. Packed-tarball install broken (P1 — discovered during gates)

**Root cause.** `"llmverify": "file:vendor/llmverify-1.6.1-758c002.tgz"`
works for git-checkout installs but **fails when the packed adapter
tarball is installed** — npm cannot resolve a nested `file:` tarball
inside an extracting package (verified: `ENOENT ... node_modules/
llmverify-mcp/vendor/llmverify-1.6.1-758c002.tgz`).

**Fix.** Keep `"llmverify": "file:vendor/llmverify-1.6.1-758c002.tgz"`
(serves `npm ci` and checkout installs; a `file:` **directory** dep was
tried and broke `npm ci` on CI's npm 10 — the tarball spec is the
proven path) and add `bundleDependencies: ["llmverify"]` — the
canonical npm mechanism that ships the resolved `node_modules/
llmverify` inside the packed artifact so consumers never resolve the
nested `file:` spec. If the bundle is absent the install fails loudly;
it cannot fall back to the older published `1.6.1`. Verified: clean
`npm install` of the packed tarball, programmatic
`import('llmverify-mcp')` returns the pure factory, and the `bin`
serves a real MCP `initialize` handshake.

**Also fixed:** `"main": "dist/index.js"` made library import hijack
stdio. `main`/`types`/`exports` now point at `dist/server.js` (the
tested, side-effect-free `createLlmverifyMcpServer` factory); `bin`
still points at `dist/index.js`.

**Files:** `package.json`, `vendor/PROVENANCE.md`, `.gitignore`
(`vendor/**/node_modules/`).

## Task 03C additions — final privacy & execution gate

### 7. `verify_llm_content` leaked raw PII (P0)

**Reproduction.** `verify()`'s CSM6 findings carry
`evidence.textSample` (engine partial-mask: keeps first/last ~4 chars)
and `evidence.context` (a raw ±30-char excerpt that contains the
matched value AND adjacent content verbatim). `boundVerifyResult()`
truncated but never redacted them, so a call like
`"Email me at alice.smith@example.com…"` returned
`context: "Email me at alice.smith@example.com or cal…"` in
`structuredContent`. Hallucination claim text, consistency
sections/contradictions, and `json.schemaErrors` also echo caller
content.

**Fix.** A shared privacy projection in `src/security/bounds.ts`
(`PrivacyScrubber`) applies the engine's own `redactPII()` to every
input-echoing field — claim text, sections, contradictions,
schemaErrors, `risk.interpretation`, `warnings`, and finding evidence.
Privacy-category findings get `textSample` hard-masked to
`[REDACTED]` (the engine's partial mask leaks a prefix/suffix). The
response reports provenance: `privacy.piiFieldsMasked` counts masked
fields. Finding ids/types/severity/confidence/counts are preserved.

**Before/after** (real MCP call, content with email+phone+SSN):
before — serialized result contained the raw email in
`csm6.findings[].evidence.context` and a partial mask leaking
`alic…com` in `textSample`. After — zero occurrences of any raw value;
`privacy.piiFieldsMasked: 6`; `audit.status: PERSISTED`; ids, types,
severities intact.

### 8. Queued requests could execute after expiring (P1)

**Issue.** `run()` chained the work promise immediately and raced the
caller against a timer — a call that timed out while still queued
would still execute later, consuming usage quota and writing audit
records after its caller saw a timeout.

**Fix.** `ExecutionLane` now tracks `started`/`expired`. A deadline
hit while queued sets `expired` — the lane slot resolves as a skipped
sentinel, the work function is never invoked, and the caller gets
`MCP_ADAPTER_QUEUE_EXPIRED` ("definite NOT-RUN, safe to retry",
`recoverable: true`). A deadline hit while running still yields
`MCP_ADAPTER_TIMEOUT` ("indeterminate — do not blindly retry"). Lane
frees queued-expired slots immediately; running work still holds the
lane until real settle.

### 9. Host-path disclosure + error-message PII (P1)

- `get_llmverify_capabilities` previously returned absolute
  `LLMVERIFY_HOME`/audit/usage paths by default. Now `localState`
  reports field slots + env-var names; `includeLocalPaths: true` is
  the documented opt-in for real paths (`resultSchemaFile` is `null`
  without it).
- `sanitizeMessage()` now runs a final engine-`redactPII` pass —
  engine error messages that echo content cannot carry PII through.

**Contract bump.** `adapter.contractVersion` → `1.1` (new `privacy`
field, `localState` shape change, new error codes). No tool names,
engine APIs, or result-schema semantics changed.



- No raw PII anywhere in the serialized `CallToolResult` — verified
  through the real MCP client path for email/phone/SSN/card content in
  both `check_pii` (masked evidence) and `redact_pii` (type+position
  metadata only).
- `evidence.context` (a raw excerpt window around each match) is masked
  alongside `textSample`.
- Error path scrubs secret-looking `key=value` pairs and token shapes;
  typed adapter errors (`MCP_ADAPTER_*`) carry stable codes.
- stdout stays protocol-only; diagnostics go to stderr.
- stdio-local, no outbound network, no shell/file-path tools — all
  unchanged and re-verified by the security suite.

## Timeout & concurrency behavior

- Caller deadline vs. execution completion are now distinct: the lane
  tracks real completion; the timeout rejects only the caller.
- A timed-out stateful call can never overlap a later one (tested).
- A timed-out call never silently becomes a successful result or audit
  receipt (tested — exactly one settlement observed).
- Queue depth bounded; excess rejected fast (tested).
- Cross-process state remains last-writer-wins — documented, unchanged.

## Input/output limits (all env-configurable, defaults)

`LLMVERIFY_MCP_MAX_INPUT_CHARS` 1M · `LLMVERIFY_MCP_TIMEOUT_MS` 60s ·
`LLMVERIFY_MCP_MAX_OUTPUT_ITEMS` 50 · `LLMVERIFY_MCP_MAX_TEXT_FIELD_CHARS`
2000 · `LLMVERIFY_MCP_MAX_OUTPUT_BYTES` 256 KiB ·
`LLMVERIFY_MCP_MAX_QUEUE_DEPTH` 16 · `expectedSchema` ≤64 KiB/depth ≤32.

## Dependency & packaging assessment

| Check | Result |
|---|---|
| Engine commit pinned | `758c002aeb4668b42e41dc3bf397c952b8d2c2f6` — verified by `npm pack --dry-run` integrity match |
| Tarball sha256 | `465c4be5612eab06cff10b2160f046fe65d27fb0ad37e4a5a8649825b7a15034` (recorded in `vendor/PROVENANCE.md`) |
| `npm ci` (repo) | clean, 514 pkgs |
| `npm pack` | 2.3 MB, 1580 files, bundled `llmverify` tree |
| Packed-tarball clean install | PASS (was broken pre-fix) |
| `import 'llmverify-mcp'` | returns pure `createLlmverifyMcpServer`, no side effects |
| `bin` executable | serves MCP `initialize` over stdio |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (all) | 34 dev-side advisories — vendored engine's jest/babel/sprintf-js dev-deps; not in runtime path or packed artifact; pre-existing upstream |

## Tests & CI evidence

Node 24.11.1 local + Node 22 CI: typecheck, lint, build, **75/75 tests
(11 files)** — incl. real-stdio e2e, fail-closed audit persistence,
lane semantics (running-timeout vs queue-expiry), skip-mapping, PII
privacy through serialization in both `check_pii`/`redact_pii` AND
`verify_llm_content`, output-size honesty, capabilities path
withholding. Packed-artifact smoke: clean install, side-effect-free
import, real `initialize`/`tools/list`/`tools/call` handshake, zero PII
in the serialized verify response. All required gates re-run; no test
removed or weakened.

## Remaining limitations

- Engine has no cancellation — timed-out *running* work completes in
  the lane (queued work that expires never runs).
- Cross-process `LLMVERIFY_HOME` updates remain last-writer-wins.
- The privacy projection relies on the engine's pattern set — PII in
  formats `redactPII` does not detect still passes through
  input-echoing fields. Heuristic masking is not exhaustive.
- Bundled engine adds its runtime dep tree (~80 pkgs, incl. deprecated
  `glob`/`inflight` transitives) to the packed artifact — an accepted
  pre-release trade-off; the runtime audit surface stays clean.
- `assess_hallucination_risk` `riskLabel` rename (→ engine's own label
  domain) and `localState`/`privacy` contract changes are pre-release
  bumps — adapter contract versioned `1.1` accordingly.

## Release blockers (explicit)

1. **Engine dependency must resolve to a published hardened release.**
   Before any npm publish of `llmverify-mcp`: publish `llmverify`
   containing PR #21's contract, then replace `file:vendor/llmverify` +
   `bundleDependencies` with the semver range and drop `vendor/`.
   Publishing as-is would ship a vendored, unreleased engine — blocked
   per task instructions.
2. Repository is private — visibility change only on instruction.
3. Node support floor is `>=22` (adapter); engine supports 18+ — a
   publish decision could widen CI to 18/20 if desired.

No merge, publish, deployment, or visibility change was performed.
