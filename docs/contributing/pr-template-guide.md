<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# PR Template Guide (Fork-Specific)

This guide clarifies how to structure PRs for this fork's operator-grade execution and governance goals.

## Required PR structure

1. **Problem statement**
   - What operator or governance problem is being solved?
2. **Scope**
   - What changed in this PR?
3. **Non-goals / out of scope**
   - What intentionally did not change?
4. **Current state vs intended roadmap**
   - Which claims are implemented now, and which are roadmap intent?
5. **Control-plane / policy impact**
   - Which execution or policy paths are affected?
6. **Degraded-state behavior**
   - How degraded/fallback/error states are surfaced.
7. **Verification notes (required)**
   - Exact commands run.
   - Outcomes.
   - Known environment limitations.

## PR conventions

- Keep claims grounded in branch code/docs.
- Do not claim runtime capabilities that are not implemented.
- Prefer explicit failure/degraded semantics over silent fallback language.
- If user-facing behavior changes, update relevant docs in the same PR.

## Expected verification notes in every PR

Every PR should include a verification section that lists:

- test/lint/typecheck commands actually run,
- pass/fail status for each command,
- any skipped checks and why,
- any observed degraded behavior and how it is reported.

Example verification note format:

- `npm test` — pass
- `make check` — pass
- `cd nemoclaw && npm test` — pass
