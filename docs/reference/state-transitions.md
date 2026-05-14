<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# State Transition Logic

This page documents the implemented execution-lifecycle substrate in `src/lib/control-plane/execution-lifecycle.ts`. It is not a distributed worker protocol and does not start background queue workers.

## Execution Plan States

| From | Allowed next states |
|---|---|
| `planned` | `queued`, `cancelled`, `expired`, `blocked`, `degraded` |
| `queued` | `leased`, `cancelled`, `expired`, `blocked`, `degraded` |
| `leased` | `executing`, `cancelled`, `expired`, `degraded`, `blocked` |
| `executing` | `completed`, `failed`, `cancelled`, `degraded`, `blocked` |
| `blocked` | `cancelled`, `expired`, `degraded` |
| `degraded` | `cancelled`, `expired`, `blocked` |
| `completed` | terminal |
| `failed` | terminal |
| `cancelled` | terminal |
| `expired` | terminal |

Invalid transitions return `invalid_transition`. A cancelled plan returns `plan_cancelled`; an expired plan returns `plan_expired` unless the requested transition is `expired` or `cancelled`.

## Queue And Lease Rules

| Rule | Enforcement |
|---|---|
| A terminal plan cannot be queued. | `enqueueExecutionPlan()` rejects `completed`, `failed`, `cancelled`, and `expired` plans. |
| A queue item lease has one owner. | `acquireQueueLease()` rejects duplicate, stale, or conflicting owners. |
| Execution requires an active lease. | `startQueuedExecution()` and completion helpers check owner and lease expiry. |
| Lease expiration and revocation are explicit. | `expireQueueLease()` and `revokeQueueLease()` emit receipts/events. |
| Replay references travel with queue items. | Queue replay validation checks lineage, ownership, lease, receipt, governance, trust, and degraded-state trigger metadata. |

## Replay And Evidence Guardrails

- Every transition decision carries a `reasonCode`.
- Blocked or degraded states require explicit reason codes.
- Cancellation requires `cancelledAt` and `cancellationReasonCode`.
- Proofpack validation rejects hidden retries and hidden degraded-state triggers.
- Replay validation rejects malformed envelopes, missing lineage, missing reason codes, sequence drift, event-count mismatch, and digest mismatch.

## Verification

```bash
npm run verify:execution-lifecycle
npm run verify:chaos
```
