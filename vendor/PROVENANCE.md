# Vendored engine provenance

`vendor/llmverify/` — the **extracted** engine package, bundled into
this package's published artifact via `bundleDependencies` (see
package.json). The dependency spec is `file:vendor/llmverify`; if the
bundle is ever missing the install fails loudly — npm can never fall
back to the older published `llmverify@1.6.1` silently.

- Built from `subodhkc/llmverify-npm` branch
  `fix/llmverify-contract-audit-hardening`
- Commit: `758c002aeb4668b42e41dc3bf397c952b8d2c2f6` (PR #21 head)
- Build: `npm ci && npm run build && npm pack` (Node 24.11.1, Windows),
  then extracted into `vendor/llmverify/`
- Source tarball `llmverify-1.6.1-758c002.tgz` sha256:
  `465c4be5612eab06cff10b2160f046fe65d27fb0ad37e4a5a8649825b7a15034`
- npm-pack integrity of that tarball: `sha512-T1Bh6Ld+44C8w...PhPG7JoTsMM4Q==`
- Verified: `npm pack --dry-run` at commit `758c002` reproduces the
  identical npm integrity hash (Task 03B re-verification).

This tarball replaces the registry `llmverify@1.6.1` because the
hardened APIs this adapter depends on (audit persistence receipts,
`validateVerifyResult`, capability discovery, env-configurable state
paths) are not yet published. See `docs/ENGINE-COMPATIBILITY.md`.
