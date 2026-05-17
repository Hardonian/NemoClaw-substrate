<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architectural Decision Records

These ADRs document the current fork-level decisions. They should point to implementation and verification when a decision is accepted. Future-state ideas belong in the roadmap until code and tests exist.

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-anti-theatre-governance.md) | Accepted | Keep proof and explicit degraded states ahead of autonomous behavior. |
| [0002](0002-execution-lifecycle-substrate.md) | Accepted | Model execution as explicit lifecycle records before adding orchestration. |
| [0003](0003-heterogeneous-routing.md) | Accepted, opt-in scope | Gate heterogeneous routing behind explicit flags and deterministic policy checks. |
| [0004](0004-policy-promotion-engine.md) | Accepted, recommendation-only scope | Generate policy-change proposals without mutating policy automatically. |
| [0005](0005-replay-and-truth-boundaries.md) | Accepted | Reject replay drift and missing evidence instead of repairing history. |
| [0006](0006-trust-and-attestation-seams.md) | Accepted, structural scope | Keep worker trust and attestation explicit before remote execution. |
| [0007](0007-declarative-only-policy.md) | Accepted | Keep enforceable policy in code/config, not prompts. |

For a concise implementation map, see [Architecture decision map](../architecture/decision-map.md).
