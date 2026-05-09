<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Policy Engine
## Purpose
Evaluate inspectable policy artifacts to constrain/control execution decisions.
## Current repo status
Partial. Repository has policy files and schemas; a decision-time policy engine with promotions/approvals is planned.
## Target behavior
Deterministic policy evaluation with versioned artifacts, supervised promotion workflow, and rollback support.
## Key contracts/types expected
Policy bundle version, evaluation input, decision verdict, approval gate metadata, promotion proposal.
## Failure/degraded behavior
Invalid policy bundle fails closed; non-critical advisory policy sources may degrade with explicit notices.
## Verification expectations
Schema validation, golden tests for policy decisions, promotion workflow tests, rollback tests.
## Dependencies
Control-plane contracts, approval workflows, receipts.
## Non-goals
Policy logic encoded only in prompts.
## Open questions
Policy DSL choice and migration strategy from current preset-oriented policy files.
