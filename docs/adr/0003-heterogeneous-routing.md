<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0003: Opt-In Heterogeneous Routing

- Status: Accepted for opt-in routing

## Context

The fork needs to reason about local and remote candidates, but default local execution should not change just because routing helpers exist.

## Decision

Heterogeneous routing stays behind explicit environment flags and policy checks. Candidate selection must be deterministic from the provided registry, policy, and request context.

## Why We Did Not Make Routing Automatic

Automatic routing would change runtime behavior before the trust, telemetry, and policy surfaces are mature enough. It would also make a local CLI review depend on hardware state.

## Consequences

Reviewers must enable the path deliberately. The cost is extra configuration; the benefit is stable default local behavior.

## Implementation Links

- `src/lib/control-plane/governed-provider-routing.ts`
- `src/lib/control-plane/heterogeneous-routing.ts`
- `src/lib/control-plane/runtime-dispatch-integration.ts`
- `docs/architecture/heterogeneous-routing.md`

## Verification

- `npm run verify:governed-routing`
- `npm run verify:core`
