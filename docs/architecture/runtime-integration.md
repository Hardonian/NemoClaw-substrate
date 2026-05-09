<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime Integration (Safe Seams)

This document tracks low-risk runtime seams where governed execution primitives are integrated without changing default provider routing.

## Safe seams integrated now

- Control-plane runtime wrapper for action descriptors and policy evaluation (`src/lib/control-plane/runtime-seams.ts`).
- Explicit deny and approval-required blocking behavior for governed test actions.
- Receipt construction for provider/tool-like runtime events.
- Operator-readable diagnostics summary from latest receipt.

## Unsafe seams intentionally deferred

- Global interception of every command path.
- Automatic routed-provider remapping or scheduler handoff.
- Remote execution auto-enable.

## Receipt emission candidates

- Provider invocation wrappers.
- Sandbox tool/action dispatch wrappers.
- Diagnostic and dry-run execution paths.

## Policy enforcement candidates

- Sandbox command action descriptors.
- Tool/action execution wrappers.
- Test harness governed actions.

## Behavior preservation notes

- Default behavior remains pass-through unless policy explicitly returns deny or approval_required.
- Denials and approval requirements are surfaced as explicit operator-facing errors.
- Scheduler primitives remain scaffolded and are not yet altering runtime routing decisions.

- Runtime diagnostics summary now reports operational event counts from receipt-derived append-only events.
- Routing behavior remains unchanged; scheduler routing handoff is still planned.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 governed routing update
Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.

## 2026-05-09 guarded remote execution adapter update
- Added opt-in remote execution seam behind `NEMOCLAW_REMOTE_EXECUTION=1`.
- HTTP remote execution adapter is scaffolded/guarded only; SSH execution is not implemented.
- No background daemon, no distributed orchestration, no Dynamo integration, no automatic provider/worker routing changes.
- Policy + approval gates block attempts before transport; receipts/events/diagnostics capture outcomes.
