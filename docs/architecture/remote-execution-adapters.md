<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Remote execution adapters

Remote worker execution is **opt-in only** via `NEMOCLAW_REMOTE_EXECUTION=1`.

Current implementation is a **guarded scaffold seam**:
- policy-gated before any transport call
- explicit `approval_required` blocking unless approved context is provided
- HTTP adapter prototype with mockable transport and timeout-bounded calls
- receipt/event emission and replay-safe result records

Not implemented in this phase:
- SSH execution
- background daemon
- distributed orchestration/Dynamo integration
- automatic worker routing or provider behavior mutation

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- No SSH execution, no Dynamo/GPU balancing claims, and no background daemon/autonomous worker routing.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

## Worker trust and attestation constraints (2026-05-09)
- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.
