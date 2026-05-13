<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Event Taxonomy

This document defines the canonical taxonomy of events emitted by the NemoClaw governed substrate. Events are categorized by their role in the governance and execution lifecycle.

## Governance Events

Governance events represent high-level lifecycle transitions and authorization decisions.

| Event Category | Description |
|:---|:---|
| `execution_plan_created` | A new orchestration plan has been synthesized and validated. |
| `execution_plan_blocked` | Plan execution is blocked by policy or lack of approval. |
| `execution_plan_cancelled` | Plan execution was terminated by the operator or system. |
| `execution_plan_phase_transition` | A plan has moved between major lifecycle phases (governance, planning, execution, etc.). |
| `execution_approval_requested` | Operator approval is required for a plan or specific step. |
| `execution_plan_approved` | Operator has granted approval for execution. |
| `execution_plan_rejected` | Operator has denied approval for execution. |
| `execution_plan_revoked` | Previously granted approval has been revoked. |
| `execution_plan_expired` | A plan or approval has exceeded its time-to-live (TTL). |

## Queue & Lease Events

Events related to the task queue and worker distribution. These ensure atomic ownership and prevent duplication.

| Event Category | Description |
|:---|:---|
| `queue_item_queued` | A task has entered the execution queue for a specific plan. |
| `queue_item_leased` | A worker has successfully taken a temporary lease on a task. |
| `queue_item_expired` | A queued task has exceeded its maximum wait time. |
| `queue_conflict_detected` | Concurrent access detected on a queue item (e.g., duplicate claim). |
| `lease_acquired` | A worker lease was successfully established for a task. |
| `lease_expired` | A worker failed to renew its lease within the required interval. |
| `lease_revoked` | A lease was terminated by the control plane. |
| `lease_conflict_detected` | Multiple workers attempted to claim the same lease simultaneously. |

## Execution Events

Execution events track the progress of tasks as they are processed by workers.

| Event Category | Description |
|:---|:---|
| `execution_started` | The worker has started processing the task. |
| `execution_completed` | The task has finished successfully and generated results. |
| `execution_failed` | The task encountered an error or crashed. |
| `execution_cancelled` | The task execution was interrupted by an external signal. |
| `execution_blocked` | Task cannot start due to runtime resource constraints. |

## Verification & Proofpack Events

Events related to the export and verification of execution evidence.

| Event Category | Description |
|:---|:---|
| `proofpack_generated` | A comprehensive bundle of evidence has been exported. |
| `proofpack_validation_failed` | Integrity check or signature verification failed for a Proofpack. |
| `replay_validation_succeeded` | Replay execution matched the recorded history exactly. |
| `replay_validation_failed` | Replay detected drift or non-deterministic behavior. |
| `diagnostics_snapshot` | A comprehensive capture of system state facts for debugging. |

## Operational Status Events

Events tracking the health and operational mode of the substrate.

| Event Category | Description |
|:---|:---|
| `degraded_state` | The system has entered a Degraded State (reduced accuracy/performance). |
| `degraded_state_trigger` | A specific condition triggered a transition to Degraded State. |
| `operator_override` | An operator manually bypassed a policy or safety gate. |
