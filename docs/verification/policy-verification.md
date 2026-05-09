<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy Verification

Status: **Implemented**.

The deterministic policy engine requires verification passes to ensure strict governance enforcement and structural trace integrity.

## Execution Requirements

Run tests via:
`npx vitest run src/lib/control-plane/policy-engine.test.ts`

## Verification Assertions

1. **Precedence Consistency**: Asserts higher-scope rules deterministically preempt lower-scope rules regardless of inclusion order.
2. **Effect Arbitration**: Validates the fixed precedence of `deny` > `approval_required` > `allow` within any active scope tier.
3. **Override Integrity**: Asserts an explicit override functionally elevates a rule's matching and reason-code to the override's declared scope.
4. **Emergency Priority**: Confirms the `emergency` scope uniformly pre-empts all nominal operational evaluations.
5. **Mutation Audit**: Verifies digest detection for manual drift tracking and structurally deterministic state serialization.
6. **Replay Validation**: Evaluates strict equality across identical rule/context states (omitting transient timestamps/IDs) to support trace replay.
