# 01 — Change Plan for llmverify 1.6.0

This document describes the planned changes, rationale, and verification steps for the 1.6.0 release.

## Goals

- Remove install-time stdout noise.
- Increase the free tier to a practical daily allowance.
- Stabilize the result and error contracts.
- Modernize Node support and build tooling.
- Improve package honesty and metadata.

## Major Changes

| Area | Change | Rationale |
|------|--------|-----------|
| Version | 1.5.2 → 1.6.0 | Semver minor bump for new features and behavioral changes. |
| Free tier | 500 → 2000 calls/day | Better developer experience for real-world usage. |
| Postinstall | Removed | Prevents unwanted stdout and improves install safety. |
| Result schema | Added `schemaVersion: "1.0"` | Lets consumers detect and trust the result shape. |
| Dependencies | `uuid` updated to 11.1.1 | Resolves known vulnerability. |
| Workflows | Consolidated to one publish workflow | Reduces duplication and accidental publishes. |
| CI matrix | Added Node 24 | Verifies modern Node support. |
| TypeScript | `moduleResolution: node16` | Resolves deprecation warnings. |

## Verification

- All 606 existing tests pass.
- New tests added for stdio safety, 2,000/day usage limits, and zero-network behavior.
- Package publishes cleanly to npm.
