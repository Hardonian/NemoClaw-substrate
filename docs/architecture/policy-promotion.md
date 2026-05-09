<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy promotion (supervised)

## Status (2026-05-09)
Implemented review-only proposal substrate in `src/lib/control-plane/policy-promotion.ts`.

`PolicyCandidate` and `PolicyPromotionProposal` are generated deterministically from repeated deny/override/degraded/fallback patterns.

Promotion proposals are inert artifacts for operator review. Automatic policy promotion is intentionally forbidden.
