<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# How To Verify

Run the smallest command that proves the surface you touched, then run the aggregate gate before proposing a release.

## Local Review Gate

```bash
npm run build:cli
npm run review:claims
npm run verify:execution-lifecycle
npm run verify:chaos
git diff --check
```

Use this for docs/review changes and control-plane proof work.

## Release Gate

```bash
npm run verify:release
```

This runs:

- `npm run verify:changelog-hygiene`
- `npm run verify:core`
- `npm run typecheck`
- `npm run lint`
- `npm run verify:chaos`

## Targeted Commands

| Surface | Command |
|---|---|
| Changelog hygiene | `npm run verify:changelog-hygiene` |
| Core control-plane checks | `npm run verify:core` |
| Lifecycle proof | `npm run verify:execution-lifecycle` |
| Degraded-state and replay chaos | `npm run verify:chaos` |
| Local probes | `npm run verify:local-probes` |
| Remote probes and trust gating | `npm run verify:remote-probes` |
| Governed routing | `npm run verify:governed-routing` |
| Proofpack script | `npm run verify:proofpack` |
| Export scan | `npm run verify:export` |
| Docs build | `npm run docs:strict` |

## Environment Notes

On WSL, set temp directories to Linux paths before running TypeScript or Vitest if socket-path errors appear:

```bash
TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm run verify:release
```

If docs fail because `uv`, Sphinx, or docs dependencies are missing, report that as an environment/toolchain blocker. Do not convert it into a green docs claim.
