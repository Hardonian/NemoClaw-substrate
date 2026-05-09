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
- Probe execution is explicit/manual with no background polling; remote execution and automated routing remain planned future work.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

## 2026-05-09 dispatch diagnostics
- Heterogeneous dispatch wrapper diagnostics now report bridge enablement, governed state, remote execution state, selected candidate, and receipt id.


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.

## Remote vs local telemetry diagnostics

Diagnostics explicitly report source (local/remote), parser confidence (observed/partial/unavailable/stale), registry update applied/skipped reason codes, and model/GPU known-vs-unknown state.
