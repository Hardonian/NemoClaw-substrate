<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Device Registry
## Purpose
Represent local heterogeneous compute devices and runtime capabilities as explicit control-plane inputs.
## Current repo status
Planned. Existing sandbox registry tracks sandboxes, not a dedicated per-device capability registry.
## Target behavior
Maintain device records and capability snapshots used by policy and scheduler decisions.
## Key contracts/types expected
Device identity, capability snapshot, health/availability state, policy eligibility tags.
## Failure/degraded behavior
If registry data is stale or unavailable, emit degraded state and block decisions requiring strict device guarantees.
## Verification expectations
Schema tests, deterministic snapshot merge tests, and integration tests for scheduler input validation.
## Dependencies
Control-plane contracts, existing state persistence primitives.
## Non-goals
No speculative cluster manager implementation in this phase.
## Open questions
Snapshot refresh cadence and trust boundaries for host-probed versus operator-declared capability fields.
