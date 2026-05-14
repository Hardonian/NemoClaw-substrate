<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Doctrine

This repository uses "anti-theatre" as an engineering rule, not a slogan. A claim is acceptable only when it can point to source, tests, and a local verifier. If a path is scaffolded, fixture-backed, opt-in, or deferred, the docs must say that plainly.

## Rules

1. **No hidden recovery.** A failed component must surface a degraded, unavailable, stale, blocked, or partial state. It must not be described as success because a later path might recover.
2. **No authority from telemetry alone.** Probe output is evidence. Policy evaluation and operator approval remain the authority boundary.
3. **No prompt-only safety claims.** Security and governance behavior must live in code, config, schemas, tests, or explicit operator action.
4. **No target-state promotion.** A roadmap item stays a roadmap item until implementation and verification exist.
5. **No automatic policy mutation.** Policy promotion may produce proposals. Operators still approve or reject the change.

## Current Implementation Boundaries

| Boundary | Current handling | Verification |
|---|---|---|
| Replay drift | Rejects digest, lineage, ownership, lease, trust, and reason-code drift | `npm run verify:chaos` |
| Degraded states | Emits explicit reason-coded events instead of masking failure | `npm run verify:execution-lifecycle` |
| Proofpack export | Builds deterministic digest-backed evidence bundles; no hardware signing claim | `npm run verify:proofpack` |
| Remote execution | Disabled by default; gated by policy, approval, trust, transport, and command checks | `npm run verify:remote-probes` |
| Operator CLI | Fixture-backed inspection path for review; not live telemetry | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` |

## Wording Rules

Use concrete mechanism names. Avoid words that imply invisible judgment or unverified assurance:

- Replace "seamlessly" with the actual handoff, file, command, or state transition.
- Replace "intelligently" with the deterministic rule, heuristic, or scoring input.
- Replace "automatically heals" with the explicit recovery mechanism, or say that recovery is not implemented.
- Replace "learns policy" with "generates a supervised policy-promotion proposal."

The doctrine is simple: the substrate earns trust by making failure and evidence inspectable.
