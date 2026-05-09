<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Remote execution adapters

Remote worker execution is **opt-in only** via `NEMOCLAW_REMOTE_EXECUTION=1`.

Current implementation is a **guarded scaffold seam**:
- policy-gated before any transport call
- explicit `approval_required` blocking unless approved context is provided
- HTTP adapter prototype with mockable transport and timeout-bounded calls
- receipt/event emission and replay-safe result records

Not implemented in this phase:
- SSH execution
- background daemon
- distributed orchestration/Dynamo integration
- automatic worker routing or provider behavior mutation
