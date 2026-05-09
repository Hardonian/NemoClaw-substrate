<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architectural Decision Records

This index tracks the foundational architectural decisions for the NemoClaw governed execution substrate.

| ID | Title | Status | Related Runtime Area | Related Verification |
|---|---|---|---|---|
| [0001](0001-fork-purpose.md) | Fork Purpose | Proposed | Global / Governance | Roadmap / Architecture |
| [0002](0002-control-plane-separation.md) | Control Plane Separation | Proposed | Control Plane | Control decision tests |
| [0003](0003-deterministic-routing.md) | Deterministic Routing | Proposed | Scheduler / Routing | Property tests / Receipt assertions |
| [0004](0004-supervised-policy-promotion.md) | Supervised Policy Promotion | Proposed | Operational Memory / Policy | Promotion workflows |
| [0005](0005-receipts-and-degraded-state-truth.md) | Receipts And Degraded-State Truth | Proposed | Evidence / Export | Control-path tests |
| [0006](0006-device-registry-before-scheduler.md) | Device Registry Before Scheduler | Proposed | Device Registry | Registry schema/integrity checks |
| [0007](0007-policy-outside-prompts.md) | Policy Outside Prompts | Proposed | Policy Engine | Policy validation tests |

## Roadmap Alignment

These ADRs provide the decision foundation for the workstreams defined in the [Roadmap](../roadmap.md).

## Verification Strategy
Every ADR includes specific verification implications that must be satisfied before the corresponding implementation is considered "Release Ready" according to the [Status Matrix](../architecture/capability-status-matrix.md).
