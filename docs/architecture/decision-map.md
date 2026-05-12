<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Decision Map

This map is the shortest path through the architecture. It links each major decision to the implementation surface that proves it exists today.

| Decision | Status | Implementation | Verification | ADR |
|---|---|---|---|---|
| Keep control decisions separate from execution adapters. | Implemented for the local control-plane helpers and guarded adapters | `src/lib/control-plane/`, `src/lib/control-plane/runtime-dispatch-integration.ts` | `npm run verify:control-plane` | [ADR 0002](../adr/0002-execution-lifecycle-substrate.md) |
| Represent lifecycle state with explicit plans, queue items, leases, receipts, diagnostics, and proofpacks. | Implemented as in-process records | `src/lib/control-plane/execution-lifecycle.ts` | `npm run verify:execution-lifecycle` | [ADR 0002](../adr/0002-execution-lifecycle-substrate.md), [ADR 0005](../adr/0005-replay-and-truth-boundaries.md) |
| Reject replay drift instead of repairing it silently. | Implemented | `src/lib/control-plane/replay.ts`, `src/lib/control-plane/execution-lifecycle.ts` | `npm run verify:chaos` | [ADR 0005](../adr/0005-replay-and-truth-boundaries.md) |
| Keep remote execution opt-in and policy-gated. | Implemented at adapter boundary | `src/lib/control-plane/remote-execution.ts`, `src/lib/security/security-policy.ts` | `npm run verify:remote-probes`, `npm run verify:chaos` | [ADR 0006](../adr/0006-trust-and-attestation-seams.md) |
| Treat telemetry as evidence, not routing authority. | Implemented in probe/registry handling | `src/lib/control-plane/local-runtime-probes.ts`, `src/lib/control-plane/worker-probes.ts` | `npm run verify:local-probes`, `npm run verify:remote-probes` | [ADR 0003](../adr/0003-heterogeneous-routing.md) |
| Keep policy in code/config, not prompts. | Implemented for policy evaluation and traces | `src/lib/control-plane/policy-engine.ts`, `src/lib/control-plane/governance.ts` | `npm run verify:core` | [ADR 0007](../adr/0007-declarative-only-policy.md) |
| Generate policy recommendations without mutating policy automatically. | Implemented as proposal generation only | `src/lib/control-plane/policy-promotion.ts` | `npm run verify:core` | [ADR 0004](../adr/0004-policy-promotion-engine.md) |

## Architecture In One Paragraph

The CLI and OpenShell workflow remain the outer product surface. The fork adds control-plane modules under `src/lib/control-plane/` that create inspectable records before and around execution. Policy, trust, telemetry, and replay checks produce evidence and reason codes. Remote execution and heterogeneous routing stay behind explicit flags and tests assert the blocked paths.
