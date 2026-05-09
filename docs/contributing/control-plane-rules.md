<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Control-plane contributor rules

- No hidden fallbacks.
- No prompt-defined policy enforcement.
- Deterministic ordering is required for registry, receipts, and serialized contracts.
- Degraded state must be explicit and truthful.
- Receipt records are required for control decisions when integrated.
- State transitions must be explicit and explainable.
- Reuse upstream NemoClaw terminology (shields, provider, runner, state, registry, audit).


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.

## Runtime seam rules

- Preserve existing runtime behavior by default.
- Block only when policy explicitly returns deny or approval_required.
- Never silently continue after policy deny/approval_required.
- Mark runtime seam coverage as partial unless fully proven.
