<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# verification-matrix.md

This matrix maps governed substrate claims to implemented verification commands. It separates implemented checks from deferred or intentionally not implemented areas.

| Area | Status | Verification | Evidence |
|---|---|---|---|
| execution lifecycle state machine | implemented | `npm run verify:execution-lifecycle` | legal/illegal transition tests |
| execution planning contracts | implemented | `npm run verify:execution-lifecycle`, `npm run typecheck` | `ExecutionPlan*` contracts and validation |
| queue topology | implemented | `npm run verify:execution-lifecycle` | queue ordering, replay lineage, expired queue detection |
| lease governance | implemented | `npm run verify:execution-lifecycle`, `npm run verify:chaos` | split-brain, duplicate lease, stale owner, revocation tests |
| replay/idempotency safety | implemented | `npm run verify:execution-lifecycle`, `npm run verify:core` | lineage drift, degraded state drift, idempotency conflict tests |
| proofpack generation and validation | implemented | `npm run verify:execution-lifecycle` | manifest digest, package digest, hidden recovery/retry tests |
| diagnostics truth states | implemented | `npm run verify:execution-lifecycle`, `npm run verify:chaos` | observed/unavailable/degraded/stale/conflicted/blocked assertions |
| operational event taxonomy | implemented | `npm run verify:execution-lifecycle` | lifecycle event aggregation tests |
| hidden recovery/retry detection | implemented | `npm run verify:execution-lifecycle`, `npm run verify:chaos` | anti-theatre proofpack assertions |
| network policy enforcement | implemented | `npm run verify:core` | egress blocking, operator approval flows |
| secret redaction integrity | implemented | `npm run verify:core` | credential sanitization, mask leakage tests |
| transport security (HTTPS/TLS) | implemented | `npm run verify:core` | secure transport enforcement |
| remote execution adapters | scaffolded | `npm run verify:remote-probes` | remote capability probes, degraded state reporting |
| durable queue storage | deferred | n/a | callers must persist returned records |
| operator UI for lifecycle proofpacks | deferred | n/a | contracts only |
| autonomous orchestration, daemon polling, automatic retries | intentionally not implemented | n/a | non-goal docs and tests assert explicit failures |

Release gate commands:

- `npm run verify:release`
- `npm run verify:core`
- `npm run verify:chaos`
- `npm run typecheck`
- `npm run lint`
- `npm run verify:changelog-hygiene`
- full relevant Vitest suites for touched files
- `git diff --check`
