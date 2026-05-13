<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reviewer Evidence Map

This document maps the major architectural claims of the NemoClaw substrate to their implementation and verification proof.

## Core Governance Claims

| Claim | Implementation File | Test / Verification | Status |
|-------|---------------------|---------------------|--------|
| **Replay fail-closed** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/execution/replay.test.ts` | Implemented |
| **Telemetry is evidence** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/observability/telemetry.test.ts` | Implemented |
| **Remote execution is opt-in** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/adapters/remote.test.ts` | Implemented |
| **Trust gates remote exec** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/security/trust.test.ts` | Implemented |
| **Degraded states explicit** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/execution/degraded.test.ts` | Implemented |
| **No hidden fallback** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/execution/retry.test.ts` | Implemented |
| **Deterministic Proofpacks** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/execution/proofpack.test.ts` | Implemented |
| **Queue / Lease semantics** | [scheduler/scheduler.ts](../../src/lib/scheduler/scheduler.ts) | `src/lib/scheduler/scheduler.test.ts` | Implemented |
| **Execution Plans** | [orchestration/types.ts](../../src/lib/orchestration/types.ts) | `src/lib/execution/plan.test.ts` | Implemented |
| **Governed Orchestration** | [orchestrator.ts](../../src/lib/orchestration/orchestrator.ts) | `src/lib/orchestration/orchestrator.test.ts` | Implemented |
| **Dynamo Adapter** | [dynamo/dynamo-adapter.ts](../../src/lib/dynamo/dynamo-adapter.ts) | `src/lib/dynamo/dynamo-adapter.test.ts` | Scaffolded |

## Evidence Traceability

### 1. Replay Validation
NemoClaw ensures that any execution decision can be re-validated.
- **Evidence**: `OrchestrationReplayReference` and `ReplayDriftDetail` in `src/lib/orchestration/types.ts`.
- **Proof**: If `actualReasonCode` does not match `expectedReasonCode`, a `REPLAY_DRIFT_DETECTED` event is emitted.

### 2. Decision Reason Codes
Decisions are not opaque booleans. They must include a canonical `ReasonCode`.
- **Evidence**: `OrchestrationReasonCode` enum in `src/lib/orchestration/types.ts`.
- **Proof**: Every `OrchestrationDecision` must provide a reason code from this enum, ensuring auditability.

### 3. Opt-in Remote Execution
Remote execution is disabled by default and requires explicit environment flags and policy profiles.
- **Evidence**: `REMOTE_EXECUTION_ENV_FLAG` in `src/lib/orchestration/types.ts`.
- **Proof**: The `isRemoteExecutionEnabled()` check must pass before the remote execution adapter is initialized.

### 4. Lease and Queue Integrity
Deterministic scheduling relies on explicit lease ownership.
- **Evidence**: `SchedulerLease` and `DaemonScheduler` in `src/lib/scheduler/scheduler.ts`.
- **Proof**: Work is only executed if a valid lease is held. `LEASE_CONFLICT` and `LEASE_EXPIRED` reason codes handle race conditions explicitly.

### 5. Proofpack Export
Execution truth is packaged for external review.
- **Evidence**: `OrchestrationReceipt` and `ReceiptType` in `src/lib/orchestration/types.ts`.
- **Proof**: Proofpacks contain the full sequence of receipts, decisions, and metadata, signed (scaffolded) for integrity.

## Reviewer Notes
- **No Hidden Magic**: Search for `reasonCode` across the codebase to see how decisions are surfaced.
- **Fail-Closed**: Check `src/lib/security/security-policy.ts` to see how the default decision is always `deny` unless an explicit `allow` is reached.
- **Status Snapshot**: See [Capability Status Matrix](../architecture/capability-status-matrix.md) for current implementation depth.
