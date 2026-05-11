<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Subsystem Ownership Map

This map outlines the core NemoClaw subsystems and their architectural boundaries.

| Subsystem | Core Responsibilities | Key Files / Paths |
|-----------|-----------------------|-------------------|
| **Control Plane** | Deterministic routing, policy engine, verification | `src/lib/control-plane/` (`execution-lifecycle.ts`, `policy-engine.ts`, `governed-provider-routing.ts`) |
| **Execution** | Queue governance, lease management | `src/lib/execution/` (`execution-queue.ts`, `lease-manager.ts`) |
| **Observability** | Replay receipts, degraded-state telemetry | `src/lib/control-plane/` (`evidence-export.ts`, `replay.ts`, `observability.ts`) |
| **Security** | Secret redaction, policy evaluation, SSRF validation | `src/lib/security/`, `src/lib/control-plane/redaction-validation.ts`, `nemoclaw/src/blueprint/ssrf.ts` |
| **Blueprint** | Orchestration configuration, sandbox validation | `nemoclaw-blueprint/` (`openclaw-sandbox.yaml`, `policies/`) |
| **Plugin** | CLI extension, commander integration | `nemoclaw/` (`src/index.ts`, `src/commands/`) |
| **Onboard** | Preflight, installation, and environment remediation | `src/lib/onboard.ts`, `src/lib/onboard/` (`preflight.ts`, `preflight-logic.ts`) |
