<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0005: Replay And Evidence Boundaries

- Status: Accepted

## Context

Logs are useful but too loose for replay. A reviewer needs to know whether the recorded request, policy context, trust context, ownership, lease, receipts, and reason codes still match.

## Decision

Replay validation must reject drift and missing evidence. Proofpack validation must reject digest mismatch and hidden degraded-state triggers.

## Why We Did Not Use Best-Effort Logs

Best-effort logs can explain what a process printed. They cannot prove that a replayed record preserved lineage or that a proofpack was not tampered with.

## Consequences

The validation path is strict and can block incomplete evidence. That cost is intentional: partial evidence should not look authoritative.

## Implementation Links

- `src/lib/control-plane/replay.ts`
- `src/lib/control-plane/execution-lifecycle.ts`
- `src/lib/control-plane/evidence-export.ts`
- `src/lib/control-plane/execution-lifecycle.test.ts`
- `src/lib/control-plane/evidence-export.test.ts`

## Verification

- `npm run verify:execution-lifecycle`
- `npm run verify:chaos`
- `npm run verify:proofpack`
