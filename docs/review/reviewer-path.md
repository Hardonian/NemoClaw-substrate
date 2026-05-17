<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reviewer Path

Use this path when reviewing the fork for technical credibility. It avoids the long-form doctrine pages and starts with evidence.

## Ten Minutes

1. Read the repository entrypoint: `README.md`.
2. Run the local proof: [10-minute review](10-minute-review.md).
3. Check claim coverage: [Evidence index](evidence-index.md).
4. Read the high-level architecture: [Decision map](../architecture/decision-map.md).
5. Read the tradeoffs: [Tradeoffs](../architecture/tradeoffs.md).

## What To Inspect First

| Question | File |
|---|---|
| How are lifecycle records represented? | `src/lib/control-plane/execution-lifecycle.ts` |
| What rejects replay drift? | `src/lib/control-plane/replay.ts`, `src/lib/control-plane/execution-lifecycle.test.ts` |
| What blocks remote execution? | `src/lib/control-plane/remote-execution.ts`, `src/lib/security/security-policy.ts` |
| What proves proofpack/export integrity? | `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-export.test.ts` |
| What is fixture-backed demo output? | `src/lib/commands/operator.ts`, `fixtures/demo/` |

## Review Boundaries

Treat the following as explicit non-claims:

- no production-readiness claim;
- no distributed worker fabric;
- no automatic retry or recovery daemon;
- no GPU balancing implementation;
- no cryptographic attestation chain;
- no automatic policy learning.

The current value is the tested contract surface. The roadmap should be judged by whether it preserves those contracts, not by the number of future-facing pages.
