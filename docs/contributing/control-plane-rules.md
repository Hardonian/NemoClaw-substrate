<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Control-plane contributor rules

- No hidden fallbacks.
- No prompt-defined policy enforcement.
- Deterministic ordering is required for registry, receipts, and serialized contracts.
- Degraded state must be explicit and truthful.
- Receipt records are required for control decisions when integrated.
- State transitions must be explicit and explainable.
- Reuse upstream NemoClaw terminology (shields, provider, runner, state, registry, audit).


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.

## Runtime seam rules

- Preserve existing runtime behavior by default.
- Block only when policy explicitly returns deny or approval_required.
- Never silently continue after policy deny/approval_required.
- Mark runtime seam coverage as partial unless fully proven.

- New rule: policy-promotion proposals must be review-only artifacts; automatic policy mutation is forbidden.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 governed routing update
Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.

## 2026-05-09 guarded remote execution rules update
- Remote execution must remain disabled unless `NEMOCLAW_REMOTE_EXECUTION=1` is explicitly set.
- Deny and `approval_required` outcomes must block transport calls and emit receipts/events.
- No autonomous distributed orchestration, no automatic worker routing, no SSH execution in this phase.
