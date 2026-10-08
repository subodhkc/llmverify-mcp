# Vendored engine provenance

`llmverify-1.6.1-758c002.tgz`

- Built from `subodhkc/llmverify-npm` branch
  `fix/llmverify-contract-audit-hardening`
- Commit: `758c002aeb4668b42e41dc3bf397c952b8d2c2f6` (PR #21 head)
- Build: `npm ci && npm run build && npm pack` (Node 24.11.1, Windows)
- npm-pack integrity: `sha512-T1Bh6Ld+44C8w...PhPG7JoTsMM4Q==`
  (see original `npm pack` output in PR discussion)

This tarball replaces the registry `llmverify@1.6.1` because the
hardened APIs this adapter depends on (audit persistence receipts,
`validateVerifyResult`, capability discovery, env-configurable state
paths) are not yet published. See `docs/ENGINE-COMPATIBILITY.md`.
