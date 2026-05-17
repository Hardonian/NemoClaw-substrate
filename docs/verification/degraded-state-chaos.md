<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Degraded-State Chaos Verification

This suite hardens deterministic failure-injection coverage for governed routing, remote execution, probes, telemetry provenance, replay integrity, and diagnostics empty-state behavior.

## Covered failure fixtures

- stale registry node
- unavailable telemetry
- malformed telemetry
- remote execution timeout
- policy deny
- approval required
- no eligible candidate
- failed fallback path (explicitly denied/no hidden fallback)
- replay integrity mismatch
- diagnostics empty state

## Evidence command

```bash
npx vitest run src/lib/control-plane/degraded-state-chaos.test.ts
```

## Residual closure delta (2026-05-09)
- Added direct replay rejection assertions for missing governance reason-code branches across policy/fallback/degraded drift scenarios.
- Revalidated no hidden fallback and no transport invocation for blocked remote execution branches.
