<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy Engine (Deterministic Foundation)

Status: **Implemented**.

Implements a deterministic policy bundle/rule evaluation engine for control-plane requests. It supports scope inheritance, precedence ordering, explicit overrides, and deterministic replay-safe evaluation traces. Outcomes are strictly explicit: `allow`, `deny`, `approval_required`.

## Core Mechanics

- **Scope Hierarchy**: Policies are grouped into packs defined at specific scopes (`global`, `environment`, `runtime`, `worker`, `execution`, `operator`, `emergency`).
- **Deterministic Precedence**: Higher scopes preempt lower scopes. Within the highest matching scope, the effect precedence is strictly: `deny` > `approval_required` > `allow`.
- **Overrides**: Overrides can target specific rules to change their effects and reason codes, maintaining strict operator attribution and timestamping.
- **Fail-Closed**: Evaluation errors natively fail-closed (evaluating to `deny`).
- **Evaluation Trace Export**: Every evaluation produces a replay-safe trace including a full decision graph containing rule evaluations and override applications.

## Runtime seam status (2026-05-09)

Policy evaluation is wired into a low-risk runtime adapter for governed test actions and provider/tool-like wrappers. Full runtime governance remains deferred, but the deterministic foundation is complete.

## 2026-05-09 governed routing update

Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.
