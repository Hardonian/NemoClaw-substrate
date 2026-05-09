<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Device registry foundation

Implemented `DeviceRegistry` with deterministic ordering and explicit stale/missing-node semantics via `registerNode`, `removeNode`, `updateHeartbeat`, `updateCapabilities`, `getNode`, `listNodes`, and `summarizeHealth`.

This is infrastructure-only: no autodiscovery and no routing side effects.

Future seams: queue-aware orchestration, GPU telemetry adapters, distributed-worker adapters.
