# State Transition Logic

This document describes the implemented state machines in the governed substrate. All transitions are explicit caller-invoked operations. The repository does not implement background queue workers, daemon lease renewal, speculative fanout, hidden retries, autonomous recovery, GPU balancing, or distributed execution handoff.

## Execution Lifecycle Substrate

Source of truth: `src/lib/control-plane/execution-lifecycle.ts`.

Implemented states:

| From | Allowed To |
|:---|:---|
| `planned` | `queued`, `blocked`, `degraded`, `cancelled`, `expired` |
| `queued` | `leased`, `blocked`, `degraded`, `cancelled`, `expired` |
| `leased` | `executing`, `blocked`, `degraded`, `cancelled`, `expired` |
| `executing` | `completed`, `failed`, `blocked`, `degraded`, `cancelled`, `expired` |
| `blocked` | `degraded`, `cancelled`, `expired` |
| `degraded` | `blocked`, `cancelled`, `expired` |
| `completed`, `failed`, `cancelled`, `expired` | terminal |

Every transition produces deterministic lifecycle evidence when represented through the lifecycle helpers:

- a reason code
- a lifecycle receipt
- an event category from the canonical event taxonomy
- replay lineage and receipt references where applicable

Invalid transitions fail closed with `invalid_transition`. Expired and cancelled plans reject non-terminal transitions. Replay, governance, trust, ownership, lease, and receipt drift are validation failures, not automatic repair instructions.

## Queue And Lease Lifecycle

Queue and lease operations are explicit:

| Operation | Required Current State | Output State | Failure Examples |
|:---|:---|:---|:---|
| `createQueueItemFromPlan` | queueable plan | `queued` | missing governance, missing trust, expired plan |
| `acquireQueueLease` | `queued` | `leased` | duplicate lease, split-brain ownership, stale queue |
| `renewQueueLease` | active lease | unchanged lease owner | wrong owner, revoked lease, expired lease |
| `expireQueueLease` | leased item | `expired` | missing lease |
| `revokeQueueLease` | leased item | `blocked` | wrong owner, missing lease |
| `startExecution` | `leased` | `executing` | stale owner, lease mismatch |
| `completeExecution` | `executing` | `completed` | stale owner, lease mismatch |
| `failExecution` | `executing` | `failed` | stale owner, lease mismatch |
| `cancelExecution` | `executing` | `cancelled` | stale owner, lease mismatch |
| `blockExecution` | `executing` | `blocked` | stale owner, lease mismatch |

Lease renewal emits `lease_renewed`. It is not a daemon heartbeat and does not imply an automatic renewal loop.

## Opt-In Orchestration Engine

Source of truth: `src/lib/orchestration/orchestrator.ts`.

The orchestration engine is an opt-in, in-memory contract layer gated by `NEMOCLAW_ORCHESTRATION=1`. It is not the default runtime path and does not start external workers. When disabled, mutating operations fail closed with `orchestration_disabled`.

Plan states:

| From | Allowed To |
|:---|:---|
| `draft` | `running`, `cancelled`, `failed` |
| `pending` | `running`, `cancelled`, `failed` |
| `running` | `completed`, `failed`, `cancelled` |
| `completed`, `failed`, `cancelled`, `timed_out` | terminal |

Step states:

| From | Allowed To |
|:---|:---|
| `pending` | `in_progress`, `skipped` |
| `in_progress` | `completed`, `failed`, `skipped` |
| `completed`, `failed`, `skipped`, `cancelled`, `timed_out` | terminal |

Additional enforcement:

- A step must belong to the plan before it can start.
- A step cannot start until its dependencies are complete.
- Plan completion requires all steps to be `completed` or `skipped`.
- Decisions and receipts use deterministic sequence-derived ids; no random receipt suffixes are used.
- Replay is only consistent when a replay run emits matching receipts. Missing replay receipts are drift.

## Retry Boundary

The retry manager is explicit and policy-gated. `NEMOCLAW_RETRY_POLICY=explicit` is required before retry attempts can be requested. Retries consume budget, require a reason, honor approval requirements, and emit receipts. There is no implicit retry policy and no automatic retry loop.
