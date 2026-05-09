<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Telemetry adapters

Telemetry availability is explicit. If GPU telemetry is unavailable, diagnostics and probe events emit an unavailable/degraded truth state instead of inferred telemetry.


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.

## Telemetry adapters evidence policy

Remote/local telemetry adapters are evidence-only and may return unavailable without failing routing. No background polling is introduced.
