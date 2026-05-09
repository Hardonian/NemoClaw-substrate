<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0006: Device Registry Before Scheduler
- Status: Proposed
## Context
A scheduler cannot make deterministic device-aware decisions without stable inventory and capability inputs.
## Decision
Implement device registry contracts before implementing deterministic scheduler logic.
## Consequences
Scheduler behavior will be grounded in explicit capability snapshots rather than implicit host assumptions.
## Alternatives considered
Build scheduler first with temporary heuristics; rejected due to churn and untrustworthy semantics.
## Verification implications
Registry schema/integrity checks are prerequisite gates for scheduler verification.
