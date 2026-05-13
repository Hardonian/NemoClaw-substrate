<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reviewer Evidence Map

This document maps each major architectural claim to implementation files, test files, documentation, demo/fixture availability, current limitations, and status. A claim without implementation and test evidence should be downgraded.

## Core Claims

### 1. Replay Fail-Closed

- **Claim**: Replay validation rejects any drift in lineage, digests, ownership, leases, trust posture, reason codes, or hidden degraded state triggers.
- **Implementation files**: `src/lib/control-plane/replay.ts`, `src/lib/control-plane/execution-lifecycle.ts`
- **Test files**: `src/lib/control-plane/degraded-state-chaos.test.ts`, `src/lib/control-plane/execution-lifecycle.test.ts`
- **Docs**: `docs/architecture/receipts-and-degraded-states.md`, `docs/reference/reason-codes.md`, `docs/replay-inspector.md`
- **Demo/fixture**: `npm run verify:chaos`, `npm run verify:replay`
- **Current limitation**: Replay is local validation against in-process data structures. No distributed consensus mechanism. No persistent replay log.
- **Status**: Implemented

### 2. Telemetry Is Evidence Not Authority

- **Claim**: Worker probe outputs and registry updates are treated as evidence for trust assessment, not as authoritative truth. Telemetry must be correlated with attestation status and policy evaluation.
- **Implementation files**: `src/lib/control-plane/worker-probes.ts`, `src/lib/control-plane/worker-trust.ts`, `src/lib/control-plane/device-registry.ts`, `src/lib/control-plane/local-runtime-probes.ts`, `src/lib/control-plane/remote-runtime-probes.ts`
- **Test files**: `src/lib/control-plane/worker-trust.test.ts`, `src/lib/control-plane/worker-probes.test.ts`, `src/lib/control-plane/local-runtime-probes.test.ts`, `src/lib/control-plane/remote-runtime-probes.test.ts`
- **Docs**: `docs/architecture/observability.md`, `docs/architecture/worker-adapters.md`
- **Demo/fixture**: `npm run verify:remote-probes`
- **Current limitation**: Probe outputs are parsed for vllm, ollama, llama.cpp, nim, and generic runtimes. Probe parsing is pattern-based, not protocol-verified.
- **Status**: Implemented

### 3. Remote Execution Is Opt-In

- **Claim**: Remote execution is disabled by default. It requires `NEMOCLAW_REMOTE_EXECUTION=1` and passes policy evaluation, approval check, trust assessment, command safety validation, and transport safety checks before any command is sent.
- **Implementation files**: `src/lib/control-plane/remote-execution.ts`, `src/lib/security/security-policy.ts`
- **Test files**: `src/lib/control-plane/remote-execution.test.ts`, `src/lib/control-plane/degraded-state-chaos.test.ts`, `src/lib/security/security-policy.test.ts`
- **Docs**: `docs/architecture/remote-execution-adapters.md`, `docs/architecture/security-boundaries.md`
- **Demo/fixture**: `npm run verify:remote-probes`
- **Current limitation**: No worker fleet. Adapter boundary is a single guarded seam, not a distributed execution layer.
- **Status**: Opt-in implementation

### 4. Trust Gates Remote Execution

- **Claim**: Before remote execution transport is initiated, the system evaluates: policy (allow/deny/approval_required), approval state (operator approved or not), trust posture (attestation status and trust level), command safety (command descriptor validation), and transport safety (URL validation, SSRF checks, auth redaction).
- **Implementation files**: `src/lib/control-plane/remote-execution.ts`, `src/lib/control-plane/worker-trust.ts`, `src/lib/control-plane/execution-plans.ts`, `src/lib/security/security-policy.ts`, `src/lib/security/transport-safety.ts`
- **Test files**: `src/lib/control-plane/remote-execution.test.ts`, `src/lib/control-plane/worker-trust.test.ts`, `src/lib/control-plane/degraded-state-chaos.test.ts`
- **Docs**: `docs/architecture/worker-adapters.md`, `docs/adr/0006-trust-and-attestation-seams.md`
- **Demo/fixture**: `npm run verify:remote-probes`, `npm run verify:chaos`
- **Current limitation**: Trust assessment is structural (status enum and reason codes), not cryptographic. No hardware trust root.
- **Status**: Implemented

### 5. Degraded States Are Explicit

- **Claim**: The system classifies degraded states into explicit categories (healthy, constrained, degraded, unavailable, partial_capability, approval_blocked, stale, unreachable, unknown) with reason codes and severity levels. No silent masking of degraded states as success.
- **Implementation files**: `src/lib/control-plane/types.ts`, `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/control-plane/remote-execution.ts`
- **Test files**: `src/lib/control-plane/degraded-state-chaos.test.ts`, `src/lib/control-plane/execution-lifecycle.test.ts`
- **Docs**: `docs/architecture/receipts-and-degraded-states.md`, `docs/reference/fault-matrix.md`, `docs/reference/state-transitions.md`
- **Demo/fixture**: `npm run verify:chaos`, `node ./bin/nemoclaw.js operator degraded --json`
- **Current limitation**: Degraded state classification is in-process. No cross-worker degraded state correlation.
- **Status**: Implemented

### 6. No Hidden Fallback

- **Claim**: The system does not silently retry, auto-fallback, or self-heal. Chaos tests verify that hidden retry attempts and hidden degraded state triggers are detected and rejected.
- **Implementation files**: `src/lib/control-plane/degraded-state-chaos.test.ts`, `src/lib/control-plane/execution-lifecycle.ts`
- **Test files**: `src/lib/control-plane/degraded-state-chaos.test.ts` (tests hidden retry detection, hidden degraded state trigger detection)
- **Docs**: `docs/adr/0001-anti-theatre-governance.md`, `docs/architecture/anti-theatre-doctrine.md`
- **Demo/fixture**: `npm run verify:chaos`
- **Current limitation**: Hidden fallback detection is test-verified for in-process execution paths. Remote execution hidden retry depends on worker honesty.
- **Status**: Implemented

### 7. Operator CLI Is Read-Only by Default

- **Claim**: Operator CLI commands provide inspection surfaces that do not mutate system state. Output is deterministic and fixture-backed for review/demo use.
- **Implementation files**: `src/lib/commands/operator.ts`, `src/lib/operator/format.ts`, `fixtures/demo/`
- **Test files**: `test/operator/operator.test.ts`, `test/operator/operator-smoke.test.ts`
- **Docs**: `docs/operator/operator-cli.md`, `docs/demo/operator-walkthrough.md`
- **Demo/fixture**: `npm run build:cli && node ./bin/nemoclaw.js operator status --json`, `node ./bin/nemoclaw.js operator degraded --json`
- **Current limitation**: Output is fixture-backed, not live telemetry. No mutation commands exist yet.
- **Status**: Fixture-backed implementation

### 8. Changelog Hygiene Enforced

- **Claim**: Changelog entries follow a structured format and are validated by automated checks. Duplicate headers, missing sections, and inconsistent formatting are rejected.
- **Implementation files**: `scripts/verify-changelog-hygiene.mjs`
- **Test files**: `test/verify-changelog-hygiene.test.ts`
- **Docs**: `docs/CONTRIBUTING.md`
- **Demo/fixture**: `npm run verify:changelog-hygiene`
- **Current limitation**: Checks structural format, not semantic correctness of changelog entries.
- **Status**: Implemented

### 9. Evidence/Proofpacks Deterministic

- **Claim**: Proofpack export produces deterministic output for the same input evidence. SHA-256 digests over deterministically serialized event sequences enable tamper detection.
- **Implementation files**: `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-types.ts`, `src/lib/control-plane/serde.ts`
- **Test files**: `src/lib/control-plane/evidence-export.test.ts`, `test/verify-proofpack.test.ts`, `src/lib/performance/proofpack-benchmark.test.ts`
- **Docs**: `docs/evidence-export-formats.md`, `docs/deterministic-export-guarantees.md`, `docs/evidence-export-formats.md`
- **Demo/fixture**: `npm run verify:proofpack`, `npm run verify:export`
- **Current limitation**: No cryptographic signing by hardware trust root. No cross-environment proofpack verification.
- **Status**: Implemented

### 10. Queue/Lease Semantics

- **Claim**: Queue items have explicit lifecycle states. Leases enforce ownership with acquire, renew, release, expire, and revoke operations. Stale owner and split-brain lease conflicts are detected and rejected.
- **Implementation files**: `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/scheduler/scheduler.ts`
- **Test files**: `src/lib/control-plane/execution-lifecycle.test.ts`, `src/lib/scheduler/scheduler.test.ts`, `src/lib/performance/queue-benchmark.test.ts`
- **Docs**: `docs/architecture/execution-lifecycle-substrate.md`, `docs/architecture/scheduler.md`
- **Demo/fixture**: `npm run verify:execution-lifecycle`
- **Current limitation**: In-process only. No durable queue storage. No distributed lease coordination. No crash recovery for in-flight leases.
- **Status**: Implemented (in-process)

### 11. Execution Plans

- **Claim**: Execution plans carry typed status, phase transitions, intent, approval, authorization, policy snapshot, trust snapshot, and routing decision. Plans are validated for legal state transitions.
- **Implementation files**: `src/lib/control-plane/execution-plans.ts`, `src/lib/control-plane/execution-lifecycle.ts`
- **Test files**: `src/lib/control-plane/execution-plans.test.ts`, `src/lib/control-plane/execution-lifecycle.test.ts`
- **Docs**: `docs/architecture/execution-lifecycle-substrate.md`, `docs/reference/state-transitions.md`
- **Demo/fixture**: `npm run verify:execution-lifecycle`
- **Current limitation**: Plans are in-process data structures. No persistent plan storage or plan query layer.
- **Status**: Implemented (in-process)

### 12. Governed Orchestration

- **Claim**: Orchestration engine supports plans, runs, steps, and receipts with explicit reason codes. Orchestrator is disabled by default and requires `NEMOCLAW_ORCHESTRATION=1`.
- **Implementation files**: `src/lib/orchestration/orchestrator.ts`, `src/lib/orchestration/types.ts`
- **Test files**: `src/lib/orchestration/orchestrator.test.ts`
- **Docs**: `docs/architecture/execution-lifecycle-substrate.md`, `docs/diagrams/orchestration-flow.mermaid`
- **Demo/fixture**: `npm run verify:orchestration` (when env flag set)
- **Current limitation**: Disabled by default. No daemon orchestration. No distributed orchestration. Not production-ready.
- **Status**: Implemented (disabled by default, env flag required)

### 13. Dynamo Adapter

- **Claim**: A Dynamo adapter seam exists with type definitions, in-memory store, CRUD operations, and health probe checks. Adapter is disabled by default.
- **Implementation files**: `src/lib/dynamo/dynamo-adapter.ts`, `src/lib/dynamo/types.ts`, `src/lib/dynamo/index.ts`
- **Test files**: `src/lib/dynamo/dynamo-adapter.test.ts`
- **Docs**: `docs/roadmap.md` (listed as deferred), `docs/architecture/target-state.md`
- **Demo/fixture**: `npm run test` (runs Dynamo adapter unit tests)
- **Current limitation**: In-memory store only. No DynamoDB connection. No production dispatch. Disabled by default. All operations are CRUD on in-memory maps.
- **Status**: Scaffolded

## Claims Without Implementation

### GPU Balancing

- **Claim**: Distributed GPU scheduling and load balancing across workers.
- **Implementation files**: `src/lib/onboard.ts` (GPU detection only), `src/lib/gpu-scheduling/gpu-scheduler.ts` (partial types)
- **Test files**: None specific to GPU balancing
- **Docs**: `docs/roadmap.md` (deferred)
- **Status**: Partial (GPU detection exists, distributed scheduling does not)

### Autonomous Orchestration

- **Claim**: Self-directed execution scheduling and recovery.
- **Status**: Intentionally not implemented (ADR 0001)

### Automatic Policy Learning

- **Claim**: System learns and mutates policy without operator review.
- **Implementation files**: `src/lib/policy-learning/policy-learning.ts` (supervised proposals only)
- **Test files**: `src/lib/policy-learning/policy-learning.test.ts`
- **Status**: Partial (supervised proposals only, not automatic learning)

### Cryptographic Attestation

- **Claim**: Hardware-backed worker attestation and trust chain.
- **Implementation files**: `src/lib/control-plane/worker-trust.ts` (structural attestation only)
- **Status**: Partial (structural attestation with status enum, no cryptographic signing)

## Summary

| Status | Claim Count |
|---|---|
| Implemented | 10 |
| Opt-in implementation | 2 |
| Implemented (in-process) | 2 |
| Implemented (disabled by default) | 1 |
| Scaffolded | 1 |
| Partial | 3 |
| Intentionally not implemented | 1 |
