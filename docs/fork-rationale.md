<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Fork Rationale

## Why this fork exists

Upstream NemoClaw is an alpha reference stack for sandboxed OpenClaw operation. This fork keeps that base and adds a stricter operator-control posture for local heterogeneous execution.

The immediate problem: local operators need explicit routing, policy, and evidence semantics that survive failures and audits.

## Design posture for this fork

- Treat routing and policy as control-plane concerns, not prompt behavior.
- Favor deterministic outcomes when identical inputs and state are supplied.
- Expose degraded conditions directly; never present degraded behavior as healthy.
- Preserve append-only execution evidence when possible.
- Require supervised policy promotion and rollback paths.

## Scope boundaries

In scope for this fork:

- local multi-device model execution orchestration
- deterministic scheduling and policy decisions
- receipts/provenance and operator memory surfaces
- observability and hardening for execution control paths

Out of scope for this fork:

- cosmetic dashboards without control authority
- undocumented runtime shifts
- speculative autonomy language unsupported by code
