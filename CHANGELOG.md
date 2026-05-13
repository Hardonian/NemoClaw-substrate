<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]

### Added

- **Review Check Tooling:** Lightweight scripts (`check-claims.mjs`, `check-doc-links.mjs`, `check-status-matrix.mjs`, `check-no-theatre.mjs`, `check-fixtures-redacted.mjs`, `check-spdx-docs.mjs`, `review-all.mjs`) to verify documentation integrity and security posture.
- **Schema Snapshot Tooling:** Added baseline JSON schemas for schemas review and snapshot tooling framework.
- **Deterministic Fixtures:** Added `generate-fixtures.mjs` script to produce reproducible, stable, and redacted JSON fixtures without requiring a live network or GPU.
- **Operator CLI Smoke Harness:** Verified the existence of the operator CLI smoke test script `operator-cli-smoke.mjs` to validate table outputs and JSON parsing in demo mode.
- **Evidence/Proofpack Helper:** Confirmed review helper script `check-proofpack.mjs` and verification checks documentation exist.
- **Docs Navigation Indexer:** Validated doc index verification in `check-doc-index.mjs` ensuring site map and navigation map remain intact.
- **Verification Integration:** Added basic test suite `tests/review-automation.test.mjs` for testing review automation tools.

- **Phase 1 — Persist Lifecycle Records:** `FileOperationalMemoryStore` in `src/lib/control-plane/operational-memory.ts` — zero-dependency, append-only JSONL persistence adapter with atomic writes, crash-recovery replay, malformed-line tolerance, and explicit compaction. Configurable via constructor (file path, flush interval, max file size). 18 unit tests cover append, replay, malformed-line tolerance, and compaction.
- **Phase 2 — Add Policy Linting:** `nemoclaw policy lint` CLI command with schema validation (AJV draft-2020-12), semantic correctness checks (wildcard detection, shell injection, unrestricted access, root process, unreachable branches, permissive filesystem), and CI gate (non-zero exit on violations). Lints YAML and JSON policy files with line-accurate error reports. 17 unit tests.
- **Phase 3 — Improve Fixture Generation:** Unified deterministic fixture generator at `scripts/generate-fixtures.ts` with `--seed` flag for reproducible output. Idempotent — two runs with same seed produce bitwise-identical fixtures. Validates all output after generation. CI gate at `.github/workflows/fixture-check.yaml` and `npm run check-fixtures` script. `npm run generate-fixtures` regenerates all fixtures under `fixtures/generated/`.
- **Phase 4 — Wire Opt-in Remote Worker Proof:** SSH and signed HTTPS transport implementations in `src/lib/control-plane/remote-execution.ts`. `executeSshCommand` uses native `ssh` CLI (zero dependencies). `executeSignedHttps` includes request signing and signature verification. `computeOutputHash` and `verifyResultHash` for result verification. All failures recorded in lifecycle store. Remote proof disabled by default (opt-in via `NEMOCLAW_REMOTE_EXECUTION=1`). No background workers, daemons, or retry loops. 21 unit tests.
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

- **Phase 5 — Narrow and Consolidate Documentation:** Merged `supportability-doctrine.md`, `upgrade-doctrine.md`, and `rollback-doctrine.md` into single `operational-doctrine.md`. Updated all cross-references across docs. Added last-reviewed dates and code/test links to new document.
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
