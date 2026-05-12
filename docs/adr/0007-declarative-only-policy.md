<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0007: Policy Outside Prompts

- Status: Accepted

## Context

Prompt-only policy can guide behavior, but it is difficult to diff, test, enforce, and replay. The fork needs policy authority that survives outside a model instruction.

## Decision

Policy must live in inspectable code/config artifacts and be evaluated by deterministic control-plane logic. Prompt text can explain policy, but it must not be the enforcement mechanism.

## Why We Did Not Use Prompt Policy As Authority

Prompt policy is not enough for audit, rollback, or negative testing. It can be part of documentation, not the control boundary.

## Consequences

Policy work requires schemas, evaluators, and tests. The benefit is that denied, allowed, and approval-required decisions can be reproduced.

## Implementation Links

- `src/lib/control-plane/policy-engine.ts`
- `src/lib/control-plane/governance.ts`
- `src/lib/control-plane/governed-provider-routing.ts`
- `docs/architecture/policy-engine.md`

## Verification

- `npm run verify:core`
- `npm run verify:governed-routing`
