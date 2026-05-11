# Fault Matrix & Failure Semantics

This document defines how the NemoClaw substrate observes, categorizes, and responds to various failure states and system degradations.

## Observation States

Every `Diagnostic Fact` in an `ExecutionDiagnosticSnapshot` is assigned one of the following states:

| State | Severity | Description |
|:---|:---|:---|
| `observed` | Info | The fact was successfully observed and verified against source-of-truth. |
| `inferred` | Info | The fact was derived from other observations (e.g., node health inferred from lease renewal). |
| `unavailable` | Warning | The data source for this fact is unreachable. |
| `degraded` | Warning | The fact indicates a sub-optimal or non-canonical state (e.g., using Degraded State providers). |
| `stale` | Warning | The observation is older than the allowed threshold but still present. |
| `conflicted` | Error | Multiple conflicting observations were made for the same fact. |
| `blocked` | Error | The fact indicates a state that prevents further execution (e.g., policy violation). |
| `not_implemented` | Warning | The mechanism to observe this fact is not yet present in the current substrate. |

## Failure Scenarios & Reason Codes

The following matrix maps common failure scenarios to their corresponding `ExecutionLifecycleReasonCode` and the system's response.

### 1. Integrity & Drift Failures

These occur when the execution state diverges from the plan or evidence manifest.

| Scenario | Reason Code | System Response |
|:---|:---|:---|
| Replay execution differs from history | `replay_drift` | Fail validation; block Proofpack export. |
| Queue sequence doesn't match plan | `lineage_drift` | Transition to `blocked`; require operator audit. |
| Governance metadata changed mid-run | `governance_drift` | Stop execution; revoke active leases. |
| Artifact digest mismatch | `receipt_mismatch` | Mark as `conflicted`; block downstream steps. |

### 2. Concurrency & Ownership Failures

These occur during the task distribution and leasing phase.

| Scenario | Reason Code | System Response |
|:---|:---|:---|
| Duplicate worker lease attempt | `duplicate_lease_attempt` | Reject transition; maintain existing lease. |
| Lease renewal missed | `lease_expired` | Transition `QueueItem` to `queued`; allow re-claim. |
| Multiple workers claim ownership | `conflicting_ownership` | Revoke all leases for the item; trigger conflict event. |
| Stale heartbeat detected | `stale_queue_ownership` | Record `stale` fact; prepare for lease revocation. |

### 3. Policy & Governance Failures

These occur when safety invariants or operator approvals are violated.

| Scenario | Reason Code | System Response |
|:---|:---|:---|
| Mandatory invariant not met | `unenforced_invariant` | Transition to `failed` or `blocked`. |
| Plan TTL exceeded | `plan_expired` | Transition to `expired`; cleanup active resources. |
| Missing mandatory metadata | `missing_governance_metadata` | Reject plan creation; return 400 error. |
| Non-cancellation-safe replay | `cancellation_safe_replay_blocked` | Block replay to prevent side-effects. |

## Degraded State Semantics

A "Degraded State" in NemoClaw is NOT a failure, but a sub-optimal mode of operation that still allows for safe (if less efficient) execution.

* **Triggered**: Must have a valid `reasonCode` and `explanation`.
* **Permitted**: Degraded states must be explicitly permitted in the `ExecutionPlan`.
* **Auditable**: Every transition to a degraded state emits a `degraded_state_trigger` event.
* **Non-Silent**: The UI and CLI must clearly indicate when the substrate is operating in a degraded mode.

### Common Degraded Triggers

* `gpu_telemetry_unavailable`: Using static device capabilities because the live probe failed.
* `scoring_degraded`: Scheduler using approximate priority because some telemetry is stale.
* `hidden_retry_detected`: A previous execution phase succeeded after an unrecorded internal retry.
