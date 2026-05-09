<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Operational memory

## Status (2026-05-09)
Implemented scaffold in `src/lib/control-plane/operational-memory.ts`.

Operational memory is append-only, supervised, inspectable, and deterministic. It records receipts, policy outcomes, fallback events, degraded-state events, scheduler outcomes, operator overrides, runtime action descriptors, diagnostics snapshots, and replay metadata.

## Guardrails

- No autonomous learning.
- No automatic policy mutation.
- No hidden routing bias.
- No conversational/chat memory semantics.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 remote execution memory update
- Remote execution attempts now emit receipt-linked operational events for disabled, denied, approval-required, degraded, failed, and succeeded outcomes.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- No SSH execution, no Dynamo/GPU balancing claims, and no background daemon/autonomous worker routing.
- Telemetry confidence and degraded states reflect observed registry/probe data only.
## 2026-05-09 telemetry operational taxonomy hardening
- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

- Worker-probe telemetry now records deterministic `telemetry_registry_update_applied`, `telemetry_registry_update_skipped`, `telemetry_conflict_detected`, and `telemetry_stale` categories with replay references and reason codes.

## Worker trust and attestation constraints (2026-05-09)
- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.
