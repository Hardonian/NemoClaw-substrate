<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0004: Policy Recommendations Without Automatic Mutation

- Status: Accepted for recommendation generation

## Context

Repeated deny, override, or degraded-state patterns can be useful operational evidence. Turning those patterns into automatic policy changes would create silent drift.

## Decision

Operational memory may generate policy-change proposals, but it must not mutate policy directly. Promotion remains explicit and reviewable.

## Why We Did Not Add Policy Learning

Prompt-driven or history-driven policy learning would make policy authority hard to audit. It also creates a failure mode where repeated bad decisions become rules.

## Consequences

The current system is slower to adapt. The benefit is that every policy change can be reviewed, versioned, and rolled back.

## Implementation Links

- `src/lib/control-plane/policy-promotion.ts`
- `src/lib/control-plane/policy-engine.ts`
- `docs/architecture/policy-promotion.md`

## Verification

- `npm run verify:core`
