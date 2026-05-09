<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw Fork: Local Operator-Grade Execution and Governance

This fork of NemoClaw is being shaped into a governed heterogeneous execution substrate for local operator-grade AI execution with explicit release-truth boundaries.

## Why this fork exists

The fork prioritizes deterministic and auditable control over opaque autonomy. It focuses on:
- execution plane and control plane separation,
- truthful degraded-state reporting,
- execution receipts/provenance,
- supervised policy promotion,
- explainable routing/control decisions.

## Current state vs roadmap

- **Implemented:** existing CLI/plugin/sandbox orchestration and inference onboarding flows; control-plane verification gates.
- **Scaffolded:** remote execution and telemetry adapter seams with explicit degraded-state reporting.
- **Opt-in:** governed routing (`NEMOCLAW_GOVERNED_ROUTING=1`) and heterogeneous bridge (`NEMOCLAW_HETEROGENEOUS_ROUTING=1`).
- **Planned:** external orchestration adapter integrations after stable local contracts.
- **Not implemented:** distributed execution, GPU balancing, Dynamo integration, autonomous orchestration/self-healing, automatic policy learning.

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

## Not implemented yet (explicitly not implemented in this checkpoint)

Unless specifically added and verified in code:
- no dedicated deterministic scheduler,
- no dedicated device registry,
- no dedicated policy-promotion engine,
- no unified execution receipt framework,
- no Dynamo-style orchestration integration,
- no distributed execution handoff,
- no GPU balancing,
- no autonomous orchestration or self-healing loops,
- no automatic policy learning.


## Local bootstrap fallback
If lifecycle scripts fail in restricted environments, contributors can use `npm install --ignore-scripts` for local verification only, then run typecheck/tests manually. Production/release flows should keep normal install behavior.


## Verification

Preferred contributor flow:

```bash
npm run verify:changelog-hygiene
npm run verify:core
npm run verify:release
```

- `verify:core` reports deterministic `PASS/WARN/FAIL` status across changelog hygiene, typecheck, lint, and targeted control-plane/probe/governed-routing suites.
- `verify:all` runs strict mode and fails for both repository failures and missing required toolchain/dependencies.
- In restricted local environments, `npm install --ignore-scripts` is a local diagnosis fallback only and must not be used for release packaging or CI baselines.
