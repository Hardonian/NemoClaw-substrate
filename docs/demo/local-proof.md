<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local Proof Demo

This demo is deterministic and fixture-backed. It is for repository review, not live sandbox operation.

## Commands

```bash
npm run build:cli
node ./bin/nemoclaw.js operator status --json
node ./bin/nemoclaw.js operator degraded --json
npm run verify:execution-lifecycle
npm run verify:chaos
npm run verify:proofpack
npm run verify:export
```

## What To Expect

`operator status --json` and `operator degraded --json` read from `fixtures/demo/`. The output is sorted and demo token strings are redacted by `src/lib/operator/format.ts`.

`verify:execution-lifecycle` proves legal state transitions, illegal transition rejection, idempotency conflict handling, queue lease conflict detection, proofpack digest validation, and diagnostics states.

`verify:chaos` proves the negative paths: no eligible routing candidate, policy denial, approval required, stale worker, remote transport timeout, replay tampering, and missing replay reason codes.

`verify:proofpack` verifies a proofpack when one is present and otherwise reports a clear local skip. `verify:export` scans source and network policy configuration for export/egress concerns.

## Fixture-Backed Versus Live

| Area | Backing |
|---|---|
| Operator CLI demo output | `fixtures/demo/*.json` |
| Lifecycle proof | Vitest unit tests |
| Replay rejection | Vitest unit tests |
| Remote execution blocking | mocked transport in tests |
| Redaction | unit tests and fixture output formatting |
| Live GPU/network execution | not part of this demo |

## Files Worth Opening

- `src/lib/commands/operator.ts`
- `src/lib/operator/format.ts`
- `src/lib/control-plane/execution-lifecycle.ts`
- `src/lib/control-plane/degraded-state-chaos.test.ts`
- `src/lib/control-plane/remote-execution.test.ts`
- `src/lib/control-plane/evidence-export.test.ts`
