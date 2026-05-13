<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]

### Added

- Review automation scripts (`check-claims.mjs`, `check-doc-links.mjs`, `check-status-matrix.mjs`, `check-no-theatre.mjs`, `check-fixtures-redacted.mjs`, `check-spdx-docs.mjs`, `check-proofpack.mjs`, `check-doc-index.mjs`) and the `npm run review:all` aggregate script.
- Deterministic fixture generation for receipts, replay envelopes, and diagnostics.
- Operator CLI smoke test harness using generated fixtures in demo mode.
- Schema documentation index and guidelines.
- Site Map and Navigation Map for docs.

- Canonical policy evaluation with scope inheritance, explicit overrides, and replay-safe traces.
- Execution lifecycle contracts for plans, queue records, leases, idempotency, receipts, replay checks, proofpack validation, and diagnostics.
- Security policy helpers for transport, network, command descriptors, redaction, and proofpack/export preflight.
- Opt-in governed provider routing and guarded remote execution boundaries behind explicit environment flags.
- Worker identity, trust, attestation, telemetry probe, and registry update records with explicit unavailable/degraded outcomes.
- Operator fixture surfaces, profiles, benchmarks, and local demo commands for review.
- Reviewer evidence docs: evidence index, 10-minute review, decision map, tradeoffs, naming audit, and verification guide.
- Lightweight review scripts: `npm run review:claims` and `npm run review:paths`.

### Changed

- Rewrote the README as a concrete review entrypoint with design bias, non-claims, fast local proof, reviewer path, and limitations.
- Consolidated docs navigation around review, architecture, verification, and demo entrypoints.
- Reworked ADRs so each decision has concrete context, alternatives, costs, implementation links, and verification commands.
- Routed remote probes, remote execution, local probe URLs, operational events, diagnostics redaction, and export helpers through shared security policy checks.
- Clarified that remote execution, heterogeneous routing, and operator outputs are opt-in or fixture-backed where applicable.
- Rewrote changelog entries into normal release-note groups.

### Fixed

- `nemoclaw operator` is now routed as a global oclif command so the local review demo can run after `npm run build:cli`.
- Replay and proofpack validation reject digest mismatch, missing lineage, receipt mismatch, lease mismatch, ownership mismatch, trust drift, missing reason codes, and hidden degraded-state triggers.
- Changelog hygiene now has one SPDX header, one changelog title, and no duplicate `Unreleased` section.

## 2026-05-09

### Added

- Deterministic governance foundation: policy evaluator, task classification, scheduler primitives, degraded-state records, and initial receipt/scheduling contracts.
- Foundational control-plane contracts, device registry service, degraded-state taxonomy, and receipt primitives.
- Tests for policy evaluation, task classification, scheduler determinism, degraded-state explicitness, and replay drift.

### Fixed

- Normalized duplicate changelog header/content from an earlier checkpoint.
