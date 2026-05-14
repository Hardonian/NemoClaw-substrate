<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Event Taxonomy

This page lists the implemented control-plane event categories. Event names are evidence labels, not promises that a background worker or distributed queue exists.

## Execution Lifecycle Events

These are emitted by the lifecycle helpers in `src/lib/control-plane/execution-lifecycle.ts`.

| Event Category | Meaning |
|---|---|
| `execution_plan_created` | A plan record was created. |
| `execution_plan_blocked` | A plan was blocked by governance, trust, policy, or lifecycle checks. |
| `execution_plan_cancelled` | A plan was cancelled explicitly. |
| `queue_item_queued` | A plan was represented as a queue item. |
| `queue_item_leased` | A queue item was leased to an owner. |
| `queue_item_expired` | A queue item expired. |
| `queue_conflict_detected` | Queue ownership or replay validation found a conflict. |
| `lease_acquired` | A lease was acquired. |
| `lease_expired` | A lease expired. |
| `lease_revoked` | A lease was revoked. |
| `lease_conflict_detected` | Lease ownership conflicted. |
| `execution_started` | A leased execution started. |
| `execution_completed` | A leased execution completed. |
| `execution_failed` | A leased execution failed. |
| `execution_cancelled` | A leased execution was cancelled. |
| `execution_blocked` | Execution was blocked before running. |
| `proofpack_generated` | A proofpack artifact was generated. |
| `proofpack_validation_failed` | Proofpack validation failed. |

## Governance And Replay Events

These are operational-memory categories used by replay, approval, and policy evidence.

| Event Category | Meaning |
|---|---|
| `receipt` | A receipt was recorded. |
| `policy_outcome` | A policy decision was recorded. |
| `operator_override` | An operator override was recorded. |
| `runtime_action` | A runtime action was recorded. |
| `execution_plan_phase_transition` | A plan phase transition was recorded. |
| `execution_approval_requested` | Approval was requested. |
| `execution_plan_approved` | Approval was granted. |
| `execution_plan_rejected` | Approval was rejected. |
| `execution_plan_revoked` | Approval was revoked. |
| `execution_plan_expired` | Approval or plan lifetime expired. |
| `execution_authorization_granted` | Authorization was granted. |
| `execution_authorization_denied` | Authorization was denied. |
| `execution_policy_snapshot_recorded` | A policy snapshot hash was recorded. |
| `execution_trust_snapshot_recorded` | A trust snapshot hash was recorded. |
| `execution_replay_validation_succeeded` | Replay validation succeeded. |
| `execution_replay_validation_failed` | Replay validation failed. |
| `replay_metadata` | Replay metadata was recorded. |

## Telemetry And Trust Events

Telemetry is evidence. It does not authorize execution by itself.

| Event Category | Meaning |
|---|---|
| `telemetry_probe_started` | A telemetry probe started. |
| `telemetry_probe_succeeded` | A telemetry probe succeeded. |
| `telemetry_probe_failed` | A telemetry probe failed. |
| `telemetry_parse_succeeded` | Telemetry parsing succeeded. |
| `telemetry_parse_partial` | Telemetry parsing produced partial data. |
| `telemetry_parse_failed` | Telemetry parsing failed. |
| `telemetry_unavailable` | Telemetry was unavailable. |
| `telemetry_stale` | Telemetry was stale. |
| `telemetry_conflict_detected` | Telemetry conflicted with existing evidence. |
| `telemetry_registry_update_applied` | A registry update was applied from telemetry evidence. |
| `telemetry_registry_update_skipped` | A registry update was skipped. |
| `worker_identity_observed` | Worker identity evidence was observed. |
| `capability_claim_recorded` | A capability claim was recorded. |
| `capability_attestation_observed` | Structural attestation evidence was observed. |
| `capability_attestation_conflict` | Attestation evidence conflicted. |
| `worker_trust_elevated` | Trust assessment increased. |
| `worker_trust_denied` | Trust assessment denied execution. |
| `worker_trust_revoked` | Trust assessment was revoked. |
| `worker_attestation_expired` | Worker attestation expired. |

## Degraded And Diagnostics Events

| Event Category | Meaning |
|---|---|
| `degraded_state` | A degraded state was recorded with a reason code. |
| `degraded_state_trigger` | A condition triggered degraded-state handling. |
| `diagnostics_snapshot` | A diagnostics snapshot was captured. |
