<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Diagnostics

Local diagnostics summary includes:

- local probe summary
- registered node count
- telemetry availability state
- governed routing flag state
- optional scheduler dry-run summary
- degraded-state reason codes

## 2026-05-09 remote execution diagnostics update
- Diagnostics now include remote execution enablement state and last execution status/reason/receipt reference when available.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- No SSH execution, no Dynamo/GPU balancing claims, and no background daemon/autonomous worker routing.
- Telemetry confidence and degraded states reflect observed registry/probe data only.
