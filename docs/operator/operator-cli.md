<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Operator CLI

`nemoclaw operator` is a read-only inspection command for review/demo surfaces.

```bash
npm run build:cli
node ./bin/nemoclaw.js operator status
node ./bin/nemoclaw.js operator status --json
```

Topics:

```text
status diagnostics workers telemetry trust attestation replay receipts proofpack queue policy degraded plans approvals
```

Current backing: JSON fixtures in `fixtures/demo/`.

Useful proof:

- `src/lib/commands/operator.ts` loads topics and selects output format.
- `src/lib/operator/format.ts` sorts and redacts output.
- `test/operator/operator.test.ts` covers deterministic sorting and redaction.

Limitation: this command does not yet read live system state. It proves the output contract and formatting behavior.
