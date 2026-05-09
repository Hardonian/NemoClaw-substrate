<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Fork Roadmap

## Dependency map

### Parallel-safe early work
- docs/foundation
- architecture audit
- ADRs
- verification matrix

### Core dependency chain
1. control-plane contracts
2. device registry contracts
3. receipt/degraded-state primitives
4. policy engine
5. deterministic scheduler
6. operational memory
7. observability
8. hardening/replay

Rationale:
- Scheduler depends on registry because deterministic candidate evaluation requires explicit device/capability inputs.
- Scheduler must consult policy to ensure decisions are governable and enforceable.
- Operational memory depends on receipts to preserve attributable evidence for recommendations.
- Observability depends on receipts and registry to explain what happened and where.
- Hardening depends on prior control-path semantics so fail-closed rules target real contracts.
- Dynamo/GPU orchestration remains adapter-based future work and should not precede stable local contracts.

## Workstreams

### 1) docs/foundation
- Purpose: establish truthful architecture/governance documentation baseline.
- Deliverables: fork rationale, README clarity, architecture index links.
- Dependencies: none.
- Parallelization potential: high.
- Exit criteria: contributors can distinguish current truth vs roadmap quickly.
- Verification expectations: docs build passes.
- Risks: over-claiming implementation.
- Suggested branch name: `docs/foundation-baseline`
- Suggested commit style: `docs(scope): ...`
- Suggested PR title: `docs: establish fork documentation foundation`

### 2) architecture audit
- Purpose: repository-truth inventory of execution/control-adjacent surfaces.
- Deliverables: `docs/architecture/current-state.md`.
- Dependencies: none.
- Parallelization potential: high.
- Exit criteria: audit sections completed with file-grounded statements.
- Verification expectations: peer audit spot-checks.
- Risks: stale findings as code evolves.
- Suggested branch name: `docs/architecture-current-state`
- Suggested commit style: `docs(architecture): ...`
- Suggested PR title: `docs: add current-state architecture audit`

### 3) control-plane scaffolding
- Purpose: define contract-first control-plane seams.
- Deliverables: request/decision type contracts and baseline tests.
- Dependencies: workstreams 1-2.
- Parallelization potential: medium.
- Exit criteria: execution entrypoints consume control-plane decision contract.
- Verification expectations: deterministic contract tests.
- Risks: interface churn.
- Suggested branch name: `feat/control-plane-contracts`
- Suggested commit style: `feat(control-plane): ...`
- Suggested PR title: `feat: scaffold deterministic control-plane contracts`

### 4) device registry
- Purpose: represent heterogeneous local devices as schedulable inputs.
- Deliverables: device and capability snapshot contracts/storage.
- Dependencies: 3.
- Parallelization potential: medium.
- Exit criteria: registry APIs and validation tests merged.
- Verification expectations: schema + snapshot integrity tests.
- Risks: stale health data.
- Suggested branch name: `feat/device-registry-contracts`
- Suggested commit style: `feat(registry): ...`
- Suggested PR title: `feat: add device registry contract layer`

### 5) receipts and degraded states
- Purpose: enforce truthful evidence and degradation semantics.
- Deliverables: receipt schema and degraded taxonomy primitives.
- Dependencies: 3.
- Parallelization potential: medium-high.
- Exit criteria: control decisions emit typed receipts/degraded codes.
- Verification expectations: schema and end-to-end assertions.
- Risks: incomplete coverage across paths.
- Suggested branch name: `feat/receipts-degraded-primitives`
- Suggested commit style: `feat(receipts): ...`
- Suggested PR title: `feat: introduce receipt and degraded-state primitives`

### 6) policy engine and approvals
- Purpose: evaluate inspectable policy and gate promotions.
- Deliverables: policy evaluator, approval workflow contracts.
- Dependencies: 3, 5.
- Parallelization potential: medium.
- Exit criteria: policy verdict required for scheduling.
- Verification expectations: policy golden tests and approval flow tests.
- Risks: policy sprawl.
- Suggested branch name: `feat/policy-engine-approvals`
- Suggested commit style: `feat(policy): ...`
- Suggested PR title: `feat: add policy engine and approval gates`

### 7) deterministic scheduler
- Purpose: deterministic selection across eligible candidates.
- Deliverables: scheduler module with explainable outcomes.
- Dependencies: 4, 6.
- Parallelization potential: low-medium.
- Exit criteria: stable tie-break and rejection reasons in outputs.
- Verification expectations: property + regression tests.
- Risks: hidden heuristics.
- Suggested branch name: `feat/deterministic-scheduler`
- Suggested commit style: `feat(scheduler): ...`
- Suggested PR title: `feat: implement deterministic scheduler`

### 8) operational memory
- Purpose: capture repeated operator decisions for supervised recommendations.
- Deliverables: append-only memory records linked to receipts.
- Dependencies: 5, 6, 7.
- Parallelization potential: medium.
- Exit criteria: memory artifacts produced without policy auto-mutation.
- Verification expectations: append-only and traceability tests.
- Risks: accidental policy drift.
- Suggested branch name: `feat/operational-memory`
- Suggested commit style: `feat(memory): ...`
- Suggested PR title: `feat: add operational memory scaffolding`

### 9) observability
- Purpose: unify control-path evidence and diagnostics.
- Deliverables: structured events with receipt correlation.
- Dependencies: 4, 5, 7.
- Parallelization potential: medium.
- Exit criteria: explainable event trail for each decision.
- Verification expectations: event schema + correlation tests.
- Risks: partial visibility.
- Suggested branch name: `feat/control-observability`
- Suggested commit style: `feat(observability): ...`
- Suggested PR title: `feat: add control-plane observability contracts`

### 10) hardening and replayability
- Purpose: strengthen fail-closed behavior and replay discipline.
- Deliverables: hardening rules and replay tooling/tests.
- Dependencies: 3-9.
- Parallelization potential: low.
- Exit criteria: replay passes and sensitive paths enforce fail-closed semantics.
- Verification expectations: security checks + replay tests.
- Risks: false confidence if contracts incomplete.
- Suggested branch name: `feat/hardening-replay`
- Suggested commit style: `feat(hardening): ...`
- Suggested PR title: `feat: add hardening and replayability gates`

### 11) future Dynamo/GPU orchestration adapter
- Purpose: optional adapter seam for future external orchestration.
- Deliverables: interface contracts and compatibility tests.
- Dependencies: stable local contracts from 3-10.
- Parallelization potential: low.
- Exit criteria: adapter does not alter local core contracts.
- Verification expectations: adapter conformance tests.
- Risks: premature coupling.
- Suggested branch name: `feat/dynamo-adapter-seam`
- Suggested commit style: `feat(adapter): ...`
- Suggested PR title: `feat: scaffold Dynamo-style orchestration adapter seam`

## Control-plane foundation (implemented)
- Deterministic contracts, device registry substrate, receipt/degraded taxonomy scaffolding complete.
- Remaining: policy engine, scheduler, runtime receipt wiring, observability and replay tooling.


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.

- Runtime policy/receipt integration in safe seams delivered; broad runtime governance and scheduler handoff remain planned future work.

- Operational intelligence substrate phase started: supervised operational memory + replay/observability scaffolding implemented; worker/device orchestration adapters remain planned.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 governed routing update
Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.


## Worker probe and telemetry adapter note (2026-05-09)
- Probes are explicit operator-invoked actions (manual/invoked-only), not autonomous loops.
- Remote execution remains disabled in this phase; governed routing remains opt-in.
- Telemetry fields can be unavailable/stale and are surfaced truthfully without fabrication.
- Dynamo integration is planned only and not implemented.
