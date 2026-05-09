<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Fork Rationale

## Why this fork exists

Upstream NemoClaw provides an alpha reference stack for running OpenClaw inside OpenShell sandboxes. This fork keeps that foundation and sharpens it for **local operator-grade AI execution and governance**.

The operating problem this fork addresses: local operators need deterministic, inspectable, and governable behavior across heterogeneous devices and inference runtimes, including honest reporting when execution is degraded.

## Governing principles

1. **Heterogeneous device awareness is mandatory**
   - Capability and health differences across devices/runtimes influence real outcomes and must be explicit inputs to control decisions.
2. **Deterministic control matters**
   - Equivalent state + policy + request should produce equivalent control outcomes.
3. **Truthful degraded-state reporting matters**
   - Failures, fallbacks, or constrained operation must be reported explicitly and durably.
4. **Policy must not live only inside prompts**
   - Governance requires enforceable code/config artifacts and review history.
5. **Repeated operator decisions should become supervised policy intelligence**
   - Repeated decisions can inform policy evolution, but only through visible, reviewable promotion paths (not silent drift).

## Current state vs intended state

### Current state (repo today)

- NemoClaw CLI, plugin, blueprint, policy presets, and related documentation are present in this fork.
- The repository already contains command flows, policy files, and contributor/test tooling inherited from upstream structure.

### Intended state (roadmap)

- Stronger deterministic control-plane contracts.
- Explicit device capability and scheduler semantics.
- Structured receipts/provenance and degraded-state contracts.
- Supervised policy-promotion workflows informed by operator repetition.

Roadmap details are tracked in `docs/roadmap.md`.
