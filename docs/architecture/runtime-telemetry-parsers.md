<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime telemetry parsers

Telemetry parsing is evidence-only metadata enrichment for remote probes. It does not change routing defaults or auto-route by default.

Parsers:
- `parseOllamaTelemetry`
- `parseVllmTelemetry`
- `parseLlamaCppTelemetry`
- `parseNimTelemetry`
- `parseGenericRuntimeTelemetry`

Rules:
- Missing fields are returned as partial or unavailable.
- Unknown values are kept unknown (not fabricated).
- No background polling.
- Unavailable telemetry is acceptable.
