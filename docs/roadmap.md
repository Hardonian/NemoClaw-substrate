<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Fork Roadmap

## Dependency map

## Release-readiness status taxonomy (2026-05-09)
- **Implemented:** baseline CLI/plugin flows and deterministic verification contracts already in repository truth.
- **Scaffolded:** adapter seams and diagnostics for governed heterogeneous execution, without distributed autonomy.
- **Opt-in:** governed/heterogeneous routing flags; disabled by default.
- **Planned:** external orchestration adapter integrations, contingent on stable local control contracts.
- **Not implemented:** distributed execution, GPU balancing, Dynamo-native orchestration, self-healing loops, automatic policy learning.


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
9. evidence bundle exports

Rationale:
- Scheduler depends on registry because deterministic candidate evaluation requires explicit device/capability inputs.
- Scheduler must consult policy to ensure decisions are governable and enforceable.
- Operational memory depends on receipts to preserve attributable evidence for recommendations.
- Observability depends on receipts and registry to explain what happened and where.
- Hardening depends on prior control-path semantics so fail-closed rules target real contracts.
- Evidence bundle exports depend on plans, approvals, receipts, operational memory, replay, telemetry, trust, degraded-state, and diagnostics records already existing as explicit evidence.
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

### 11) evidence bundle exports
- Purpose: package existing governed-substrate records into deterministic proof artifacts.
- Deliverables: `EvidenceBundle`, `EvidenceManifest`, `EvidenceArtifact`, JSON/NDJSON export helpers, replay evidence package helper, and validation tests.
- Dependencies: 5-10.
- Parallelization potential: medium.
- Exit criteria: stable bundle hashes, deterministic export order, lineage rejection, replay package integrity, and redaction tests pass.
- Verification expectations: targeted evidence bundle Vitest suite plus release verification gate.
- Risks: false audit confidence if lineage is missing or secret redaction is bypassed.
- Suggested branch name: `evidence/audit-bundle-export`
- Suggested commit style: `evidence: ...`
- Suggested PR title: `evidence: implement deterministic evidence and audit bundle exports`

### 12) future Dynamo/GPU orchestration adapter
- Purpose: optional adapter seam for future external orchestration.
- Deliverables: interface contracts and compatibility tests.
- Dependencies: stable local contracts from 3-11.
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


## 2026-05-09 local probe hardening update
This phase adds explicit manual local probe execution and diagnostics summaries, with deterministic degraded-state/event reporting. Remote execution, autonomous routing, and Dynamo integration remain planned future work.

## 2026-05-09 guarded remote probe seam update
- Added authenticated remote HTTP health-check probe seam with strict endpoint validation and timeout bounds.
- Added SSH remote probe placeholder status (`not_implemented`) without shell execution.
- Added remote probe receipt/event/registry integration seams; governed routing and remote execution remain unchanged/off.

## 2026-05-09 guarded remote execution seam update
- Added deny-by-default remote execution scaffold behind explicit opt-in flag.
- Implemented policy/approval-gated HTTP transport seam with redaction and degraded truth reporting.
- Explicitly out of scope: SSH command execution, daemons, autonomous orchestration, Dynamo integration.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- Probe execution is explicit/manual with no background polling; remote execution and automated routing remain planned future work.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

- [x] Integrate heterogeneous bridge at runtime/provider dispatch seam with strict flag gating and explicit blocked/degraded outcomes (2026-05-09).


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.

- Remote telemetry enrichment is evidence-only, with parser-specific metadata extraction and explicit persistence policy.
- No automatic optimization, autonomous routing, background telemetry polling, Dynamo orchestration, or GPU balancing in this phase.
## 2026-05-09 telemetry operational taxonomy hardening
- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

## Degraded-state hardening checkpoint (2026-05-09)
- Added deterministic chaos verification for governed routing, remote execution, probe telemetry truth, replay integrity, and diagnostics reason-code surfacing.
- Next orchestration increments must keep no-hidden-fallback guarantees and explicit degraded propagation semantics.

## Worker trust and attestation constraints (2026-05-09)
- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.


## Residual matrix closure update (2026-05-09)
Closure pass completed for direct branch assertions and docs/status coherence. No new runtime behavior was introduced; work was limited to replay/observability/trust-policy-fallback verification hardening and claim hygiene.

## 2026-05-09 evidence bundle export update
- Added deterministic evidence bundle and audit export packaging for existing plans, approvals, receipts, replay envelopes, operational events, telemetry, trust/attestation, degraded-state, and diagnostics records.
- Export helpers are pure packaging and validation primitives. They do not orchestrate work, mutate policy, mutate trust, or change runtime routing.
- JSON and NDJSON exports preserve stable artifact ordering, manifest hashes, bundle hashes, lineage validation, replay integrity checks, and secret redaction.
