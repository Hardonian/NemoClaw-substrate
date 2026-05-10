<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Worker probes

Current worker probe scope is local-safe and diagnostics-first. Remote execution remains disabled in this phase.

## 2026-05-09 guarded remote probe seam update

- Added guarded remote probe request/response contracts for explicit operator-invoked HTTP health checks only.
- Remote HTTP probes enforce URL scheme validation (`http`/`https`), bounded timeouts, and degraded-state mapping for timeout/auth/network/malformed response cases.
- Added SSH probe descriptor placeholder returning explicit `not_implemented` degraded status with no remote command execution.
- Remote probe diagnostics/receipts redact auth token/header values and preserve explicit degraded truth.
