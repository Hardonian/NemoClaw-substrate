<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Provider Routing Integration (Guarded)

Default NemoClaw provider routing remains unchanged unless `NEMOCLAW_GOVERNED_ROUTING=1` is set.

## Seam audit

- Default flow: onboard/provider selection persists provider+model and OpenShell route; runtime uses that route.
- Guarded integration seam: control-plane provider-selection boundary (`provider:select`) before execution.
- Why low risk: preserves existing behavior when disabled and avoids changes to onboard/blueprint state persistence.
- Deferred seams: remote worker execution, distributed selection, Dynamo orchestration, GPU telemetry adapters.

## Guarded behavior

- Disabled (default): no scheduler policy enforcement on live routing.
- Enabled: request classification, policy evaluation, local capability snapshot/registry scheduling, explicit deny/approval block, receipt/event emission.
- No candidate: explicit error unless degraded state is explicitly enabled (`NEMOCLAW_GOVERNED_ROUTING_ALLOW_DEGRADED_STATE=1`), with degraded state recorded in receipt.

## Worker probe and telemetry adapter note (2026-05-09)

- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.

## 2026-05-09 heterogeneous routing update

- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- No SSH execution, no Dynamo/GPU balancing claims, and no background daemon/autonomous worker routing.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

## 2026-05-09 dispatch boundary wiring

- The runtime/provider dispatch seam now calls the heterogeneous bridge through `runtime-dispatch-integration.ts` under explicit flags.
- Disabled or partially enabled flags preserve existing local provider dispatch exactly.
