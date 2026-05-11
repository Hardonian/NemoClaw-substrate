# Event Taxonomy

This document defines the canonical taxonomy of events emitted by the NemoClaw governed substrate. Events are categorized by their role in the governance and execution lifecycle.

## Governance Events

Governance events represent high-level lifecycle transitions and authorization decisions.

| Event Category | Description |
|:---|:---|
| `execution_plan_created` | A new orchestration plan has been synthesized. |
| `execution_plan_blocked` | Plan execution is blocked by policy or lack of approval. |
| `execution_plan_cancelled` | Plan execution was cancelled by the operator or system. |
| `execution_plan_phase_transition` | A plan has moved between major lifecycle phases. |
| `execution_approval_requested` | Operator approval is required for a plan or step. |
| `execution_plan_approved` | Operator has granted approval for execution. |
| `execution_plan_rejected` | Operator has denied approval for execution. |
| `execution_plan_revoked` | Previously granted approval has been revoked. |
| `execution_plan_expired` | A plan or approval has exceeded its TTL. |
| `execution_authorization_granted` | Policy engine has authorized an execution step. |
| `execution_authorization_denied` | Policy engine has denied an execution step. |
| `execution_policy_snapshot_recorded` | The active policy state was captured for audit. |
| `execution_trust_snapshot_recorded` | The active trust/attestation state was captured. |
| `execution_replay_validation_succeeded` | Replay matching confirmed deterministic behavior. |
| `execution_replay_validation_failed` | Replay detected drift from original execution. |

## Execution Events

Execution events track the low-level progress of tasks within the substrate.

| Event Category | Description |
|:---|:---|
| `execution_started` | The runtime has started executing a task. |
| `execution_completed` | The task has finished successfully. |
| `execution_failed` | The task has failed with an error. |
| `execution_cancelled` | The task execution was interrupted. |
| `execution_blocked` | Task cannot start due to resource or policy constraints. |

## Queue & Lease Events

Events related to the daemon scheduler and task distribution.

| Event Category | Description |
|:---|:---|
| `queue_item_queued` | A task has entered the execution queue. |
| `queue_item_leased` | A worker has taken a temporary lease on a task. |
| `queue_item_expired` | A queued task has exceeded its wait time. |
| `queue_conflict_detected` | Concurrent access detected on a queue item. |
| `lease_acquired` | A worker lease was successfully established. |
| `lease_expired` | A worker failed to renew its lease in time. |
| `lease_revoked` | A lease was terminated by the control plane. |
| `lease_conflict_detected` | Multiple workers attempted to claim the same lease. |

## Telemetry Events

Passive observation events used as evidence for scheduling and governance.

| Event Category | Description |
|:---|:---|
| `telemetry_probe_started` | A telemetry collection probe has been launched. |
| `telemetry_probe_succeeded` | Raw telemetry data was successfully collected. |
| `telemetry_probe_failed` | Telemetry collection encountered an error. |
| `telemetry_parse_succeeded` | Telemetry data was successfully normalized. |
| `telemetry_parse_partial` | Some telemetry fields could not be parsed. |
| `telemetry_parse_failed` | Telemetry data was malformed or unreadable. |
| `telemetry_unavailable` | Telemetry source is unreachable. |
| `telemetry_stale` | Telemetry data exceeds the maximum age threshold. |
| `telemetry_conflict_detected` | Conflicting telemetry data received from sources. |
| `telemetry_registry_update_applied` | Device registry updated with new telemetry. |
| `telemetry_registry_update_skipped` | Update ignored due to staleness or conflict. |

## Diagnostics & Operational Events

Diagnostics and operational events capture snapshots for debugging and verification.

| Event Category | Description |
|:---|:---|
| `diagnostics_snapshot` | A comprehensive capture of system state for debugging. |
| `replay_metadata` | Metadata describing a replay session. |
| `proofpack_generated` | A Proofpack has been successfully exported. |
| `proofpack_validation_failed` | Integrity check failed on an exported Proofpack. |
| `degraded_state` | The system has entered a Degraded State of operation. |
| `fallback` | A Degraded State mechanism was triggered. |
| `operator_override` | An operator manually bypassed a policy gate. |
