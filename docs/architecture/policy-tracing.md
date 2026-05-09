<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy Tracing

Status: **Implemented**.

The deterministic policy engine guarantees that all policy evaluations generate an explicit, replay-safe trace.

## Trace Structure

An evaluation trace encapsulates the full evaluation graph:

- **Nodes**: Represent rule evaluations, including the rule ID, scope, effect, matching outcome, and whether it was overridden.
- **Edges**: Detail rule relationships (`overrides`, `inherits`, `preempts`), providing a full derivation path for the outcome.
- **Winning Rule**: Explicit pointer to the specific rule ID and scope that decisively resolved the evaluation.
- **Final Effect and Reason**: The deterministic outcome string (`allow`, `deny`, `approval_required`) and standardized reason code.

## Lineage and Mutation Audit

Policy traces form the bedrock of operational intelligence. Changes to policy packs produce deterministic mutations:

- Digested policy snapshots.
- Lineage linked to explicit operator attribution.
- Drift detection ensures evaluated traces correlate strictly to known policy digests.
