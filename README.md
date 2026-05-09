<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# NemoClaw Fork: Local Operator-Grade AI Execution and Governance

This repository is a fork of NVIDIA NemoClaw. This fork keeps NemoClaw's sandbox and policy foundations, and reorients the project toward **local operator-grade execution control** for heterogeneous devices and model runtimes.

## Fork Purpose

This fork exists to build a system that is:

- **Explainable:** every control decision has inspectable inputs and outputs.
- **Auditable:** every execution path can emit durable receipts and provenance.
- **Deterministic where it matters:** explicit policy and scheduler behavior over implicit heuristics.
- **Truthful under degradation:** no hidden fallback behavior that misrepresents health.

## Core Goals

1. Multi-device local AI execution.
2. Deterministic control plane.
3. Device/GPU-aware routing and future handoff.
4. Truthful degraded states.
5. Execution receipts and provenance.
6. Operational memory from repeated operator decisions.
7. Supervised policy promotion (no autonomous policy drift).

## Non-Goals

- No dashboard theater.
- No speculative architecture claims not grounded in code.
- No opaque “AI decides best route” behavior.
- No hidden fallbacks.
- No prompt-only governance that bypasses real control paths.

## Current Baseline

Current capabilities are inherited from upstream NemoClaw and include:

- CLI entrypoints in `bin/` and command implementation in `src/`.
- OpenShell sandbox orchestration, policy mutation commands, and onboarding flows.
- Provider integrations (NVIDIA endpoints, local providers, routed mode).
- Host-side state and session persistence in `~/.nemoclaw/`.
- Existing logs, debug commands, and shields audit log mechanics.

See:

- `docs/fork-rationale.md`
- `docs/architecture/current-state.md`
- `docs/architecture/target-state.md`
- `docs/roadmap.md`

## Roadmap Themes

- Foundation docs and contributor workflow guardrails.
- Deterministic control-plane scaffolding.
- Device registry and scheduler.
- Policy engine with supervised promotion flow.
- Receipts + degraded-state semantics.
- Operational memory and observability.
- Security hardening and verification depth.

## Contributing in This Fork

Use conventional commits and keep PRs narrowly scoped.

- Branch strategy: `docs/contributing/branch-strategy.md`
- PR guidance: `docs/contributing/pr-template-guide.md`

## Verification Expectations

All architecture and roadmap claims should map to repository truth in `src/`, `nemoclaw/src/`, `nemoclaw-blueprint/`, `scripts/`, and `docs/`. If behavior is not implemented yet, document it as target-state only.
