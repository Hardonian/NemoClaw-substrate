<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local bootstrap reliability

## Normal bootstrap path

```bash
npm install
cd nemoclaw && npm install && npm run build
cd ..
npm run verify:core
```

## Restricted-environment fallback

If lifecycle scripts fail because the environment cannot reach required registries or blocks install hooks, use this local-only fallback:

```bash
npm install --ignore-scripts
cd nemoclaw && npm install --ignore-scripts
cd ..
node scripts/verify-core.js
```

`npm install --ignore-scripts` is for contributor-side diagnosis only. Do not use it for release packaging, publish flows, or CI baselines because it skips lifecycle behavior that release artifacts depend on.

## Interpreting fallback results

- `PASS` means the targeted check ran and succeeded.
- `WARN` means a required toolchain/dependency was missing in the local environment.
- `FAIL` means the repository check executed and failed.

Use `node scripts/verify-core.js --strict` when you need local behavior equivalent to CI failure semantics.
