<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Policy Engine (Deterministic Foundation)

Status: **Implemented (foundation)**.

Implements deterministic policy bundle/rule evaluation for control-plane requests with explicit outcomes: `allow`, `deny`, `approval_required`.
Runtime-wide enforcement is **scaffolded** and will be integrated incrementally.

## Runtime seam status (2026-05-09)

Policy evaluation is now wired into a low-risk runtime adapter for governed test actions and provider/tool-like wrappers. This is partial coverage; full runtime governance remains deferred.
