<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Observability

## Status (2026-05-09)

Implemented deterministic observability primitives in `src/lib/control-plane/observability.ts`.

Implemented summaries:

- policy outcomes
- degraded-state timelines
- fallback frequencies
- stale-node summaries

Outputs distinguish observed/unavailable states and avoid fabricated orchestration health.

## Worker probe and telemetry adapter note (2026-05-09)

- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.

## 2026-05-09 telemetry operational taxonomy hardening

- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

- Telemetry observability summaries include registry update applied/skipped counts plus conflict/stale categories to support operator audit trails.
