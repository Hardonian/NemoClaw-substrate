<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]

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

### Changed

- README updated to clarify fork purpose, current-state vs roadmap, architecture doc locations, and PR verification expectations.

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
