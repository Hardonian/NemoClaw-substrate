<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0004: Supervised Policy Promotion
- Status: Proposed
## Context
Operational memory can reveal repeated decisions, but silent policy drift undermines governance.
## Decision
Use operational memory to generate recommendations only; policy changes require explicit supervised promotion.
## Consequences
Behavioral evolution is attributable, reviewable, and reversible.
## Alternatives considered
Automatic policy mutation from historical patterns; rejected for governance and safety risk.
## Verification implications
Promotion workflows need tests for approval gating, versioning, and rollback with receipt linkage.
