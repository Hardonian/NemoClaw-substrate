<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw Substrate Fork

This fork keeps the NemoClaw CLI, OpenShell blueprint, and local sandbox workflow, then adds a reviewable control layer for execution decisions, receipts, replay checks, degraded states, and proofpack-style evidence.

It is alpha software. The useful part today is not a distributed runtime. It is a set of small, testable contracts that make local and opt-in remote execution paths easier to inspect before more orchestration is added.

## Why This Exists

Always-on assistant stacks tend to blur three things: what was requested, what policy allowed, and what actually happened. This fork separates those concerns enough that a reviewer can inspect a decision path without trusting console prose or hidden retries.

The practical problem is narrow:

- keep default local behavior boring and compatible;
- make opt-in routing, remote execution, and proof flows explicit;
- reject replay drift and missing reason codes;
- preserve enough evidence that a future distributed worker cannot silently change the story.

## Design Bias

- Prefer explicit records over inferred success.
- Keep remote execution off unless a caller opts in and supplies the required policy context.
- Treat telemetry as evidence, not authority.
- Let replay fail closed when lineage, digests, ownership, or reason codes do not match.
- Build deterministic helpers first; defer daemons, automatic retries, and distributed scheduling until the contracts are worth depending on.

## What Works Today

| Capability | Current proof | Main files |
|---|---|---|
| Execution lifecycle records for plans, queue items, leases, receipts, replay checks, proofpacks, and diagnostics | `npm run verify:execution-lifecycle` | `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/control-plane/execution-lifecycle.test.ts` |
| Replay envelope validation, malformed input rejection, and drift rejection | `npm run verify:chaos` | `src/lib/control-plane/replay.ts`, `src/lib/control-plane/degraded-state-chaos.test.ts` |
| Opt-in governed provider routing | `npm run verify:governed-routing` | `src/lib/control-plane/governed-provider-routing.ts`, `src/lib/control-plane/runtime-dispatch-integration.ts` |
| Guarded remote execution seam with trust, approval, transport, and command checks | `npm run verify:remote-probes`, `npm run verify:chaos` | `src/lib/control-plane/remote-execution.ts`, `src/lib/control-plane/remote-execution.test.ts` |
| Evidence export and proofpack integrity helpers | `npm run verify:proofpack`, `npm run verify:export` | `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-export.test.ts` |
| Secret redaction and export-boundary checks | `npm run verify:core` | `src/lib/security/security-policy.ts`, `src/lib/security/redaction-audit.test.ts`, `test/secret-redaction.test.ts` |
| Fixture-backed operator inspection surfaces | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` | `src/lib/commands/operator.ts`, `fixtures/demo/`, `test/operator/operator.test.ts` |

For a fuller claim map, see [docs/review/evidence-index.md](docs/review/evidence-index.md).

## What Is Deliberately Boring Here

The strongest parts are ordinary on purpose: typed records, deterministic serialization, table-driven reason codes, explicit feature flags, fixture-backed demos, and tests that mutate evidence to make sure validation rejects it. That is the point. A future scheduler or worker fabric should inherit boring contracts, not invent trust at runtime.

## What This Does Not Claim

This repository does not claim production readiness, autonomous orchestration, GPU balancing, Dynamo integration, cryptographic attestation, automatic policy learning, durable distributed queues, daemon workers, or automatic recovery loops.

Some files describe target states. The implemented review path is the evidence in source, tests, and verification commands.

## Fast Local Proof

These commands do not require a live GPU, live worker, or networked inference endpoint:

```bash
npm run build:cli
node ./bin/nemoclaw.js operator status --json
node ./bin/nemoclaw.js operator degraded --json
npm run verify:execution-lifecycle
npm run verify:chaos
npm run review:claims
```

Expected shape:

- operator output is fixture-backed and redacts demo tokens;
- lifecycle tests accept legal state transitions and reject illegal ones;
- chaos tests reject replay tampering and blocked remote-execution paths;
- the review claim checker verifies that major docs claims point to code and tests.

See [docs/demo/local-proof.md](docs/demo/local-proof.md) for a 10-minute walkthrough.

## How To Run

```bash
npm install
npm run build:cli
node ./bin/nemoclaw.js --help
```

For a full sandbox flow, use the user docs under [docs/get-started/quickstart.md](docs/get-started/quickstart.md). The substrate review path above is intentionally local and fixture-backed.

## How To Verify

```bash
npm run verify:release
npm run verify:core
npm run verify:changelog-hygiene
npm run typecheck
npm run lint
git diff --check
```

`verify:release` aggregates changelog hygiene, core verification, typecheck, lint, and degraded-state chaos coverage. Docs builds are available with `npm run docs:strict` when the Python/Sphinx toolchain is installed.

## Fixture Generation

All fixtures under `fixtures/generated/` are produced by a single deterministic generator:

```bash
npm run generate-fixtures          # regenerate with pinned seed (42)
npx tsx scripts/generate-fixtures.ts --seed 99  # regenerate with custom seed
npm run check-fixtures             # CI gate: verify committed fixtures match generator output
```

Two consecutive runs with the same seed produce bitwise-identical output. The CI build fails if committed fixtures diverge from the generator. Do not hand-edit files under `fixtures/generated/`.

## Reviewer Path

Start here if you have limited time:

1. [10-minute review](docs/review/10-minute-review.md)
2. [Evidence index](docs/review/evidence-index.md)
3. [Architecture decision map](docs/architecture/decision-map.md)
4. [Tradeoffs](docs/architecture/tradeoffs.md)
5. [How to verify](docs/verification/how-to-verify.md)

## Known Limitations

- `FileOperationalMemoryStore` provides JSONL persistence with crash recovery; compaction is an explicit operator action, not automatic.
- Remote execution is a guarded seam, not a worker fleet.
- Trust and attestation are represented structurally; there is no cryptographic attestation chain yet.
- Operator CLI output is currently fixture-backed for review/demo use.
- Some older docs remain as historical detail. The canonical review docs are linked above.

## What Comes Next

The next useful work is not more terminology. It is persistence adapters for lifecycle records, narrower policy linting, better fixture generation, and one real opt-in remote worker proof that keeps the same fail-closed replay and evidence contracts.
