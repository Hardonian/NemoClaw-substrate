<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Operational Memory
## Purpose
Capture repeated operator decisions as auditable signals for future supervised improvements.
## Current repo status
Planned as dedicated subsystem. Existing state captures sessions/config, not an explicit operational-memory contract.
## Target behavior
Append-only memory records tied to receipts; generate policy recommendations requiring human approval.
## Key contracts/types expected
Memory event record, receipt reference, recommendation artifact, approval/promotion link.
## Failure/degraded behavior
Memory write failures should not silently mutate behavior; recommendation generation degrades explicitly.
## Verification expectations
Append-only invariants, deduplication/replay tests, policy recommendation traceability tests.
## Dependencies
Receipts, policy promotion workflow, observability.
## Non-goals
Automatic policy mutation from memory signals.
## Open questions
Retention, PII handling, and operator override conflict resolution.
