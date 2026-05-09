<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw Fork: Local Operator-Grade Execution and Governance

This fork of NemoClaw is being shaped into a local operator-grade AI execution and governance system for heterogeneous local infrastructure.

## Why this fork exists

The fork prioritizes deterministic and auditable control over opaque autonomy. It focuses on:
- execution plane and control plane separation,
- truthful degraded-state reporting,
- execution receipts/provenance,
- supervised policy promotion,
- explainable routing/control decisions.

## Current state vs roadmap

- **Current state:** existing CLI/plugin/sandbox orchestration and inference onboarding flows are present.
- **Roadmap state:** deterministic scheduler, dedicated device registry, policy engine promotions, and unified receipt framework are target-state and not yet fully implemented.

## Architecture and planning docs

- Fork rationale: [docs/fork-rationale.md](docs/fork-rationale.md)
- Current-state architecture audit: [docs/architecture/current-state.md](docs/architecture/current-state.md)
- Target-state architecture: [docs/architecture/target-state.md](docs/architecture/target-state.md)
- Roadmap and dependencies: [docs/roadmap.md](docs/roadmap.md)
- Verification matrix: [docs/verification/verification-matrix.md](docs/verification/verification-matrix.md)
- PR verification/reporting guide: [docs/contributing/pr-template-guide.md](docs/contributing/pr-template-guide.md)
- Branch strategy: [docs/contributing/branch-strategy.md](docs/contributing/branch-strategy.md)

## Control-plane discipline

Control-plane discipline means decisions are governed by inspectable contracts, policy artifacts, and verifiable receipts; not by hidden fallbacks or prompt-only instructions.

## Contribution guidance

When contributing:
1. Distinguish current repository truth from target-state design.
2. Avoid implementation claims unless backed by code and tests in the same PR.
3. Include verification commands and observed outcomes in PR descriptions.

## Not implemented yet (do not over-interpret)

Unless specifically added and verified in code:
- no dedicated deterministic scheduler,
- no dedicated device registry,
- no dedicated policy-promotion engine,
- no unified execution receipt framework,
- no Dynamo-style orchestration integration.
