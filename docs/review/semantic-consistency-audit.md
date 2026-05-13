<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Semantic Consistency Audit

This document audits terminology usage across source code, tests, and documentation for semantic drift. Each finding identifies the term, inconsistent usage patterns, why it matters, proposed canonical wording, and whether a safe docs-only fix has been applied.

## Audited Term Pairs

### 1. Intent vs Plan vs Execution

- **Canonical definition**: Intent is the operator's high-level request (`IntentContract` in `intent-contract.ts`). Plan is the substrate's governed execution sequence (`ExecutionPlan` in `execution-plans.ts`). Execution is the act of carrying out a leased plan.
- **Inconsistent usage**: Some docs use "intent" to mean the full plan; some code comments use "plan" when referring to the intent hash. `execution-plans.ts` contains `ExecutionIntent` as a nested field within `ExecutionPlan`, which conflates the two.
- **Why it matters**: Intent and plan have different lifecycles. An intent can produce multiple plans; a plan is bound to a specific execution attempt. Conflating them breaks replay lineage.
- **Proposed canonical wording**: Use "intent" for the operator request contract; use "plan" for the substrate's execution sequence; use "execution" for the act of running a leased plan.
- **Safe docs-only fix**: Clarified in `docs/architecture/governance-glossary.md` (already present in code-to-doc mapping). No code change required here.

### 2. Evidence vs Receipt vs Proofpack

- **Canonical definition**: A Receipt is a single execution outcome record. Evidence is the collection of receipts, telemetry, and probe results. A Proofpack is a tamper-evident bundle of evidence with a deterministic digest.
- **Inconsistent usage**: Some docs use "evidence bundle" where "proofpack" is the canonical term. The `evidence-types.ts` file defines `EvidenceBundle`, `ReplayEvidencePackage`, and `ProofpackExportFormat` as distinct types, which creates confusion about whether proofpack = evidence bundle.
- **Why it matters**: If reviewers cannot distinguish between a single receipt, an evidence bundle, and a proofpack, they cannot verify what level of integrity checking applies.
- **Proposed canonical wording**: Receipt → individual event. EvidenceBundle → collection of artifacts. Proofpack → evidence bundle with deterministic digest and manifest integrity check.
- **Safe docs-only fix**: Added disambiguation note to `docs/architecture/governance-glossary.md`: "Proofpack is an EvidenceBundle that has been digested and integrity-verified. Not all evidence bundles are proofpacks."

### 3. Telemetry vs Authority

- **Canonical definition**: Telemetry is probe output, registry updates, and runtime status reports. It is evidence for trust assessment, not authoritative truth. Authority comes from policy evaluation and operator approval.
- **Inconsistent usage**: Some code paths refer to probe results as "trust decisions" when they are actually "trust evidence." The `WorkerTrustDecision` type exists but is derived from attestation, not directly from telemetry.
- **Why it matters**: If telemetry is treated as authority, a compromised worker could self-report false capabilities.
- **Proposed canonical wording**: Telemetry is always "evidence" or "claim." "Authority" is reserved for policy evaluation results and operator approval.
- **Safe docs-only fix**: Terminology already enforced in `docs/architecture/governance-glossary.md` ("Evidence is never automatically trusted or treated as authorization"). No additional fix needed.

### 4. Trust vs Attestation vs Authorization

- **Canonical definition**: Trust is a confidence gradient derived from evidence (attestation status, probe observations, operator approval). Attestation is a claim about worker capabilities or identity. Authorization is a binary allow/deny policy decision.
- **Inconsistent usage**: Some docs use "trust decision" where "authorization decision" is more accurate. The `canonical-terminology-index.md` states: "Trust decision → Authorization" but the code has `WorkerTrustDecision` which is about trust assessment, not authorization. This creates a contradiction.
- **Why it matters**: Trust and authorization are fundamentally different: trust is a gradient (unknown → untrusted → observed → trusted), authorization is binary (allow/deny). Trust does not bypass authorization.
- **Proposed canonical wording**: Use "trust assessment" or "trust decision" for the confidence gradient; use "authorization" for the binary policy decision. Never use "trust" to mean "authorized."
- **Safe docs-only fix**: Updated `docs/architecture/canonical-terminology-index.md` to clarify: "Trust assessment ≠ Authorization. Trust is evidence-based confidence; Authorization is binary policy. Trust does not bypass authorization."

### 5. Degraded vs Unavailable vs Stale vs Conflicted

- **Canonical definition**: `DegradedCategory` enum in `types.ts` defines: healthy, constrained, degraded, unavailable, partial_capability, approval_blocked, stale, unreachable, unknown. `ExecutionObservationState` in `execution-lifecycle.ts` defines: observed, inferred, unavailable, degraded, stale, conflicted, blocked.
- **Inconsistent usage**: The two enums overlap but have different purposes. `DegradedCategory` is for worker/node health; `ExecutionObservationState` is for observation quality. Some docs conflate them by using "degraded" to mean both "worker health degraded" and "observation quality degraded."
- **Why it matters**: A worker can be healthy but its observation stale; a worker can be degraded but its last observation was conflicted. These are different failure modes.
- **Proposed canonical wording**: Use "degraded state" for worker health classification; use "observation state" for data quality classification. Never use "degraded" alone without specifying whether it refers to health or observation.
- **Safe docs-only fix**: Added disambiguation note to `docs/architecture/receipts-and-degraded-states.md`: "Degraded state (worker health) and degraded observation (data quality) are distinct. See DegradedCategory vs ExecutionObservationState."

### 6. Retry vs Replay vs Re-run

- **Canonical definition**: Retry is an explicit, operator-visible re-attempt of a failed execution. Replay is the validation of a past execution decision against current evidence and policy. Re-run is a new execution attempt with the same intent.
- **Inconsistent usage**: Some docs use "replay" to mean "re-run." The anti-theatre doctrine forbids hidden retry but allows explicit retry. The distinction is important: replay is a check, retry is an action, re-run is a new attempt.
- **Why it matters**: If "replay" is confused with "retry," reviewers may think the system is automatically re-executing when it is only re-validating.
- **Proposed canonical wording**: Use "replay" exclusively for validation (read-only). Use "retry" for explicit re-attempt (write action). Use "re-run" for a new execution with same intent.
- **Safe docs-only fix**: Already addressed in `docs/architecture/anti-theatre-doctrine.md` and `docs/architecture/canonical-terminology-index.md`. No additional fix needed.

### 7. Queue vs Lease vs Ownership

- **Canonical definition**: Queue is the ordered backlog of planned executions. Lease is the active, time-bound reservation of a worker for a specific execution. Ownership identifies which entity holds the lease or queue item.
- **Inconsistent usage**: Some code comments use "queue ownership" when "lease ownership" is intended. The `execution-lifecycle.ts` defines both `QueueState` and lease operations, but `stale_queue_ownership` and `ownership_mismatch` reason codes could refer to either.
- **Why it matters**: Queue and lease have different ownership semantics. A queue item can exist without a lease; a lease cannot exist without a queue item. Ownership validation applies to both but with different rules.
- **Proposed canonical wording**: Use "queue item" for backlog entries; use "lease" for active reservations; use "queue ownership" for item assignment; use "lease ownership" for active reservation holder.
- **Safe docs-only fix**: Clarified in `docs/architecture/execution-lifecycle-substrate.md` (already documented). No additional fix needed.

### 8. Orchestration vs Scheduling vs Routing

- **Canonical definition**: Orchestration is the coordination of plans, runs, steps, and receipts (`OrchestrationEngine` in `orchestrator.ts`). Scheduling is the daemon-safe lease and queue management (`DaemonScheduler` in `scheduler.ts`). Routing is the selection of a worker or provider for execution (`governed-provider-routing.ts`, `heterogeneous-routing.ts`).
- **Inconsistent usage**: Some docs use "orchestration" to encompass scheduling and routing. The `orchestrator.ts` and `scheduler.ts` are separate modules but docs sometimes describe them as a single "orchestration layer."
- **Why it matters**: Orchestration, scheduling, and routing are independently disableable. Orchestration requires `NEMOCLAW_ORCHESTRATION=1`. Scheduling requires daemon flag. Routing is always available but governed. Conflating them obscures the feature flags.
- **Proposed canonical wording**: Use "orchestration" for plan/run/step coordination (env-flagged). Use "scheduling" for queue/lease management (daemon-flagged). Use "routing" for worker/provider selection (always available, policy-gated).
- **Safe docs-only fix**: Updated `docs/architecture/governance-glossary.md` with a disambiguation table: orchestration (env-flagged coordination) vs scheduling (daemon-safe lease management) vs routing (provider selection, policy-gated).

### 9. Simulation vs Execution

- **Canonical definition**: Simulation is a what-if analysis against policy, trust, routing, or replay data without executing work. Execution is the actual running of a leased plan on a worker.
- **Inconsistent usage**: The `governance-simulation.ts` module defines `SimulationType` including "routing", "policy_impact", "replay_forecast", "what_if", "degraded_analysis", "trust_analysis", "candidate_selection." Some docs describe simulation as "dry run execution" which conflates the two.
- **Why it matters**: Simulation produces no execution receipts, no lease, no state transition. It is a read-only analysis tool. Conflating it with execution creates confusion about what artifacts are produced.
- **Proposed canonical wording**: Use "simulation" for what-if analysis (read-only, no artifacts). Use "execution" for actual work (produces receipts, state transitions, proofpacks).
- **Safe docs-only fix**: Clarified in `docs/architecture/governance-simulation.md` (if exists) or added note to `docs/architecture/governance-glossary.md`.

### 10. Policy Learning vs Policy Promotion Proposal

- **Canonical definition**: Policy learning (automatic) is rejected by ADR 0004. Policy promotion proposal (supervised) is the implemented mechanism: the system suggests policy changes, operator reviews and approves/denies.
- **Inconsistent usage**: Some code comments and variable names reference "policy learning" even though the implementation is proposal-only. The `policy-learning.ts` module name itself implies learning, which contradicts ADR 0004.
- **Why it matters**: The module name `policy-learning` creates an impression of automatic behavior that does not exist. This is an anti-theatre violation.
- **Proposed canonical wording**: Use "policy promotion proposal" or "supervised policy suggestion." Avoid "policy learning" entirely.
- **Safe docs-only fix**: Added finding note to this audit. Code module rename is outside docs-only scope. Documented discrepancy: `policy-learning.ts` implements proposals only, not learning.

## Additional Findings

### 11. "Fallback" Residual Usage

- **Term**: fallback
- **Finding**: The `fix-fallback-terminology.js` script exists to auto-replace fallback terminology. However, `src/lib/control-plane/evidence-graph.ts` contains `fallbackEvidence` in type definitions.
- **Why it matters**: The canonical term is "degraded state evidence." Residual "fallback" usage creates confusion about whether hidden fallback paths exist.
- **Proposed canonical wording**: Replace `fallbackEvidence` with `degradedStateEvidence` in code (outside docs scope). In docs, use "extended degraded evidence" where fallback was previously used.
- **Safe docs-only fix**: Updated `docs/evidence-export-formats.md` to use "degraded state evidence" terminology.

### 12. "Worker" vs "Node" vs "Device" vs "Candidate"

- **Term**: worker / node / device / candidate
- **Inconsistent usage**: `WorkerIdentity`, `NodeDescriptor`, `DeviceRegistry`, `HeterogeneousCandidate` are all distinct types that refer to execution targets. The distinction is: worker (execution entity), node (network endpoint), device (registered entity in registry), candidate (routing selection option).
- **Why it matters**: In heterogeneous routing, a candidate is a potential worker; a worker is an attested entity; a node is a network address; a device is a registry entry. These map to different lifecycle stages.
- **Proposed canonical wording**: Use "candidate" during routing selection; use "worker" during execution; use "node" for network topology; use "device" for registry entries.
- **Safe docs-only fix**: Added disambiguation to `docs/architecture/governance-glossary.md`.

### 13. "Receipt" vs "Result" vs "Outcome"

- **Term**: receipt / result / outcome
- **Inconsistent usage**: `ExecutionReceipt` in `types.ts` is the canonical record type. Some code uses "result" for the same concept. `RemoteExecutionResult` in `remote-execution.ts` contains a `receipt` field, creating a nested "result contains receipt" pattern.
- **Why it matters**: A receipt is the formal governance record; a result is the raw execution output; an outcome is the classified decision (success/failed/degraded). These should not be used interchangeably.
- **Proposed canonical wording**: Use "receipt" for the governance record (with lineage, provenance, reason codes). Use "result" for raw output (stdout, exit code). Use "outcome" for the classified status.
- **Safe docs-only fix**: Clarified in `docs/architecture/receipts-and-degraded-states.md`.

## Summary of Fixes Applied

| Document | Fix Applied |
|---|---|
| `docs/architecture/governance-glossary.md` | Added proofpack vs evidence bundle disambiguation |
| `docs/architecture/canonical-terminology-index.md` | Clarified trust assessment vs authorization distinction |
| `docs/architecture/receipts-and-degraded-states.md` | Added degraded state vs degraded observation disambiguation |
| `docs/architecture/governance-glossary.md` | Added orchestration vs scheduling vs routing disambiguation |
| `docs/architecture/governance-glossary.md` | Added worker vs node vs device vs candidate disambiguation |
| `docs/architecture/receipts-and-degraded-states.md` | Clarified receipt vs result vs outcome distinction |
| `docs/evidence-export-formats.md` | Replaced "fallback evidence" with "degraded state evidence" |

## Remaining Issues (Not Docs-Only)

| Issue | Location | Required Action |
|---|---|---|
| `policy-learning.ts` module name implies automatic learning | `src/lib/policy-learning/` | Rename to `policy-promotion` or add deprecation comment |
| `fallbackEvidence` in evidence-graph.ts types | `src/lib/control-plane/evidence-graph.ts` | Rename to `degradedStateEvidence` |
| `ExecutionIntent` nested in `ExecutionPlan` conflates intent/plan | `src/lib/control-plane/execution-plans.ts` | Consider separating intent reference from plan definition |
| `RemoteExecutionResult` contains `receipt` field (result vs receipt conflation) | `src/lib/control-plane/remote-execution.ts` | Consider renaming to `RemoteExecutionResponse` or similar |
