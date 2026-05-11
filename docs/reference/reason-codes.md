# Reason Codes

Reason codes provide fine-grained, machine-readable explanations for decisions and state transitions within the NemoClaw substrate. These codes are embedded in receipts and events to ensure every action is auditable.

## Plan Lifecycle Codes
| Code | Meaning |
|:---|:---|
| `plan_created` | The orchestration plan has been synthesized and validated. |
| `plan_started` | Execution of the first step in the plan has commenced. |
| `plan_completed` | All mandatory steps in the plan finished successfully. |
| `plan_failed` | One or more mandatory steps failed, and retries are exhausted. |
| `plan_cancelled` | The plan was terminated by an operator or external signal. |
| `plan_timed_out` | Total plan execution time exceeded `maxPlanDurationMs`. |

## Step Lifecycle Codes
| Code | Meaning |
|:---|:---|
| `step_created` | An individual execution step was added to the run state. |
| `step_started` | The specific step payload was dispatched to a runner. |
| `step_completed` | The step payload executed successfully and returned results. |
| `step_failed` | The step execution encountered an error. |
| `step_skipped` | The step was bypassed due to satisfied dependencies or policy. |
| `step_cancelled` | The step was stopped before completion. |
| `step_timed_out` | Individual step duration exceeded `maxStepDurationMs`. |

## Policy & Trust Codes
| Code | Meaning |
|:---|:---|
| `orchestration_disabled` | Orchestration was skipped because `NEMOCLAW_ORCHESTRATION != 1`. |
| `policy_denied` | The active policy forbids the requested action. |
| `policy_expired` | The policy version used for planning is no longer valid. |
| `policy_missing` | No valid policy could be found for the requested scope. |
| `trust_insufficient` | The attestation/trust level is below the required threshold. |
| `trust_revoked` | The credentials or attestation used were previously invalidated. |
| `approval_required` | The step is marked as requiring explicit operator approval. |
| `approval_denied` | An operator or gatekeeper explicitly rejected the request. |

## GPU & Resource Codes
| Code | Meaning |
|:---|:---|
| `gpu_available` | Sufficient GPU resources were found and reserved. |
| `gpu_unavailable` | No matching GPU devices were found on the target host. |
| `gpu_vram_insufficient` | Available VRAM is below the `minVramMb` threshold. |
| `gpu_thermal_throttled` | Device is throttled; execution deferred to prevent damage. |
| `gpu_queue_full` | All target GPU compute slots are currently occupied. |
| `gpu_telemetry_unavailable` | Real-time GPU metrics are missing; falling back to static info. |
| `gpu_scoring_degraded` | Scheduling scoring is less accurate due to missing data. |

## Daemon & Lease Codes
| Code | Meaning |
|:---|:---|
| `daemon_not_started` | The background scheduler process is not running. |
| `daemon_shutdown` | The scheduler process is terminating. |
| `lease_stale` | The task lease was not renewed within the required interval. |
| `lease_expired` | The task lease has exceeded its absolute TTL. |
| `lease_conflict` | Another worker has already claimed the lease for this task. |
| `heartbeat_missed` | The runner failed to signal health within the deadline. |

## Replay & Verification Codes
| Code | Meaning |
|:---|:---|
| `replay_drift_detected` | Replay execution diverged from the recorded history. |
| `replay_consistent` | Replay execution exactly matched the recorded history. |
| `validation_failed` | Structure or signature verification failed for an artifact. |

## External Integration Codes
| Code | Meaning |
|:---|:---|
| `dynamo_connected` | Successfully connected to the DynamoDB adapter. |
| `dynamo_unavailable` | The DynamoDB endpoint is unreachable. |
| `remote_enabled` | Remote execution was successfully authorized. |
| `remote_blocked_no_trust` | Remote execution denied due to insufficient trust. |
| `policy_proposal_created` | A new policy rule has been proposed based on learning. |
