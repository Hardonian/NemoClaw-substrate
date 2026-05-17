<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]

### Added

- Control-plane contracts for plans, queue records, leases, idempotency, receipts, replay checks, proofpack validation, diagnostics, and governed routing.
- Guarded security helpers for transport, network, command descriptors, secret redaction, and proofpack/export preflight.
- Opt-in governed provider routing and guarded remote execution boundaries behind explicit flags.
- Worker identity, structural attestation, probe, telemetry, and registry records with explicit unavailable/degraded outcomes.
- `FileOperationalMemoryStore`, an append-only JSONL persistence adapter with replay, malformed-line tolerance, and explicit compaction.
- `nemoclaw policy lint` with schema validation and semantic checks for unsafe policy patterns.
- Deterministic fixture generation for receipts, replay envelopes, diagnostics, and fixture-backed operator review paths.
- Review automation for claim checks, doc links, status matrices, anti-theatre wording, fixture redaction, SPDX headers, proofpack references, and doc index presence.
- `test/review-automation.test.js` coverage for the review guardrails.

### Changed

- Rewrote the README as a concrete review entrypoint with design bias, non-claims, fast local proof, reviewer path, and limitations.
- Consolidated docs navigation around review, architecture, verification, and demo entrypoints.
- Reworked ADRs so each decision has concrete context, alternatives, costs, implementation links, and verification commands.
- Routed remote probes, remote execution, local probe URLs, operational events, diagnostics redaction, and export helpers through shared security policy checks.
- Clarified that remote execution, heterogeneous routing, and operator outputs are opt-in or fixture-backed where applicable.
- Merged supportability, upgrade, and rollback notes into `docs/operational-doctrine.md` with code/test references.
- Tightened the review guardrails so scanner errors fail the check instead of being swallowed.
- Reworked status matrix validation around explicit canonical labels instead of scanning every table with a loose `status` substring match.

### Fixed

- `nemoclaw operator` is now routed as a global oclif command so the local review demo can run after `npm run build:cli`.
- Replay and proofpack validation reject digest mismatch, missing lineage, receipt mismatch, lease mismatch, ownership mismatch, trust drift, missing reason codes, and hidden degraded-state triggers.
- Replay validation now fails closed on malformed envelopes and recognizes both legacy camelCase and canonical snake_case degraded-state trigger payloads.
- Changelog hygiene now has one SPDX header, one changelog title, and no duplicate `Unreleased` section.

## 2026-05-09

### Added

- Deterministic governance foundation: policy evaluator, task classification, scheduler primitives, degraded-state records, and initial receipt/scheduling contracts.
- Foundational control-plane contracts, device registry service, degraded-state taxonomy, and receipt primitives.
- Tests for policy evaluation, task classification, scheduler determinism, degraded-state explicitness, and replay drift.

### Fixed

- Normalized duplicate changelog header/content from an earlier checkpoint.
