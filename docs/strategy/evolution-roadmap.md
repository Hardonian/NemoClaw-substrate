<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Substrate Evolution Roadmap

This document presents the NemoClaw fork evolution in phases. Each phase builds on the previous one. Later phases must not be claimed until earlier phases have verified implementation.

## Phase 1: Governed Routing Substrate

- **Purpose**: Establish explicit policy evaluation as the gating mechanism for all routing decisions. Default local behavior must be preserved unless explicitly overridden.
- **What exists**: `PolicyBundle`, `PolicyEvaluationResult`, `evaluatePolicy()` in `governance.ts`. Policy engine with scope precedence in `policy-engine.ts`. Network policy presets in `nemoclaw-blueprint/policies/presets/`.
- **What remains**: Policy linting tool; policy diff comparison; policy version pinning; persistent policy storage.
- **Verification needed**: `npm run verify:governed-routing` passes; policy evaluation is deterministic for same input; default local behavior preserved without flags.
- **What not to claim yet**: Distributed policy evaluation; cross-agent policy coordination; policy conflict resolution.

## Phase 2: Trust / Telemetry / Replay Substrate

- **Purpose**: Establish that telemetry is evidence (not authority), worker trust is assessed structurally, and replay validation rejects drift.
- **What exists**: `WorkerTrustDecision`, `WorkerCapabilityAttestation`, `markAttestationStatus()` in `worker-trust.ts`. `ReplayEnvelope`, `validateReplayEnvelope()` in `replay.ts`. Worker probe parsing for vllm, ollama, llama.cpp, nim in `worker-probes.ts`, `local-runtime-probes.ts`, `remote-runtime-probes.ts`.
- **What remains**: Probe protocol verification (not just pattern parsing); trust history query; cross-worker trust correlation; probe freshness validation.
- **Verification needed**: `npm run verify:remote-probes` passes; replay validation rejects all tampering vectors (digest, lineage, ownership, lease, trust drift, missing reason codes); telemetry is never treated as final authority.
- **What not to claim yet**: Cryptographic attestation; hardware trust root; trust chain validation across worker fleet.

## Phase 3: Evidence / Proofpack Substrate

- **Purpose**: Make execution decisions exportable as deterministic, tamper-evident artifacts suitable for external review.
- **What exists**: `EvidenceBundle`, `EvidenceManifest`, `buildEvidenceBundle()`, `exportProofpack()` in `evidence-export.ts`. `ProofpackExportFormat`, `DEFAULT_PROOFPACK_EXPORT_OPTIONS` in `evidence-types.ts`. SHA-256 digests over deterministic serialization. Tamper rejection tests.
- **What remains**: Cross-environment proofpack verification; proofpack compression for large evidence sets; cryptographic signing; evidence graph query layer.
- **Verification needed**: `npm run verify:proofpack` passes; `npm run verify:export` passes; same input produces same proofpack digest; tampered proofpack is rejected.
- **What not to claim yet**: Hardware-backed proofpack signing; distributed proofpack consensus; cross-repository proofpack verification.

## Phase 4: Execution Lifecycle Substrate

- **Purpose**: Define explicit state machines for plans, queue items, leases, receipts, and their transitions. Make all transitions typed, reason-coded, and replayable.
- **What exists**: `ExecutionPlan` with status/phase in `execution-plans.ts`. Queue/lease/idempotency operations in `execution-lifecycle.ts` (1087 lines). Lease acquire/renew/release/expire/revoke. Stale owner rejection. Split-brain lease detection. `DaemonScheduler` in `scheduler.ts`.
- **What remains**: Durable queue storage; distributed lease coordination; crash recovery for in-flight leases; idempotency across process restarts; persistent plan storage.
- **Verification needed**: `npm run verify:execution-lifecycle` passes; all legal state transitions accepted; all illegal transitions rejected; hidden retry and hidden degraded triggers detected.
- **What not to claim yet**: Distributed queue; crash-safe lease recovery; multi-process idempotency; persistent plan query.

## Phase 5: Intent Contracts and Approval Lineage

- **Purpose**: Separate operator intent from execution plan. Establish approval chains with operator authority, delegation scopes, and escalation boundaries.
- **What exists**: `IntentContract` with states, authority, delegation, escalation boundaries in `intent-contract.ts` (597 lines). `ExecutionIntent` in `execution-plans.ts`. `ExecutionApproval` with authorization validation in `execution-plans.ts`. Intent hashing for replay.
- **What remains**: Persistence of intent contracts; operator review UI for intent-to-plan transitions; delegation chain validation at runtime; intent mutation tracking.
- **Verification needed**: Intent hash is stable for same input; intent-to-plan lineage is unbroken; approval decisions carry reason codes; delegation scope is enforced.
- **What not to claim yet**: Persistent intent storage; operator delegation UI; cross-intent correlation; intent mutation audit trail.

## Phase 6: Institutional Operational Memory

- **Purpose**: Retain governance decisions, exceptions, degraded state events, and trust assessments across sessions for historical analysis and replay.
- **What exists**: `OperationalMemoryEntry`, `GovernanceIncident`, `ExceptionCluster`, `HistoricalTrustRecord`, `RoutingHistoryRecord`, `ReplayIntegrityIncident`, `AdjudicationRecord` types in `institutional-memory.ts` (658 lines). Append-only event log within process lifetime.
- **What remains**: Persistence layer; query and aggregation functions; integration into execution decision paths; memory retention and expiration policies; historical incident correlation.
- **Verification needed**: Memory entries are append-only; entries carry replay lineage; incidents are trackable across states; exception clustering produces actionable groups.
- **What not to claim yet**: Durable memory; cross-session query; memory-based policy recommendation; incident trend analysis.

## Phase 7: Digital-Twin Governance Simulation

- **Purpose**: Allow policy changes to be evaluated against historical execution data before promotion. Enable what-if analysis for routing, trust, replay, and degraded state scenarios.
- **What exists**: `SimulationEnvelope`, `RoutingSimulation`, `PolicyImpactSimulation`, `ReplayForecast` types in `governance-simulation.ts` (542 lines). Routing simulation partially implemented.
- **What remains**: Policy impact simulation execution engine; replay forecast against historical evidence; what-if analysis framework; simulation result comparison and diff; simulation assumptions tracking.
- **Verification needed**: Simulation produces no execution artifacts; simulation results are deterministic for same input; simulation assumptions are explicit; simulation can detect policy change impact on past decisions.
- **What not to claim yet**: Live policy simulation against production data; automated simulation-driven policy recommendation; simulation accuracy metrics.

## Phase 8: Capability Economics

- **Purpose**: Quantify the cost of governance overhead (trust verification, evidence generation, replay validation, degraded state handling) so operators can reason about tradeoffs.
- **What exists**: `TrustCostFactors`, `ExecutionCostFactors`, `DegradedStatePenalty`, `EvidenceBurden`, `ReliabilityDecay` types in `capability-economics.ts` (428 lines).
- **What remains**: Actual cost computation functions; integration into routing decisions; cost-per-governance-layer breakdown; operator cost dashboard; cost-aware routing.
- **Verification needed**: Cost computations are deterministic; cost models produce actionable tradeoff data; cost does not become a governance bypass (i.e., cheaper does not mean less governed).
- **What not to claim yet**: Real-time cost tracking; cost-optimized routing; cost-based trust relaxation; economic incentive alignment.

## Phase 9: Human Escalation

- **Purpose**: Provide structured paths for governance decisions that cannot be made automatically. Enable operator takeover, adjudication queues, and execution pause/resume.
- **What exists**: `EscalationBundle`, `OperatorTakeoverEnvelope`, `AdjudicationQueueItem`, `ReviewContract`, `ExecutionPauseResume`, `ApprovalStage`, `ConfidenceEscalation` types in `escalation.ts` (625 lines). Escalation triggers in `intent-contract.ts`.
- **What remains**: Runtime integration of escalation triggers; operator notification and response path; escalation SLA tracking; adjudication queue processing; takeover execution.
- **Verification needed**: Escalation is triggered on trust below threshold, evidence missing, policy denied; operator takeover pauses execution; adjudication queue is processable; escalation carries evidence references.
- **What not to claim yet**: Automated escalation routing; SLA enforcement; escalation analytics; escalation delegation chains.

## Phase 10: Constitutional Runtime Invariants

- **Purpose**: Enforce core governance principles at runtime, not just in documentation. Block execution on critical invariant violations.
- **What exists**: `InvariantRule`, `InvariantViolation`, `ConstitutionalValidationResult` types in `constitutional-runtime.ts` (522 lines). Invariant categories: operator supremacy, evidence requirement, bounded autonomy, anti-theatre, deterministic truth, non-fabrication, degraded state disclosure, fail-closed, replay integrity, authority chain, no implicit trust, no silent execution, no hidden retry, no autonomous policy mutation, no speculative execution. Violation detection functions.
- **What remains**: Integration of invariant checks into execution lifecycle transitions; automatic blocking on critical invariant violations; operator notification of invariant violations; invariant violation audit trail.
- **Verification needed**: All active invariants are checked before execution; critical violations block execution; warning violations are logged; invariant definitions are hashed for tamper detection.
- **What not to claim yet**: Invariant violation auto-remediation; invariant evolution; cross-invariant conflict resolution; invariant performance impact measurement.

## Phase 11: Governed Distributed Execution / Dynamo Adapter

- **Purpose**: Only after Phases 1-10 are verified, extend the substrate to distributed workers with Dynamo-based state coordination.
- **What exists**: `InMemoryDynamoAdapterStore` with CRUD operations in `dynamo-adapter.ts`. `DynamoAdapterConfig`, `DynamoWorkerDescriptor`, `DynamoCapabilitySnapshot`, `DynamoDispatchPlan`, `DynamoHealthProbe` types in `dynamo/types.ts`. Disabled by default. `OrchestrationEngine` in `orchestrator.ts` (env-flagged).
- **What remains**: Actual DynamoDB connection; distributed worker registration; cross-worker lease coordination; distributed queue; Dynamo-based state persistence; health probe protocol; dispatch plan execution.
- **Verification needed**: Dynamo adapter connects to real DynamoDB; distributed workers register and report capabilities; cross-worker leases are coordinated; distributed queue is crash-safe; orchestration receipts are verifiable across workers.
- **What not to claim yet**: Production distributed execution; Dynamo-based state coordination; GPU load balancing; autonomous worker orchestration. This phase must not begin until Phases 1-10 are verified.

## Phase Dependencies

```
Phase 1 (Governed Routing)
  └── Phase 2 (Trust/Telemetry/Replay)
        └── Phase 3 (Evidence/Proofpack)
              └── Phase 4 (Execution Lifecycle)
                    ├── Phase 5 (Intent/Approval)
                    │     └── Phase 9 (Human Escalation)
                    ├── Phase 6 (Institutional Memory)
                    │     └── Phase 7 (Simulation)
                    │           └── Phase 8 (Capability Economics)
                    └── Phase 10 (Constitutional Invariants)
                          └── Phase 11 (Distributed Execution / Dynamo)
```

Each phase must pass its verification commands before the next phase can claim implementation.
