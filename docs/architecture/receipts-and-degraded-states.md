<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Receipts And Degraded States
## Purpose
Provide trustworthy provenance for decisions and explicit degraded-state semantics.
## Current repo status
Partial. Some audit/degraded outputs exist in specific modules, but no unified receipt and degraded-state taxonomy contract.
## Target behavior
Emit structured execution receipts and standard degraded reason codes for decision and execution phases.
## Key contracts/types expected
Execution receipt schema, degraded-state enum/code list, cause chain, operator-visible summary.
## Failure/degraded behavior
Receipt creation failure should itself be surfaced; sensitive execution paths may fail closed when receipt integrity cannot be guaranteed.
## Verification expectations
Schema tests, end-to-end tests asserting receipt generation, degraded-state contract coverage tests.
## Dependencies
Control-plane decisions, scheduler/policy outputs, observability sinks.
## Non-goals
Human-readable logs as the sole provenance mechanism.
## Open questions
Receipt storage format/versioning and retention lifecycle.
