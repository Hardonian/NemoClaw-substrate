<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Branch Strategy

## Branch naming conventions

Use:

`<type>/<area>-<short-purpose>`

Recommended `type` values:

- `docs`
- `feat`
- `fix`
- `refactor`
- `test`
- `chore`

Examples:

- `docs/fork-rationale-foundation`
- `feat/deterministic-scheduler-contracts`
- `fix/policy-eval-degraded-reporting`

## Branch scope conventions

- One branch should target one primary objective.
- Keep docs-only and runtime-behavior changes separate when practical.
- If docs and code change together, docs must describe:
  - what is implemented now,
  - what remains roadmap intent.

## Commit style conventions

Follow Conventional Commits required by the repo:

`<type>(<scope>): <description>`

Examples:

- `docs(fork): define fork rationale and roadmap docs`
- `feat(policy): add supervised promotion decision envelope`
- `fix(scheduler): report deterministic fallback as degraded`

Commit guidance:

- Keep commits logically grouped and reviewable.
- Prefer imperative, precise commit descriptions.
- Avoid bundling unrelated concerns in one commit.

## Merge hygiene

- Rebase on `main` before merge when possible.
- Link related/blocked PRs in description.
- Keep PRs small enough for deterministic review.
