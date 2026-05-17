<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# release-readiness.md

This page records release-readiness checks for the governed execution substrate.

## Implemented release checks

- `npm run verify:release` aggregates changelog hygiene, core substrate checks, typecheck, lint, and chaos verification.
- `npm run verify:core` includes execution lifecycle substrate tests through `verify:execution-lifecycle`.
- `npm run verify:chaos` includes degraded-state chaos tests and lifecycle chaos assertions.
- `git diff --check` remains required before submission.

## Execution lifecycle readiness

Implemented:

- deterministic execution plan, queue, lease, receipt, replay, proofpack, and diagnostics contracts
- explicit fail-closed illegal transition handling
- stale ownership, duplicate lease, split-brain, replay drift, receipt drift, trust drift, degraded state drift, cancellation-safe replay, hidden recovery, and hidden retry coverage
- deterministic proofpack integrity validation

Deferred:

- durable storage adapters for lifecycle records
- operator UI rendering for lifecycle proofpacks

Intentionally not implemented:

- autonomous orchestration
- daemon schedulers
- hidden retries
- speculative execution
- automatic policy learning
- GPU balancing
- Dynamo integration
- automatic remote execution enablement
