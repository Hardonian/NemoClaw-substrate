# Reason Codes

Reason codes provide fine-grained, machine-readable explanations for decisions and state transitions within the NemoClaw substrate. These codes are embedded in receipts and events to ensure every action is auditable.

## Standard Success & Control Codes

| Code | Meaning |
|:---|:---|
| `ok` | The operation or transition completed successfully. |
| `deterministic_rerun` | A replay or retry was identified as a deterministic match. |
| `idempotency_key_conflict` | A plan with the same idempotency key already exists. |

## Structural & Lineage Codes

| Code | Meaning |
|:---|:---|
| `invalid_transition` | The requested state transition is not allowed by the state machine. |
| `missing_idempotency_key` | An idempotency key was required but not provided. |
| `missing_lineage` | Replay or transition history is missing for a task. |
| `orphaned_execution_state` | An execution record exists without a corresponding plan or queue item. |
| `missing_execution_receipts` | Required evidence artifacts are missing from the plan. |

## Drift & Integrity Codes

| Code | Meaning |
|:---|:---|
| `lineage_drift` | The sequence of events in the queue diverged from the plan. |
| `replay_drift` | Replay execution diverged from the recorded history. |
| `governance_drift` | Governance metadata (e.g., policy version) changed unexpectedly. |
| `trust_drift` | Trust/attestation metadata changed during execution. |
| `degraded_state_trigger_drift` | The trigger for a degraded state changed during replay. |
| `candidate_mismatch` | A worker or resource candidate does not match the plan. |
| `ownership_mismatch` | The current worker does not match the recorded owner. |
| `lease_mismatch` | The active lease does not match the execution context. |
| `receipt_mismatch` | A receipt's digest does not match its recorded value. |
| `proofpack_integrity_mismatch` | The overall digest of a Proofpack failed verification. |

## Policy & Invariant Codes

| Code | Meaning |
|:---|:---|
| `missing_governance_metadata` | Required governance fields (e.g., `userId`) are missing. |
| `missing_trust_metadata` | Required trust/attestation fields are missing. |
| `missing_invariants` | The plan defines no safety invariants for enforcement. |
| `unenforced_invariant` | A mandatory safety invariant was bypassed or failed. |
| `plan_expired` | The plan's absolute time-to-live (TTL) has been exceeded. |
| `plan_cancelled` | The plan was explicitly cancelled by an operator. |
| `missing_expiration_semantics` | A plan is missing its TTL or expiration handling logic. |
| `cancellation_safe_replay_blocked` | Replay was blocked because the original was not cancellation-safe. |

## Queue & Lease Codes

| Code | Meaning |
|:---|:---|
| `duplicate_lease_attempt` | A worker attempted to lease a task it already owns. |
| `conflicting_ownership` | Multiple workers claim ownership of the same task. |
| `stale_queue_ownership` | A worker's ownership record has not been refreshed. |
| `queue_item_expired` | A task spent too long in the queue without being claimed. |
| `missing_queue_history` | The transition history for a queue item is incomplete. |
| `missing_lease_history` | The lease renewal/expiration history is missing. |

## Degraded State Codes

| Code | Meaning |
|:---|:---|
| `missing_degraded_reason` | A transition to degraded state is missing an explanation. |
| `hidden_degraded_state_trigger_detected` | An undocumented trigger caused a degraded state. |
| `hidden_retry_detected` | An unrecorded retry attempt was discovered during replay. |
