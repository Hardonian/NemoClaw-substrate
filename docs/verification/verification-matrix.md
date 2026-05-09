<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Verification Matrix

## Canonical verification commands

- `npm run verify:changelog-hygiene`
- `npm run verify:control-plane`
- `npm run verify:local-probes`
- `npm run verify:remote-probes`
- `npm run verify:governed-routing`
- `npm run verify:core`
- `npm run verify:all`

## CI baseline

The `verify` GitHub Actions workflow runs:

1. `npm ci`
2. changelog hygiene
3. `npm run typecheck`
4. `npm run typecheck:cli`
5. `npm run lint`
6. targeted control-plane/probe/governed routing verification
7. `git diff --check`

CI is authoritative for release readiness because it runs with full dependency installation.

## Local restricted-environment baseline

When dependency bootstrap is constrained, run:

```bash
node scripts/verify-core.js
```

This preserves deterministic ordering while marking missing dependency/toolchain conditions as `WARN` instead of misreporting a repository failure.

Use strict mode for fail-fast release parity:

```bash
node scripts/verify-core.js --strict
```

## Scope notes

- Remote HTTP probe verification is seam-level and mock-driven.
- SSH probe remains a placeholder seam and is verified as explicit not-implemented behavior.
- No claims of distributed execution, autonomous GPU orchestration, or Dynamo integration are made by this verification matrix.
