# State Transition Logic

This document defines the deterministic state machines for Orchestration Plans, Runs, and Steps. All transitions must be accompanied by a corresponding `reasonCode` and an emitted `receipt`.

## Orchestration Plan States

| From | To | Trigger |
|:---|:---|:---|
| (initial) | `draft` | `plan_created` |
| `draft` | `pending` | Validation success |
| `pending` | `running` | `plan_started` (first step dispatch) |
| `running` | `completed` | All mandatory steps in `completed` or `skipped` state |
| `running` | `failed` | Mandatory step enters `failed` state and retries exhausted |
| `running` | `cancelled` | Operator or system `plan_cancelled` |
| `running` | `timed_out` | `maxPlanDurationMs` exceeded |

## Orchestration Run States

Runs represent a specific execution instance of a Plan.

| State | Description |
|:---|:---|
| `initialized` | State object created, no steps dispatched. |
| `planning` | Dynamic step resolution or dependency analysis in progress. |
| `executing` | One or more steps are in flight. |
| `completed` | All steps finalized. |
| `failed` | Run terminated due to step failure or internal error. |

## Orchestration Step States

| State | Description |
|:---|:---|
| `pending` | Step is created but dependencies are not yet met. |
| `in_progress` | Step payload has been dispatched to a runner. |
| `completed` | Runner returned success. |
| `failed` | Runner returned error or timeout. |
| `skipped` | Step bypassed by policy or unsatisfied non-mandatory dependency. |
| `cancelled` | Step execution interrupted. |
| `timed_out` | `maxStepDurationMs` exceeded. |

## Determinism Guardrails

1. **No Silent Transitions**: Every transition must emit a receipt of the corresponding `ReceiptType`.
2. **Immutability**: Once a Step reaches a terminal state (`completed`, `failed`, `skipped`, `cancelled`, `timed_out`), it cannot transition back to `in_progress` (a new step or retry attempt must be created).
3. **Dependency Locking**: Steps cannot enter `in_progress` until all IDs in `dependsOnStepIds` are in the `completed` state.
