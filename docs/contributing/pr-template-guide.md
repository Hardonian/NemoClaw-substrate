<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# PR Template Guide (Fork-Specific)

## Required sections

1. **Problem statement**
   - What operator problem is being solved?
2. **Scope and non-scope**
   - What changed and what intentionally did not change?
3. **Control-plane impact**
   - Which control paths are affected?
4. **Degraded-state behavior**
   - What explicit degraded outputs occur on failure paths?
5. **Receipt/provenance impact**
   - What new evidence is emitted (if any)?
6. **Verification**
   - Exact commands run and outcomes.

## Quality checks before opening PR

- Claims in PR description map to code and docs in the branch.
- No hidden fallback behavior was introduced.
- Policy behavior is explicit and testable.
- If architecture changed, update `docs/architecture/current-state.md` and/or `docs/architecture/target-state.md`.
