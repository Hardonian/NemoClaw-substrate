<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local bootstrap reliability

## Normal install

```bash
npm install
cd nemoclaw && npm install && npm run build
```

## Environment-restricted fallback

If lifecycle scripts fail because your environment cannot reach required registries, use this **local verification fallback**:

```bash
npm install --ignore-scripts
cd nemoclaw && npm install --ignore-scripts
npm run typecheck
npm test
```

> `--ignore-scripts` is for contributor-side verification only. Do not use it for production packaging or release publishing.
