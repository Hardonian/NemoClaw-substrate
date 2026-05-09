<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Scheduler Primitives (Deterministic Foundation)

Status: **Implemented (primitive planning)**.

Scheduler consumes request envelope, classification, policy result, registry state, and degraded signals.
It computes deterministic candidate scores, stable tie-breaking, exclusion reasons, and explicit fallback plans.
No autonomous orchestration or distributed runtime handoff is implemented in this phase.
