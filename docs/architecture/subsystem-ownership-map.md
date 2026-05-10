<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Subsystem Ownership Map

This map outlines the core NemoClaw subsystems and their architectural boundaries.

| Subsystem | Core Responsibilities | Key Files / Paths |
|-----------|-----------------------|-------------------|
| **Control Plane** | Deterministic routing, policy engine, verification | `src/lib/control-plane/` |
| **Execution** | Queue governance, lease management | `src/lib/execution/` |
| **Observability** | Replay receipts, degraded-state telemetry | `src/lib/observability/` |
| **Security** | Secret redaction, policy evaluation, SSRF validation | `src/lib/security/`, `nemoclaw/src/blueprint/ssrf.ts` |
| **Blueprint** | Orchestration configuration, sandbox validation | `nemoclaw-blueprint/` |
| **Plugin** | CLI extension, commander integration | `nemoclaw/` |
