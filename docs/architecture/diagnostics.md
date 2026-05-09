<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Placeholder

Implemented adapter seam and scheduler dry-run diagnostics only. Live routing is unchanged, remote execution is disabled by default, Dynamo/GPU telemetry adapters are planned.

## 2026-05-09 governed routing update
Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.
