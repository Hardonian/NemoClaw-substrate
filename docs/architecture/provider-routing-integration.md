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
- No candidate: explicit error unless fallback is explicitly enabled (`NEMOCLAW_GOVERNED_ROUTING_ALLOW_FALLBACK=1`), with fallback recorded in receipt.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.
