<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Benchmark Verification

Benchmark coverage is limited to local proofpack helper behavior.

```bash
npm run verify:benchmarks
```

Relevant files:

- `src/lib/performance/proofpack-benchmark.ts`
- `src/lib/performance/proofpack-benchmark.test.ts`
- `scripts/verify-benchmarks.ts`

This does not benchmark a live worker fleet, GPU scheduler, or remote inference path.
