<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# 10-Minute Review

This walkthrough uses local code, tests, and fixtures only. It does not require a GPU, OpenShell sandbox, remote worker, or live inference endpoint.

## 1. Build The CLI

```bash
npm run build:cli
```

Expected: TypeScript emits CLI artifacts. This is needed because `bin/nemoclaw.js` runs the compiled CLI from `dist/`.

## 2. Inspect Fixture-Backed Operator Output

```bash
node ./bin/nemoclaw.js operator status --json
node ./bin/nemoclaw.js operator degraded --json
```

Expected: deterministic JSON from `fixtures/demo/`. Demo tokens in fixture details are redacted before printing.

Proof files:

- `src/lib/commands/operator.ts`
- `src/lib/operator/format.ts`
- `test/operator/operator.test.ts`
- `fixtures/demo/status.json`
- `fixtures/demo/degraded.json`

## 3. Run Lifecycle And Replay Checks

```bash
npm run verify:execution-lifecycle
npm run verify:chaos
```

Expected: lifecycle tests accept legal transitions and reject illegal transitions, missing governance metadata, replay drift, ownership mismatch, lease mismatch, proofpack tampering, and hidden degraded-state triggers.

Proof files:

- `src/lib/control-plane/execution-lifecycle.ts`
- `src/lib/control-plane/execution-lifecycle.test.ts`
- `src/lib/control-plane/degraded-state-chaos.test.ts`

## 4. Check Proofpack And Export Helpers

```bash
npm run verify:proofpack
npm run verify:export
```

Expected: these commands are local. If no proofpack fixture exists, `verify:proofpack` exits successfully with a clear skip message. Export verification scans source and network policy configuration.

Proof files:

- `scripts/verify-proofpack.ts`
- `scripts/verify-export.ts`
- `src/lib/control-plane/evidence-export.ts`
- `src/lib/control-plane/evidence-export.test.ts`

## 5. Check Claims

```bash
npm run review:claims
```

Expected: the evidence index is parseable and each major claim has implementation and test references.

## What Is Intentionally Not Happening

- No live worker is contacted.
- No networked inference request is made.
- No policy is promoted automatically.
- No queue worker or retry loop starts in the background.
- No GPU scheduling claim is made.
