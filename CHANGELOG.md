<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Changelog

All notable changes to this fork are documented in this file.

## [Unreleased]

### Added

- Current-state architecture audit documentation (`docs/architecture/current-state.md`).
- Target-state architecture documentation (`docs/architecture/target-state.md` + detailed architecture component docs).
- ADR scaffolding and governance decisions (`docs/adr/0001` through `0007`).
- Roadmap update with dependency graph and phased workstreams (`docs/roadmap.md`).
- Verification matrix for documentation, contracts, scheduler, policy, receipts, degraded states, observability, and release-readiness (`docs/verification/verification-matrix.md`).

### Changed

- README updated to clarify fork purpose, current-state vs roadmap, architecture doc locations, and PR verification expectations.

## 2026-05-09

- Fixed CHANGELOG header/content duplication from prior PR and normalized single SPDX/changelog header.
- Added deterministic governance foundation: policy evaluator, task classification, scheduler primitives, governed fallback records, and initial receipt/scheduling seams.
- Added tests for policy/classification/scheduler determinism and fallback explicitness.

## 2026-05-09
- Added foundational control-plane contracts, device registry service, degraded-state taxonomy, and receipt primitives (scaffolded integration only).
