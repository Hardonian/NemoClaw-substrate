<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architectural Decision Records (ADRs)

These records document the critical architectural decisions made during the development of the NemoClaw substrate.

## Active ADRs

- **[ADR-0001: Anti-Theatre Governance](0001-anti-theatre-governance.md):** Decoupling orchestration from autonomous "magic".
- **[ADR-0002: Execution Lifecycle Substrate](0002-execution-lifecycle-substrate.md):** Designing the state-machine for governed execution.
- **[ADR-0003: Heterogeneous Routing](0003-heterogeneous-routing.md):** Local vs Remote provider dispatch.
- **[ADR-0004: Policy Promotion Engine](0004-policy-promotion-engine.md):** Designing supervised policy updates.
- **[ADR-0005: Replay & Truth Boundaries](0005-replay-and-truth-boundaries.md):** Ensuring receipts are auditable.
- **[ADR-0006: Trust & Attestation Seams](0006-trust-and-attestation-seams.md):** Mapping worker trust to structural separation.
- **[ADR-0007: Declarative-Only Policy](0007-declarative-only-policy.md):** Why we reject "Policy Learning" in the control plane.

## Process

NemoClaw ADRs follow a strict truth-grounding process. Decisions are only moved to "Accepted" once the structural implications are verified in the substrate core.
