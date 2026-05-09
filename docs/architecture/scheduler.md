<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Scheduler Primitives (Deterministic Foundation)

Status: **Implemented (primitive planning)**.

Scheduler consumes request envelope, classification, policy result, registry state, and degraded signals.
It computes deterministic candidate scores, stable tie-breaking, exclusion reasons, and explicit fallback plans.
No autonomous orchestration or distributed runtime handoff is implemented in this phase.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.
