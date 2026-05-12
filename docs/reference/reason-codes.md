<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reason Codes

Reason codes are short machine-readable explanations attached to lifecycle records, receipts, replay envelopes, diagnostics, and degraded states.

Primary proof:

- `src/lib/control-plane/execution-lifecycle.test.ts`
- `src/lib/control-plane/degraded-state-chaos.test.ts`
- `src/lib/control-plane/replay.ts`

## Control

| Code | Meaning |
|---|---|
| `ok` | Operation completed successfully. |
| `deterministic_rerun` | A repeated request matched the prior deterministic record. |
| `idempotency_key_conflict` | The idempotency key matched an incompatible plan. |
| `invalid_transition` | The requested lifecycle transition is not allowed. |

## Missing Evidence

| Code | Meaning |
|---|---|
| `missing_idempotency_key` | A required idempotency key is absent. |
| `missing_lineage` | Replay or transition lineage is absent. |
| `missing_execution_receipts` | Required receipt evidence is absent. |
| `missing_governance_metadata` | Required governance metadata is absent. |
| `missing_trust_metadata` | Required trust or attestation metadata is absent. |
| `missing_degraded_reason` | A degraded state lacks an explicit reason. |
| `missing_replay_reason_code` | Replay evidence omits the reason code needed to explain a drift path. |

## Drift And Integrity

| Code | Meaning |
|---|---|
| `lineage_drift` | Queue or lifecycle lineage diverged from the plan. |
| `replay_drift` | Replay diverged from the recorded history. |
| `governance_drift` | Governance metadata changed unexpectedly. |
| `trust_drift` | Trust or attestation metadata changed during execution. |
| `degraded_state_trigger_drift` | A degraded-state trigger changed during replay. |
| `candidate_mismatch` | The worker or resource candidate does not match the plan. |
| `ownership_mismatch` | The current owner does not match the recorded owner. |
| `lease_mismatch` | The active lease does not match the execution context. |
| `receipt_mismatch` | A receipt digest does not match its recorded value. |
| `proofpack_integrity_mismatch` | Proofpack digest validation failed. |

## Queue And Lease

| Code | Meaning |
|---|---|
| `duplicate_lease_attempt` | A second lease was attempted for an already leased item. |
| `conflicting_ownership` | Multiple owners claim the same queue item. |
| `stale_queue_ownership` | Ownership expired before execution started. |
| `queue_item_expired` | The queue item exceeded its allowed lifetime. |
| `missing_queue_history` | Queue transition history is incomplete. |
| `missing_lease_history` | Lease renewal, expiration, or revocation history is incomplete. |

## Degraded Or Blocked

| Code | Meaning |
|---|---|
| `hidden_degraded_state_trigger_detected` | A degraded-state trigger was present but not represented as evidence. |
| `hidden_retry_detected` | Replay/proofpack evidence indicates an unrecorded retry. |
| `cancellation_safe_replay_blocked` | Replay was blocked because the prior plan was cancelled. |
| `plan_expired` | The plan exceeded its expiration window. |
| `plan_cancelled` | The plan was explicitly cancelled. |
