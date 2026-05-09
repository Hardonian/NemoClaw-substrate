<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Scheduler
## Purpose
Deterministically select eligible execution targets from device/runtime candidates.
## Current repo status
Planned. Current repo performs provider/model selection and some drift reporting but has no standalone deterministic scheduler.
## Target behavior
Stable candidate scoring and tie-breaking based on request constraints, policy verdicts, and device capability snapshots.
## Key contracts/types expected
Candidate list, deterministic score breakdown, final selection rationale, rejected-candidate reasons.
## Failure/degraded behavior
If no candidate satisfies constraints, return explicit unschedulable degraded state with actionable reason codes.
## Verification expectations
Property tests for deterministic ordering; regression tests for tie-break behavior; policy-interaction tests.
## Dependencies
Control-plane request envelope, device registry, policy engine, receipt primitives.
## Non-goals
No opaque or probabilistic routing logic.
## Open questions
Exact weighting model and whether scoring should remain fully rule-based in phase 1.
