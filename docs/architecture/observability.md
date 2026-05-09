<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Observability
## Purpose
Make control and execution decisions inspectable, explainable, and auditable.
## Current repo status
Partial. CLI diagnostics, log helpers, and narrow audit modules exist; no unified control-plane observability model yet.
## Target behavior
Structured events derived from request envelopes, policy decisions, scheduler outcomes, receipts, and degraded states.
## Key contracts/types expected
Event schema, correlation identifiers, receipt linkage, severity/degraded tagging.
## Failure/degraded behavior
Observability transport failures must be explicit and must not masquerade as complete trace coverage.
## Verification expectations
Event schema tests, correlation integrity tests, replay trace completeness checks.
## Dependencies
Receipts, device registry metadata, control-plane contracts.
## Non-goals
Cosmetic dashboards without verifiable underlying evidence.
## Open questions
Storage sinks and default retention for local operator deployments.
