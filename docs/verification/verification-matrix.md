<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verification Matrix

| Area | Command | What it proves |
|---|---|---|
| Release gate | `npm run verify:release` | Changelog hygiene, core checks, typecheck, lint, and chaos coverage all pass in sequence. |
| Core checks | `npm run verify:core` | Control-plane, lifecycle, probe, and routing suites run with explicit pass/warn/fail reporting. |
| Lifecycle records | `npm run verify:execution-lifecycle` | Plans, queue records, leases, receipts, proofpacks, replay checks, and diagnostics reject invalid states. |
| Chaos/negative paths | `npm run verify:chaos` | Policy denial, approval-required, stale worker, replay tampering, and missing reason-code paths are blocked. |
| Remote probes/trust | `npm run verify:remote-probes` | Remote probe contracts and worker trust states surface degraded/unavailable facts. |
| Governed routing | `npm run verify:governed-routing` | Routing remains opt-in and policy-gated. |
| Proofpack script | `npm run verify:proofpack` | A proofpack is verified when present; absence is reported as an explicit skip. |
| Export scan | `npm run verify:export` | Source and policy files are scanned for hardcoded secrets and unsafe egress patterns. |
| Docs build | `npm run docs:strict` | Sphinx documentation builds without warnings when the docs toolchain is available. |
| Diff hygiene | `git diff --check` | No whitespace errors in the patch. |

The evidence for individual claims lives in [Evidence index](../review/evidence-index.md).
