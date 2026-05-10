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

## Worker trust and attestation constraints (2026-05-09)

- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.

## Residual closure assertions (2026-05-09)

Diagnostics remain explicit for trust, telemetry, replay, and degraded states. Blocked branches fail closed with visible reason-coded receipts; no hidden degraded state or implicit transport retry is allowed.

## Execution lifecycle diagnostics (2026-05-10)

The execution lifecycle substrate adds deterministic diagnostics snapshots for governed execution records. Each fact is classified as one of:

- `observed`
- `inferred`
- `unavailable`
- `degraded`
- `stale`
- `conflicted`
- `blocked`
- `not_implemented`

Implemented diagnostic facts:

| Fact | Source | Truth behavior |
|---|---|---|
| queue state | `QueueItem.state` | observed, blocked, degraded, or unavailable |
| lease state | `QueueLease` | observed, stale, blocked, or unavailable |
| ownership | queue ownership + lease owner | observed, conflicted, or unavailable |
| execution lifecycle | `ExecutionPlan.status` | observed or unavailable |
| replay integrity | plan + queue replay refs | observed or conflicted |
| proofpack integrity | proofpack validation | observed, degraded, or unavailable |
| degraded propagation | plan/queue degraded records | observed or degraded |
| governance lineage | plan governance metadata | observed or unavailable |
| trust lineage | plan trust metadata | observed or unavailable |
| attestation state | trust metadata | observed or unavailable |

Diagnostics do not claim completeness. Missing proofpacks, missing queues, unavailable attestation, and unavailable telemetry are reported as unavailable rather than filled with placeholders.
