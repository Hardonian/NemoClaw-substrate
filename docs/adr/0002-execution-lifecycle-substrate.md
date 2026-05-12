<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0002: Execution Lifecycle Records

- Status: Accepted

## Context

Remote workers, queues, and schedulers are risky to review if the repo cannot first explain a single execution lifecycle. The fork needed records for intent, queue state, lease state, receipts, replay, diagnostics, and proofpack validation before adding distributed behavior.

## Decision

Represent execution as explicit lifecycle records under `src/lib/control-plane/execution-lifecycle.ts`. State transitions must be deterministic and invalid transitions must return reason codes instead of falling through.

## Why We Did Not Start With A Worker Queue

A live queue without replay and lease evidence would make duplicate work, stale ownership, and hidden retry paths harder to detect. The current implementation defines and tests the records first.

## Consequences

The implementation is more record-heavy than a minimal CLI feature. It buys deterministic tests and makes future persistence adapters straightforward to review.

## Implementation Links

- `src/lib/control-plane/execution-lifecycle.ts`
- `src/lib/control-plane/execution-lifecycle.test.ts`
- `docs/architecture/execution-lifecycle-substrate.md`

## Verification

- `npm run verify:execution-lifecycle`
- `npm run verify:chaos`
