<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Fork Roadmap

This roadmap describes intended direction. It does **not** imply every capability is implemented today.

## Roadmap themes

1. **Documentation and governance foundation**
   - Maintain clear current-state vs intended-state docs.
   - Keep contributor process explicit and auditable.
2. **Deterministic control-plane scaffolding**
   - Define stable control inputs/outputs and decision envelopes.
3. **Heterogeneous device awareness**
   - Establish explicit capability/health contracts for local devices and runtimes.
4. **Deterministic scheduling and routing**
   - Use explicit policy + state to drive repeatable routing decisions.
5. **Policy intelligence with supervision**
   - Convert repeated operator decisions into reviewable policy recommendations and promotions.
6. **Truthful degraded-state semantics**
   - Standardize degraded/fallback/error reporting to avoid false healthy signals.
7. **Receipts, provenance, and observability**
   - Increase evidence quality for audit, replay, and incident analysis.
8. **Security hardening and verification depth**
   - Strengthen fail-closed behavior on sensitive paths and improve test coverage.

## Suggested sequencing

- **Phase 1:** Docs/governance baseline + control-plane scaffolding.
- **Phase 2:** Device-awareness contracts + deterministic scheduler contracts.
- **Phase 3:** Supervised policy-promotion flow + degraded-state/receipt contracts.
- **Phase 4:** Expanded observability, hardening, and regression verification.

## Delivery expectations by theme

For each roadmap contribution:

- Document what is implemented now vs what remains target-state.
- Provide reproducible verification notes in PRs.
- Avoid claims of runtime behavior unless backed by code/tests in-branch.
