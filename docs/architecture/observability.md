<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Observability

## Status (2026-05-09)
Implemented deterministic observability primitives in `src/lib/control-plane/observability.ts`.

Implemented summaries:
- policy outcomes
- degraded-state timelines
- fallback frequencies
- stale-node summaries

Outputs distinguish observed/unavailable states and avoid fabricated orchestration health.
