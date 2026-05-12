<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0001: Proof Before Autonomy

- Status: Accepted

## Context

The fork could easily look more capable by describing autonomous routing, recovery, and policy learning before those systems exist. That would make review harder and make failures ambiguous.

## Decision

Current architecture must keep proof, receipts, replay checks, and degraded-state reporting ahead of autonomous behavior. Docs and code should make non-claims explicit when a feature is only planned or fixture-backed.

## Why We Did Not Claim Autonomous Operation

Autonomous recovery and policy mutation need durable records, rollback rules, and operator-visible approval paths. The repo has useful local contracts, but it does not have those runtime guarantees.

## Consequences

The language is less dramatic, and some demos stay fixture-backed. The benefit is that reviewers can check claims directly against tests and code.

## Implementation Links

- `docs/review/evidence-index.md`
- `docs/review/known-non-goals.md`
- `src/lib/control-plane/degraded-state-chaos.test.ts`

## Verification

- `npm run review:claims`
- `npm run verify:chaos`
