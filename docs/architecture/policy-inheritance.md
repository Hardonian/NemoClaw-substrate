<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy Inheritance

Status: **Implemented**.

The deterministic policy engine implements strict inheritance semantics mapped to execution contexts.

## Scope Precedence

Scopes are evaluated in descending precedence order. A policy at a higher scope preempts conflicting policies at lower scopes.

1. **`emergency`** (highest): Operator-initiated or system-critical temporary overrides.
2. **`operator`**: Explicit rules bound by human operators for administrative enforcement.
3. **`execution`**: Policies applied to the specific execution context or job.
4. **`worker`**: Policies associated with the specific hardware node or identity.
5. **`runtime`**: Environment constraints specific to the NemoClaw deployment.
6. **`environment`**: Infrastructure context (e.g., development, staging, production).
7. **`global`** (lowest): Baseline defaults.

## Evaluation Rules

- When multiple rules match an event, the rule from the highest scope wins.
- Within the same scope, the following effect hierarchy applies: `deny` > `approval_required` > `allow`.
- An override can target a specific rule and modify its effect and reason code, effectively raising its precedence to the override's scope.
- Failing evaluations strictly default to `deny`.
