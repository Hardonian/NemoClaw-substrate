<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Operator Walkthrough

The operator command is a read-only inspection surface for review/demo data.

```bash
npm run build:cli
node ./bin/nemoclaw.js operator status --json
node ./bin/nemoclaw.js operator proofpack --json
node ./bin/nemoclaw.js operator approvals --json
```

The command reads from `fixtures/demo/<topic>.json` and formats output through `src/lib/operator/format.ts`. The formatter sorts table rows and redacts token-like values.

Supported topics are defined in `src/lib/commands/operator.ts`.

This is not live telemetry. It is a deterministic way to review output shape, degraded-state rendering, and redaction behavior before wiring the same surfaces to live state.
