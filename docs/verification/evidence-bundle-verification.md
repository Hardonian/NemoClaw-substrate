<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Evidence bundle verification

## Targeted tests

```bash
npx vitest run src/lib/control-plane/evidence-bundles.test.ts
```

This suite verifies:
- deterministic bundle hash stability
- export ordering stability across input permutations
- missing lineage rejection
- replay package integrity
- secret redaction before export
- malformed and tampered bundle rejection

## Release verification

Run the release gate after evidence export changes:

```bash
npm run verify:release
npm run typecheck
npm run lint
npm run verify:changelog-hygiene
git diff --check
```

The evidence bundle tests are targeted export tests. They do not replace the release gate, which still covers changelog hygiene, typecheck, lint, control-plane tests, probe tests, governed routing tests, and degraded-state chaos coverage.

## Expected boundaries
Evidence bundle verification proves deterministic packaging and validation only. It does not claim orchestration, distributed execution, policy mutation, trust mutation, or background telemetry collection.
