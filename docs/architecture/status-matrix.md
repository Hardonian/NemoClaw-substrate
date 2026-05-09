<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Status matrix

| Capability area | Status | Notes |
|---|---|---|
| CLI/plugin onboarding and sandbox orchestration | Implemented | Current NemoClaw flows are present and tested. |
| Control-plane contracts and governance primitives | Implemented | Deterministic policy/classification/scheduler primitives exist with tests. |
| Runtime governed provider routing | Opt-in | Behind `NEMOCLAW_GOVERNED_ROUTING=1`; default routing preserved when disabled. |
| Heterogeneous routing bridge | Opt-in | Behind explicit feature flags; does not imply remote execution enablement. |
| Remote execution adapters | Scaffolded | Guarded seams and policy/approval gating exist; full distributed execution is not implemented. |
| Telemetry adapters and diagnostics | Scaffolded | Evidence-oriented telemetry available; non-authoritative for autonomous control. |
| Distributed execution handoff | Not implemented | No autonomous distributed runtime handoff in this phase. |
| GPU balancing | Not implemented | No automatic cross-device balancing logic in this phase. |
| Dynamo integration | Planned | Adapter-only future work after stable local contracts. |
| Autonomous orchestration/self-healing loops | Not implemented | No background daemon orchestration or self-healing loops. |
| Automatic policy learning | Not implemented | Policy promotion remains supervised and explicit. |
