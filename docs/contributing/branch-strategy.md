<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Branch Strategy

## Naming format

Use:

`<type>/<area>-<short-purpose>`

Examples:

- `docs/fork-architecture-baseline`
- `feat/control-plane-decision-envelope`
- `feat/device-registry-capability-snapshot`
- `fix/scheduler-stable-sort`

## Scope rules

- One branch = one primary workstream objective.
- Keep docs-only work isolated from runtime behavior changes when possible.
- If runtime and docs both change, ensure docs describe exactly what changed and what did not.

## Merge hygiene

- Prefer small, reviewable PRs with explicit dependency relationships.
- Link dependent branches/PRs in descriptions.
- Rebase on `main` before merge to keep deterministic history.
