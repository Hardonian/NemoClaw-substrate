<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Replayability

## Current Scope

Replay envelopes are built and validated in `src/lib/control-plane/replay.ts`. They preserve deterministic event ordering, reason codes, lineage references, and payload integrity through deterministic serialization and digest validation.

Replay is local validation over recorded evidence. It is not a distributed consensus protocol, a re-run mechanism, or a recovery loop.

## 2026-05-09 telemetry operational taxonomy hardening

- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

- Replay validation covers telemetry registry update applied/skipped, conflict, and stale events with preserved reason codes.

## Residual matrix closure note (2026-05-09)

Replay validation now has explicit branch assertions for governance drift classes (policy drift, trust drift, candidate eligibility mismatch, degraded state mismatch) by rejecting envelopes that omit required reason codes.

## Malformed Input Handling

Replay validation fails closed on malformed envelopes. Missing event arrays, malformed event payloads, missing digests, sequence drift, event-count mismatch, missing lineage, and missing reason codes return explicit failure reasons instead of throwing or accepting partial data.

`degraded_state_trigger` events may arrive from older fixture paths with `degradedStateTrigger` payloads or from canonical operational-memory paths with `degraded_state_trigger` payloads. Validation recognizes both shapes, but both still require an operator-visible reason.

## Execution lifecycle replay lineage (2026-05-10)

The execution lifecycle substrate validates replay consistency across plan and queue records. It rejects:

- missing lineage
- lineage drift
- replay reference drift
- governance metadata loss or drift
- trust metadata loss or drift
- recovery permission drift
- candidate mismatch
- ownership mismatch
- lease mismatch
- receipt mismatch
- degraded states without reason codes

Idempotency handling distinguishes deterministic reruns from conflicting replays and blocks cancellation-safe replay of a cancelled plan unless the caller creates a new explicit plan.
