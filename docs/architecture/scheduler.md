<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Scheduler Primitives (Deterministic Foundation)

Status: **Implemented (primitive planning)**.

Scheduler consumes request envelope, classification, policy result, registry state, and degraded signals.
It computes deterministic candidate scores, stable tie-breaking, exclusion reasons, and explicit fallback plans.
No autonomous orchestration or distributed runtime handoff is implemented in this phase.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- No SSH execution, no Dynamo/GPU balancing claims, and no background daemon/autonomous worker routing.
- Telemetry confidence and degraded states reflect observed registry/probe data only.
