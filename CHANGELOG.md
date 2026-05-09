<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]
- security: add deterministic transport, network, command-safety, redaction, and proofpack/export policy guards without changing default runtime behavior.
- hardening: close governed substrate residual matrix with direct replay drift rejection assertions, reserved-event observability guardrails, and docs/status coherence updates (no new runtime features).
- trust: add worker identity, trust-level and attestation-status records to control-plane node descriptors; add deterministic capability attestation/trust decision helpers; enforce remote execution trust gating for revoked/expired/conflicted/insufficient trust workers; and emit explicit worker trust/attestation operational events.
- release: completed governed substrate readiness closure pass with claim-audit normalization, status taxonomy docs, and release verification gate wiring.
- telemetry hardening: dedicated operational telemetry event taxonomy (`telemetry_probe_*`, `telemetry_parse_*`, `telemetry_unavailable/stale/conflict_detected`, `telemetry_registry_update_*`), explicit mapping in probe flows, and telemetry observability/replay validation coverage with unchanged routing defaults.
- telemetry: added explicit local GPU telemetry adapters (`nvidia-smi` observed/unavailable/malformed/timeout states), runtime metadata parsing for configured local runtime probes, registry/diagnostics/event integration, and non-fatal unavailable telemetry behavior while preserving routing defaults.

### Added
- Added opt-in governed provider-routing integration behind `NEMOCLAW_GOVERNED_ROUTING=1`, with policy enforcement at provider-selection boundary, explicit no-candidate/fallback handling, and governed routing receipts/events/diagnostics.
- Added governed provider-routing tests for default behavior preservation, feature-flag parsing, policy deny/approval blocking, no-candidate behavior, fallback constraints, receipt/event emission, and diagnostics state reporting.
- Added worker/device adapter contracts and local provider capability adapter with explicit unknown-hardware degraded-state reporting.
- Added scheduler-to-provider dry-run bridge, diagnostics summary helper, and dry-run operational receipt/event emission without changing live routing.
- Added tests covering worker adapter determinism, dry-run no-execution behavior, diagnostics summaries, and policy-denied summaries.
- Current-state architecture audit documentation (`docs/architecture/current-state.md`).
- Target-state architecture documentation (`docs/architecture/target-state.md` + detailed architecture component docs).
- ADR scaffolding and governance decisions (`docs/adr/0001` through `0007`).
- Roadmap update with dependency graph and phased workstreams (`docs/roadmap.md`).
- Verification matrix for documentation, contracts, scheduler, policy, receipts, degraded states, observability, and release-readiness (`docs/verification/verification-matrix.md`).
- Operational intelligence substrate scaffolding: append-only operational memory, deterministic replay envelope validation, observability aggregations, and supervised policy-promotion proposals.
- Runtime seam diagnostics now include operational event counts without changing routing behavior.
- Hygiene test for duplicate CHANGELOG/SPDX header detection.
- Added `scripts/verify-changelog-hygiene.js` and extended changelog hygiene tests to detect duplicate SPDX headers, duplicate `# Changelog`, and duplicate exact bullet entries.
- Added explicit local runtime probe execution helper with deterministic ordering, bounded timeouts, local-only URL guardrails, degraded-state surfacing, and operational event emission.
- Added local diagnostics summary helper exposing probe/degraded state, registry summary, telemetry availability, governed routing state, and optional dry-run result.
- Added contributor local bootstrap guidance including environment-restricted `npm install --ignore-scripts` verification fallback (local verification only).
- Added failure-injection tests for local probe unavailable/timeout/malformed/non-local URL behavior and diagnostics degraded-state visibility.
- Added guarded remote probe contracts: authenticated remote HTTP health-check seam with strict URL/timeout validation, redacted auth metadata, degraded-state mapping, SSH `not_implemented` placeholder, and registry/receipt/diagnostic integration without remote execution.
- Wired heterogeneous routing bridge into the runtime/provider dispatch seam behind explicit `NEMOCLAW_HETEROGENEOUS_ROUTING`, `NEMOCLAW_GOVERNED_ROUTING`, and `NEMOCLAW_REMOTE_EXECUTION` guards, preserving default local behavior when disabled.
- Added security policy contracts and tests for URL/network safety, timeout ceilings, structured secret redaction, descriptor-only command safety, transport blocking before fetch/remote calls, and proofpack/export preflight.

### telemetry
- add remote runtime telemetry enrichment and parser adapters (Ollama/vLLM/llama.cpp/NIM/generic)
- define explicit registry telemetry persistence policy (observed/partial/unavailable/stale/conflict provenance)
- expand diagnostics and runtime events for telemetry source/confidence and registry update decisions

### Changed
- README updated to clarify fork purpose, current-state vs roadmap, architecture doc locations, and PR verification expectations.
- routing: add opt-in heterogeneous scheduler bridge connecting local provider and guarded remote execution candidates, with explicit policy gating, deterministic candidate diagnostics, and receipt-recorded fallback behavior.
- execution: add guarded remote execution adapter seam behind `NEMOCLAW_REMOTE_EXECUTION=1` with policy/approval gating, HTTP scaffold transport, receipt/event emission, replay-safe records, and diagnostics visibility.
- security: route remote probes, remote execution, local probe URLs, operational events, diagnostics redaction, and proofpack/export helpers through fail-closed security policy checks.

## 2026-05-09
- Fixed CHANGELOG header/content duplication from prior PR and normalized single SPDX/changelog header.
- Added deterministic governance foundation: policy evaluator, task classification, scheduler primitives, governed fallback records, and initial receipt/scheduling seams.
- Added foundational control-plane contracts, device registry service, degraded-state taxonomy, and receipt primitives (scaffolded integration only).
- Added tests for policy/classification/scheduler determinism and fallback explicitness.

## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.

- hardening: added deterministic degraded-state chaos verification coverage spanning governed routing denial/no-candidate paths, remote execution disabled/deny/approval/timeout outcomes, telemetry non-erasure under unavailable/malformed probes, replay digest mismatch detection, and diagnostics empty-state assertions.
