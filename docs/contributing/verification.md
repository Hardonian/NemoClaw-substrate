<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Contributor verification workflow

## Primary verification commands

Run checks in this order for deterministic local verification:

```bash
npm run verify:changelog-hygiene
npm run verify:control-plane
npm run verify:local-probes
npm run verify:remote-probes
npm run verify:governed-routing
npm run verify:core
npm run verify:all
```

- `verify:core` runs a deterministic sequence and reports `PASS`, `WARN`, and `FAIL`.
- `verify:all` runs `verify:core` in strict mode (`--strict`).

## Failure semantics

- `PASS`: check executed and repository behavior matched expected results.
- `WARN`: environment/toolchain dependency was unavailable (for example missing binary or missing npm dependency).
- `FAIL`: repository check ran and failed.

In relaxed mode, `verify:core` exits non-zero only for `FAIL`. In strict mode, warnings also fail the run.

## CI vs restricted local environments

CI (`.github/workflows/verify.yml`) performs full dependency installation with `npm ci` and treats all failures as blocking.

Restricted local environments can still gather useful signal using relaxed `verify:core`, which distinguishes bootstrap/toolchain issues from repository failures.
