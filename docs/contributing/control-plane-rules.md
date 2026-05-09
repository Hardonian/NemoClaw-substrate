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
