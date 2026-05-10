<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Replayability

## Status (2026-05-09)

Implemented scaffold in `src/lib/control-plane/replay.ts`.

Replay envelopes preserve deterministic event ordering, reason codes, and payload integrity via deterministic serialization and digest validation.

Current replay is in-process and export-oriented. Future adapters can persist envelopes externally without mutating source records.

## 2026-05-09 telemetry operational taxonomy hardening

- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

- Replay validation covers telemetry registry update applied/skipped, conflict, and stale events with preserved reason codes.

## Residual matrix closure note (2026-05-09)

Replay validation now has explicit branch assertions for governance drift classes (policy drift, trust drift, candidate eligibility mismatch, fallback mismatch) by rejecting envelopes that omit required reason codes.
