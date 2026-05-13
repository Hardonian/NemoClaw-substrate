<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Gap Radar

This document maps unmet operational needs that justify the NemoClaw fork. Each entry includes the problem, why it matters, current repo status, implementation evidence (if any), missing work, reviewer risk if absent, and recommended follow-up owner.

## Gap Inventory

### 1. Intent Contracts

- **Problem**: Without a structured representation of what was requested, there is no baseline against which to evaluate what happened. Free-form prompts are insufficient for replay validation.
- **Why it matters**: Intent contracts provide the hash-anchored starting point for all downstream governance checks. Without them, replay validation has no reference.
- **Current repo status**: **Implemented** — type definitions, hashing, authority chains, delegation scopes, escalation boundaries all defined.
- **Implementation evidence**: `src/lib/control-plane/intent-contract.ts` (597 lines), `src/lib/control-plane/intent-contract.test.ts`
- **Missing work**: Persistence of intent contracts; integration into runtime dispatch path; operator review UI for intent-to-plan transitions.
- **Reviewer risk if absent**: HIGH — replay validation cannot verify what was originally requested without a stable intent reference.
- **Follow-up owner**: Kilo

### 2. Evidence Graph

- **Problem**: Individual receipts and events are not sufficient. Reviewers need to trace relationships between intents, plans, receipts, proofs, degraded states, and policy outcomes.
- **Why it matters**: Without a connected evidence graph, each artifact must be verified in isolation, which is fragile and expensive.
- **Current repo status**: **Partial** — `evidence-types.ts` defines artifact kinds, bundles, manifests, and verification results. `evidence-export.ts` produces deterministic bundles. Lineage references exist in receipts.
- **Implementation evidence**: `src/lib/control-plane/evidence-types.ts`, `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-graph.ts`
- **Missing work**: Cross-artifact relationship indexing; query layer for evidence traversal; visual evidence chain representation.
- **Reviewer risk if absent**: MEDIUM — individual artifacts are verifiable but relationship auditing requires manual correlation.
- **Follow-up owner**: Kilo

### 3. Institutional Operational Memory

- **Problem**: Governance decisions, exceptions, and degraded state events are not retained across sessions. Each invocation starts fresh.
- **Why it matters**: Without institutional memory, the same governance failures recur without historical context. Operators cannot trace policy evolution or exception patterns.
- **Current repo status**: **Scaffolded** — types defined for operational memory entries, governance incidents, exception clusters, historical trust records, routing history, replay integrity incidents, adjudication records.
- **Implementation evidence**: `src/lib/control-plane/institutional-memory.ts` (658 lines)
- **Missing work**: Persistence layer; query and aggregation functions; integration into execution decision paths; memory retention and expiration policies.
- **Reviewer risk if absent**: HIGH — no crash recovery, no policy evolution tracking, no exception pattern analysis.
- **Follow-up owner**: Codex

### 4. Multi-Agent Governance

- **Problem**: When multiple agents share a sandbox or coordinate across sandboxes, governance decisions for one agent may affect another. Current policy evaluation is single-agent scoped.
- **Why it matters**: Policy conflicts between agents, resource contention, and cross-agent escalation are not modeled.
- **Current repo status**: **Not implemented** — policy evaluation operates on single-request context.
- **Implementation evidence**: None directly. `agent-governance.ts` exists but operates within single-agent bounds.
- **Missing work**: Multi-agent policy scoping; cross-agent conflict detection; shared resource governance; agent identity isolation in policy evaluation.
- **Reviewer risk if absent**: LOW for current single-agent use; HIGH if multi-agent coordination is introduced without governance model.
- **Follow-up owner**: Opus

### 5. Digital-Twin Governance Simulation

- **Problem**: Policy changes cannot be safely evaluated against historical execution data before promotion. Operators must promote policies blind to their impact on past decisions.
- **Why it matters**: Without simulation, policy changes are effectively production experiments. Governance changes should be replayable against historical evidence before promotion.
- **Current repo status**: **Scaffolded** — simulation types exist for routing, policy impact, replay forecast, what-if, degraded analysis, trust analysis, candidate selection. Routing simulation partially implemented.
- **Implementation evidence**: `src/lib/control-plane/governance-simulation.ts` (542 lines)
- **Missing work**: Policy impact simulation execution engine; replay forecast against historical evidence; what-if analysis framework; simulation result comparison and diff.
- **Reviewer risk if absent**: MEDIUM — policy changes are supervised (not automatic) per ADR 0004, but lack of simulation means impact assessment is manual.
- **Follow-up owner**: Gemini

### 6. Capability Economics

- **Problem**: There is no cost model for governance overhead. Trust verification, evidence generation, replay validation, and degraded state handling all add latency and resource cost that is not quantified.
- **Why it matters**: Without a cost model, operators cannot reason about the tradeoff between governance rigor and execution throughput. This becomes critical when scaling to distributed workers.
- **Current repo status**: **Scaffolded** — type definitions for trust cost, execution cost, degraded state penalty, evidence burden, reliability decay.
- **Implementation evidence**: `src/lib/control-plane/capability-economics.ts` (428 lines)
- **Missing work**: Actual cost computation functions; integration into routing decisions; cost-per-governance-layer breakdown; operator cost dashboard.
- **Reviewer risk if absent**: LOW for current in-process use; HIGH if distributed execution is introduced without cost awareness.
- **Follow-up owner**: Gemini

### 7. Human Escalation Infrastructure

- **Problem**: When governance decisions cannot be made automatically (trust below threshold, evidence missing, policy denied), there is no structured path to escalate to a human operator.
- **Why it matters**: Without escalation infrastructure, governance failures either block execution entirely (fail-closed, which is correct but disruptive) or fall through to undefined behavior.
- **Current repo status**: **Scaffolded** — escalation bundles, operator takeover envelopes, adjudication queues, review contracts, execution pause/resume, approval stages, confidence escalation all typed.
- **Implementation evidence**: `src/lib/control-plane/escalation.ts` (625 lines), `src/lib/control-plane/escalation.test.ts`
- **Missing work**: Runtime integration of escalation triggers; operator notification and response path; escalation SLA tracking; adjudication queue processing.
- **Reviewer risk if absent**: MEDIUM — escalation types exist but are not wired to runtime decision paths. Fail-closed behavior works but escalation path is manual.
- **Follow-up owner**: Codex

### 8. Constitutional Runtime Invariants

- **Problem**: Core governance principles (operator supremacy, evidence requirement, no hidden retry, no silent execution, fail-closed, etc.) must be enforced at runtime, not just documented.
- **Why it matters**: If constitutional invariants are only documentation, they can be silently violated by code changes. Runtime enforcement catches invariant violations before they reach production.
- **Current repo status**: **Scaffolded** — invariant rule types, violation types, validation result types, and invariant categories defined. Violation detection functions exist.
- **Implementation evidence**: `src/lib/control-plane/constitutional-runtime.ts` (522 lines), `src/lib/control-plane/constitutional-runtime.test.ts`
- **Missing work**: Integration of invariant checks into execution lifecycle transitions; automatic blocking on critical invariant violations; operator notification of invariant violations.
- **Reviewer risk if absent**: HIGH — constitutional invariants are the foundation of the anti-theatre doctrine. Without runtime enforcement, the doctrine is aspirational.
- **Follow-up owner**: Kilo

### 9. Proofpack Integrity

- **Problem**: Proofpacks must be deterministic and tamper-evident to serve as review artifacts. Current implementation provides SHA-256 digests over deterministic serialization.
- **Why it matters**: Non-deterministic proofpacks cannot be replay-validated. Tamper-evident proofpacks are essential for evidence credibility.
- **Current repo status**: **Implemented** — deterministic serialization, SHA-256 digests, manifest integrity checks, tamper rejection tests.
- **Implementation evidence**: `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-types.ts`, `test/verify-proofpack.test.ts`
- **Missing work**: Cryptographic signing (hardware trust root); cross-environment proofpack verification; proofpack compression for large evidence sets.
- **Reviewer risk if absent**: LOW — current implementation provides tamper detection via digests. Cryptographic signing is a future enhancement, not a gap.
- **Follow-up owner**: Kilo

### 10. Queue/Lease/Idempotency Substrate

- **Problem**: Execution work items need deterministic queue ordering, lease-based ownership, and idempotency keys to prevent duplicate or conflicting execution.
- **Why it matters**: Without queue/lease/idempotency semantics, concurrent execution requests can produce conflicting state, duplicate work, or silent overwrites.
- **Current repo status**: **Implemented (in-process)** — queue item creation, lease acquire/renew/release/expire, ownership validation, idempotency key checking, stale owner rejection, split-brain lease detection.
- **Implementation evidence**: `src/lib/control-plane/execution-lifecycle.ts` (1087 lines), `src/lib/scheduler/scheduler.ts` (588 lines), `src/lib/control-plane/execution-lifecycle.test.ts`
- **Missing work**: Durable queue storage; distributed lease coordination; crash recovery for in-flight leases; idempotency across process restarts.
- **Reviewer risk if absent**: MEDIUM — in-process semantics are correct but not crash-safe. Durable storage is a prerequisite for production use.
- **Follow-up owner**: Codex

### 11. Operator CLI / Review UX

- **Problem**: Operators need a way to inspect execution decisions, evidence, degraded states, and policy outcomes without mutating system state.
- **Why it matters**: Without read-only inspection surfaces, operators cannot verify governance claims or review evidence before approving escalated decisions.
- **Current repo status**: **Fixture-backed implementation** — operator CLI commands exist with deterministic fixture output. Redaction applied to demo tokens.
- **Implementation evidence**: `src/lib/commands/operator.ts`, `fixtures/demo/`, `test/operator/operator.test.ts`
- **Missing work**: Live telemetry integration; interactive review workflows; evidence visualization; policy diff display; escalation response interface.
- **Reviewer risk if absent**: MEDIUM — fixture-backed output is sufficient for review/demo but not for production operation.
- **Follow-up owner**: Kilo

### 12. Secure Transport and Redaction

- **Problem**: Remote execution requires authenticated transport with credential redaction, SSRF validation, and command safety checks before any command is sent.
- **Why it matters**: Without secure transport and redaction, credentials leak in logs, SSRF attacks bypass network policies, and unsafe commands execute on remote workers.
- **Current repo status**: **Implemented** — pattern-based credential redaction, SSRF validation, command descriptor safety checks, transport safety validation, export boundary enforcement.
- **Implementation evidence**: `src/lib/control-plane/remote-execution.ts`, `src/lib/security/security-policy.ts`, `src/lib/security/redact.ts`, `src/lib/security/transport-safety.ts`, `test/secret-redaction.test.ts`
- **Missing work**: mTLS support; credential rotation; encrypted evidence export; transport-layer attestation.
- **Reviewer risk if absent**: LOW for current in-process use; MEDIUM if remote execution is enabled without mTLS.
- **Follow-up owner**: Kilo

### 13. Policy Snapshots

- **Problem**: When an execution decision is made, the policy state at that moment must be captured for replay. If policy changes between execution and replay, the decision cannot be re-validated.
- **Why it matters**: Without policy snapshots, replay validation cannot determine whether a decision was correct under the policy that existed at execution time.
- **Current repo status**: **Implemented** — execution policy snapshots are created and hashed as part of execution plan lineage.
- **Implementation evidence**: `src/lib/control-plane/execution-plans.ts` (ExecutionPolicySnapshot), `src/lib/control-plane/execution-lifecycle.ts` (createExecutionPolicySnapshot)
- **Missing work**: Policy snapshot diff comparison; snapshot storage and retrieval; policy version pinning for replay validation.
- **Reviewer risk if absent**: LOW — snapshots are created and hashed. Diff comparison is a future enhancement.
- **Follow-up owner**: Kilo

### 14. Trust Snapshots

- **Problem**: Worker trust assessments must be captured at execution time for replay. Trust posture changes between execution and replay invalidate the decision context.
- **Why it matters**: Without trust snapshots, replay validation cannot verify whether the worker was trust-assessed at the time of execution.
- **Current repo status**: **Implemented** — execution trust snapshots are created and hashed as part of execution plan lineage.
- **Implementation evidence**: `src/lib/control-plane/execution-plans.ts` (ExecutionTrustSnapshot), `src/lib/control-plane/execution-lifecycle.ts` (createExecutionTrustSnapshot)
- **Missing work**: Trust snapshot diff comparison; trust posture change detection; trust history query.
- **Reviewer risk if absent**: LOW — snapshots are created and hashed. Trust history is a future enhancement.
- **Follow-up owner**: Kilo

## Summary

| Classification | Count |
|---|---|
| Implemented | 5 (intent contracts, proofpack integrity, queue/lease/idempotency, secure transport/redaction, policy/trust snapshots) |
| Partial | 2 (evidence graph, GPU balancing) |
| Scaffolded | 6 (institutional memory, digital-twin simulation, capability economics, human escalation, constitutional runtime invariants, multi-agent governance) |
| Not implemented | 1 (multi-agent governance) |

Highest reviewer risk gaps: constitutional runtime invariants enforcement, institutional memory persistence, human escalation runtime integration.
