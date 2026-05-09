<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# heterogeneous-routing


## 2026-05-09 guarded scheduler-controlled heterogeneous routing
- Default behavior is unchanged; heterogeneous routing is disabled unless `NEMOCLAW_HETEROGENEOUS_ROUTING=1`.
- Remote execution still requires a separate `NEMOCLAW_REMOTE_EXECUTION=1` opt-in.
- Remote candidates are policy-gated and can be excluded as denied or approval-required.
- No SSH execution, no autonomous orchestration is implemented; telemetry remains explicit probe evidence only.

## 2026-05-09 runtime dispatch seam integration
- Added a thin guarded wrapper at provider dispatch boundary to invoke heterogeneous routing only when both heterogeneous and governed flags are enabled.
- Remote routing is explicit and blocked unless remote execution is enabled.


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.
