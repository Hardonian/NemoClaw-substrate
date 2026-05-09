<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# heterogeneous-routing


## 2026-05-09 guarded scheduler-controlled heterogeneous routing
- Default behavior is unchanged; heterogeneous routing is disabled unless `NEMOCLAW_HETEROGENEOUS_ROUTING=1`.
- Remote execution still requires a separate `NEMOCLAW_REMOTE_EXECUTION=1` opt-in.
- Remote candidates are policy-gated and can be excluded as denied or approval-required.
- No SSH execution, no Dynamo orchestration, and no autonomous orchestration are implemented.
