<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Replay Walkthrough

Replay proof is covered by local tests rather than a live worker.

```bash
npm run verify:execution-lifecycle
npm run verify:chaos
```

The lifecycle tests build plans, queue items, leases, receipts, diagnostics, and proofpacks, then mutate evidence to prove validation rejects drift.

The chaos tests cover replay envelope tampering and missing reason codes. Open these files while the commands run:

- `src/lib/control-plane/execution-lifecycle.test.ts`
- `src/lib/control-plane/degraded-state-chaos.test.ts`
- `src/lib/control-plane/replay.ts`

What this proves: local replay validation is strict about lineage, digests, ownership, leases, trust metadata, and reason codes.

What it does not prove: durable distributed replay across multiple hosts.
