<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reviewer Evidence Map

The canonical claim table is [evidence-index.md](evidence-index.md). This page is a reviewer orientation layer: it names the main risk areas, points to the proof path, and keeps older review links from becoming a second source of truth.

## Risk Areas

| Reviewer risk | Current handling | Proof path | Residual risk |
|---|---|---|---|
| Replay accepts a mutated history | Replay validation checks event count, sequence, lineage, reason codes, governance lineage, and digest | `npm run verify:chaos`, `src/lib/control-plane/replay.ts` | Local replay only; no distributed consensus |
| Telemetry is treated as authority | Probe output feeds trust evidence; policy and approval remain separate | `npm run verify:remote-probes`, `docs/architecture/worker-identity-trust.md` | Probe parsing is pattern-based |
| Remote execution becomes a hidden worker fleet | Remote transport is opt-in and blocked before transport on policy, approval, trust, and command failures | `npm run verify:remote-probes`, `src/lib/control-plane/remote-execution.ts` | Bounded adapter only; no fleet manager |
| Proofpack wording overstates trust | Proofpacks use deterministic SHA-256 digests and manifest checks; no hardware signing claim | `npm run verify:proofpack`, `docs/evidence-export-formats.md` | No cryptographic attestation chain |
| Operator output looks live when it is fixture-backed | Operator docs label fixture-backed review/demo paths directly | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` | Not live telemetry |
| Docs drift into target-state language | Review scripts check claims, status labels, anti-theatre wording, links, fixtures, SPDX headers, proofpack references, and doc indexes | `npm run review:all` | Semantic accuracy still needs human review |

## Reviewer Entry Points

1. [10-minute review](10-minute-review.md)
2. [Evidence index](evidence-index.md)
3. [Capability status matrix](../architecture/capability-status-matrix.md)
4. [Architecture decision map](../architecture/decision-map.md)
5. [How to verify](../verification/how-to-verify.md)

When this page disagrees with the evidence index, the evidence index wins.
