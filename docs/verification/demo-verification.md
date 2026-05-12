<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Demo Verification

The canonical demo is [Local proof](../demo/local-proof.md).

Verify the demo path with:

```bash
npm run build:cli
node ./bin/nemoclaw.js operator status --json
npm run verify:execution-lifecycle
npm run verify:chaos
```

The demo is fixture-backed. Treat it as proof of output shape, redaction, and local control-plane validation, not as proof of live GPU or remote-worker operation.
