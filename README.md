<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw: Local Operator-Grade Execution and Governance

NemoClaw is an open-source reference stack for running OpenClaw always-on assistants inside OpenShell sandboxes more safely. It provides CLI tooling, a plugin for sandbox orchestration, security hardening, and a governed control-plane library for deterministic execution decisions.

## Why this project exists

NemoClaw focuses on deterministic and auditable control over opaque autonomy:

- execution plane and control plane separation,
- truthful degraded-state reporting,
- execution receipts and provenance,
- supervised policy promotion,
- explainable routing and control decisions.

See [Fork Rationale](docs/fork-rationale.md) for detailed background.

## Current state vs roadmap

- **Implemented:** existing CLI/plugin/sandbox orchestration and inference onboarding flows; network policy presets; secret scanning; SSRF validation; shield audit logging.
- **Library-implemented:** control-plane contracts (policy engine, execution lifecycle, replay, worker trust, device registry, operational memory, probes, telemetry) — tested but not wired into main CLI flow.
- **Opt-in:** governed routing (`NEMOCLAW_GOVERNED_ROUTING=1`) and heterogeneous bridge (`NEMOCLAW_HETEROGENEOUS_ROUTING=1`).
- **Planned:** CLI integration of control-plane library, persistent storage adapters, external orchestration integrations.
- **Not implemented:** distributed execution, GPU balancing, Dynamo integration, autonomous orchestration/recovery loops, automatic policy learning.

## Documentation

- **[NemoClaw Developer Guide](docs/index.md):** Main documentation portal.
- **[Architecture & Governance Index](docs/architecture/index.md):** Substrate architecture, trust boundaries, and invariants.
- **[ADR Index](docs/adr/index.md):** Architectural Decision Records (ADRs).
- **[Verification Matrix](docs/verification/index.md):** Release readiness and security hardening gates.
- **[Operator Guide](docs/operator/index.md):** Substrate operation and configuration.
- **[Roadmap & Dependencies](docs/roadmap.md):** Planned features and implemented truth.

## Security Hardening Doctrine

- **[Security Threat Model](docs/architecture/security-threat-model.md)**
- **[Security Policy Model](docs/architecture/security-policy-model.md)**
- **[Transport Security](docs/architecture/transport-security.md)**
- **[Secret Redaction Doctrine](docs/architecture/secret-redaction-doctrine.md)**
- **[Command Execution Safety](docs/architecture/command-execution-safety.md)**
- **[Local-Stack Security Profiles](docs/architecture/local-stack-security-profiles.md)**
- **[Security Verification Matrix](docs/verification/security-verification-matrix.md)**

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
- no autonomous orchestration or autonomous recovery loops,
- no automatic policy learning.

## Local bootstrap recovery path

If lifecycle scripts fail in restricted environments, contributors can use `npm install --ignore-scripts` for local verification only, then run typecheck/tests manually. Production/release flows should keep normal install behavior.

## Verification & Release Readiness

The substrate enforces a deterministic verification chain before release. See the **[Verification Index](docs/verification/index.md)** for detailed gates.

```bash
npm run verify:changelog-hygiene
npm run verify:core
npm run verify:release
```

- `verify:core` reports deterministic `PASS/WARN/FAIL` status across changelog hygiene, typecheck, lint, and targeted control-plane suites.
- `verify:release` is the primary release gate for local and CI readiness checks.
- `verify:all` is a strict-mode variant that fails if any required toolchain or dependency is missing.
- In restricted environments, `npm install --ignore-scripts` is a local diagnosis recovery path only.

### Residual matrix closure status (2026-05-09)

The governed substrate closure pass is verification-focused: direct branch assertions, replay/diagnostics truth hardening, and status-document coherence. It does not add orchestration, distributed execution, GPU balancing, Dynamo integration, autonomous routing, or automatic policy/trust mutation.

## Operator substrate

Added deterministic operator CLI, profiles, and demo fixtures.
