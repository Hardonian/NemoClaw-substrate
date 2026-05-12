# Event Taxonomy

This document defines the operational-memory event categories used by the governed substrate. The source of truth is `OperationalEventCategory` in `src/lib/control-plane/operational-memory.ts`; the execution lifecycle subset is also asserted by `EXECUTION_LIFECYCLE_EVENT_TAXONOMY` in `src/lib/control-plane/execution-lifecycle.ts`.

Events are evidence. They do not imply a background daemon, automatic retry loop, distributed scheduler, or autonomous recovery path.

## Core Records

| Event Category | Description |
|:---|:---|
| `receipt` | A runtime receipt was recorded as evidence. |
| `policy_outcome` | A policy evaluation outcome was recorded. |
| `scheduler_outcome` | A scheduler or dry-run routing decision was recorded. |
| `runtime_action` | A runtime action was recorded with provenance. |
| `operator_override` | An operator override was recorded explicitly. |

## Governance Events

| Event Category | Description |
|:---|:---|
| `execution_plan_created` | A governed execution plan was created. |
| `execution_plan_blocked` | A plan was blocked by governance, policy, or missing approval. |
| `execution_plan_cancelled` | A plan was cancelled explicitly. |
| `execution_plan_phase_transition` | A plan moved between explicit lifecycle phases. |
| `execution_approval_requested` | Operator approval was requested. |
| `execution_plan_approved` | Operator approval was granted. |
| `execution_plan_rejected` | Operator approval was rejected. |
| `execution_plan_revoked` | Previously granted approval was revoked. |
| `execution_plan_expired` | A plan or approval exceeded its TTL. |
| `execution_authorization_granted` | Authorization evaluation granted execution. |
| `execution_authorization_denied` | Authorization evaluation denied execution. |
| `execution_policy_snapshot_recorded` | The policy snapshot used for governance was recorded. |
| `execution_trust_snapshot_recorded` | The trust snapshot used for governance was recorded. |

## Queue And Lease Events

| Event Category | Description |
|:---|:---|
| `queue_item_queued` | A task entered the execution queue for a plan. |
| `queue_item_leased` | A queue item moved into leased state. |
| `queue_item_expired` | A queue item expired before completion. |
| `queue_conflict_detected` | A queue ownership or duplicate-claim conflict was detected. |
| `lease_acquired` | A lease was acquired explicitly. |
| `lease_renewed` | A lease was renewed explicitly; there is no hidden renewal loop. |
| `lease_expired` | A lease expired explicitly. |
| `lease_revoked` | A lease was revoked explicitly. |
| `lease_conflict_detected` | A split-brain, stale-owner, or duplicate-lease conflict was detected. |

## Execution Events

| Event Category | Description |
|:---|:---|
| `execution_started` | Execution started after lease and replay validation. |
| `execution_completed` | Execution completed successfully. |
| `execution_failed` | Execution failed with an explicit reason. |
| `execution_cancelled` | Execution was cancelled explicitly. |
| `execution_blocked` | Execution was blocked by governance, policy, trust, or runtime constraints. |

## Replay, Proofpack, And Diagnostics Events

| Event Category | Description |
|:---|:---|
| `execution_replay_validation_succeeded` | Replay validation succeeded. |
| `execution_replay_validation_failed` | Replay validation failed closed. |
| `replay_metadata` | Replay metadata was recorded for diagnostics. |
| `proofpack_generated` | A Proofpack was generated from recorded evidence. |
| `proofpack_validation_failed` | Proofpack integrity validation failed. |
| `diagnostics_snapshot` | A diagnostics snapshot was recorded. |

## Degraded-State Events

| Event Category | Description |
|:---|:---|
| `degraded_state_trigger` | A condition that may trigger Degraded State was recorded. |
| `degraded_state` | An explicit Degraded State record was emitted. |

## Telemetry Events

| Event Category | Description |
|:---|:---|
| `telemetry_probe_started` | A telemetry probe was invoked. |
| `telemetry_probe_succeeded` | A telemetry probe returned usable evidence. |
| `telemetry_probe_failed` | A telemetry probe failed. |
| `telemetry_parse_succeeded` | Telemetry parsing completed. |
| `telemetry_parse_partial` | Telemetry parsing produced partial evidence. |
| `telemetry_parse_failed` | Telemetry parsing failed. |
| `telemetry_unavailable` | Telemetry was unavailable and reported as such. |
| `telemetry_stale` | Telemetry was stale. |
| `telemetry_conflict_detected` | Conflicting telemetry evidence was detected. |
| `telemetry_registry_update_applied` | A telemetry-backed registry update was applied. |
| `telemetry_registry_update_skipped` | A telemetry-backed registry update was skipped. |

## Worker Trust Events

| Event Category | Description |
|:---|:---|
| `worker_identity_observed` | Worker identity evidence was observed. |
| `capability_claim_recorded` | A worker capability claim was recorded. |
| `capability_attestation_observed` | Capability attestation evidence was observed. |
| `capability_attestation_conflict` | Conflicting attestation evidence was detected. |
| `worker_trust_elevated` | Worker trust was elevated by an explicit governance path. |
| `worker_trust_denied` | Worker trust was denied. |
| `worker_trust_revoked` | Worker trust was revoked. |
| `worker_attestation_expired` | Worker attestation expired. |
