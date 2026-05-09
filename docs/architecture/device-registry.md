<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Device registry foundation

Implemented `DeviceRegistry` with deterministic ordering and explicit stale/missing-node semantics via `registerNode`, `removeNode`, `updateHeartbeat`, `updateCapabilities`, `getNode`, `listNodes`, and `summarizeHealth`.

This is infrastructure-only: no autodiscovery and no routing side effects.

Future seams: queue-aware orchestration, GPU telemetry adapters, distributed-worker adapters.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.
