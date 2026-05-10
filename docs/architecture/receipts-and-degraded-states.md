<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Receipts and degraded states

Implemented canonical receipt/degraded schemas with deterministic serialization.

Degraded taxonomy includes: healthy, constrained, degraded, unavailable, partial capability, approval blocked, stale, unreachable, unknown. Every degraded state carries reason code, timestamp, source component, subsystem, and operator explanation.

Receipts are append-friendly and replay-oriented and emitted on governed routing and remote execution paths; non-governed local dispatch remains intentionally unchanged.

## Runtime receipt seam status (2026-05-09)

Execution receipt construction includes policy rationale, tool metadata, degraded state metadata, degraded states, and timing summary in a thin runtime seam adapter.

Replay validation fails closed on envelope integrity mismatches and explicit governance metadata requirements:

- deterministic sequence continuity
- digest integrity
- required replay lineage
- required reason codes for degraded/policy/degraded state events

No silent replay adaptation is implemented.

## 2026-05-09 governed routing update

Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled.

Not implemented in this phase: orchestration, distributed execution rollout, autonomous execution, autonomous recovery behavior, queue workers/daemons, GPU balancing, Dynamo integration, automatic retries, and automatic policy learning.

## 2026-05-10 execution lifecycle receipts

The execution lifecycle substrate adds deterministic receipt creation for plan transitions, queueing, lease acquisition/renewal/expiration/revocation, execution start/completion/failure/cancellation/blocking, and proofpack validation. Receipt ids and digests are derived from deterministic serialized payloads, the plan id, replay reference, reason code, and timestamp supplied by the caller.

Degraded states remain explicit. Blocked, degraded, failed, expired, and revoked paths carry reason codes and are preserved in queue records, plan records, diagnostics snapshots, and proofpacks. Hidden retry and hidden recovery path payloads are rejected during proofpack validation.
