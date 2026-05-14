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
| `missing_invariants` | A plan does not carry the required invariant set. |
| `unenforced_invariant` | A required invariant is present but not enforced. |

## Missing Evidence

| Code | Meaning |
|---|---|
| `missing_idempotency_key` | A required idempotency key is absent. |
| `missing_lineage` | Replay or transition lineage is absent. |
| `missing_execution_receipts` | Required receipt evidence is absent. |
| `missing_governance_metadata` | Required governance metadata is absent. |
| `missing_trust_metadata` | Required trust or attestation metadata is absent. |
| `missing_degraded_reason` | A degraded state lacks an explicit reason. |
| `missing_cancellation_reason` | A cancelled plan lacks cancellation timestamp or reason. |
| `missing_expiration_semantics` | An expired plan lacks expiration metadata. |
| `missing_replay_reason_code` | Replay evidence omits the reason code needed to explain a drift path. |
| `missing_replay_digest` | A replay envelope does not include a digest. |
| `malformed_replay_envelope` | The replay envelope is not an object. |
| `malformed_replay_events` | The replay envelope does not contain an event array. |
| `malformed_replay_event` | At least one replay event is missing required event shape. |
| `malformed_replay_event_count` | The replay event count is not numeric. |
| `unsupported_replay_version` | The replay envelope version is not supported. |

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
| `digest_mismatch` | Replay digest validation failed. |
| `event_count_mismatch` | Replay event count differs from the event array length. |
| `sequence_mismatch` | Replay event sequence values are not contiguous from zero. |

## Queue And Lease

| Code | Meaning |
|---|---|
| `duplicate_lease_attempt` | A second lease was attempted for an already leased item. |
| `conflicting_ownership` | Multiple owners claim the same queue item. |
| `stale_queue_ownership` | Ownership expired before execution started. |
| `queue_item_expired` | The queue item exceeded its allowed lifetime. |
| `orphaned_execution_state` | A queue or execution record no longer has the plan context needed for validation. |
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
