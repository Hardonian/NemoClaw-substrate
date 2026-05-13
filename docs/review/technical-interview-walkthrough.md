<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Technical Interview Walkthrough

This document provides a structured walkthrough for a technical reviewer to evaluate the NemoClaw fork in depth. It is organized as a sequence of inspection points with expected findings.

## Session Structure (30-45 minutes)

### Part 1: Context Setting (5 min)

**Objective**: Establish what this fork does and does not claim.

- Read: `README.md` — "What This Does Not Claim" section
- Read: `docs/adr/0001-anti-theatre-governance.md` — anti-theatre principles
- Read: `docs/known-limitations.md` — current limitations
- Expected finding: The repo explicitly rejects claims of production readiness, autonomous orchestration, GPU balancing, Dynamo integration, cryptographic attestation, automatic policy learning, durable distributed queues, daemon workers, and automatic recovery loops.

### Part 2: Control Plane Architecture (10 min)

**Objective**: Understand the governance substrate structure.

Inspect in order:

1. `src/lib/control-plane/types.ts` — Core type definitions: DegradedState, WorkerTrustDecision, WorkerCapabilityAttestation, CapabilitySnapshot, ExecutionReceipt. Note the explicit enum values for trust levels, attestation statuses, degraded categories, and reason codes.

2. `src/lib/control-plane/governance.ts` — Policy evaluation engine. Check: `evaluatePolicy()` is synchronous. PolicyBundle contains rules with effect (allow/deny/approval_required). Decision includes reason codes.

3. `src/lib/control-plane/execution-plans.ts` — Execution plan lifecycle. Check: Plan status enum, ExecutionIntent definition, ExecutionApproval definition, policy/trust snapshot creation, intent hashing.

4. `src/lib/control-plane/execution-lifecycle.ts` — Core lifecycle operations. Check: State transition validation, queue/lease operations, receipt generation, proofpack building, hidden retry detection, degraded state trigger detection. 1087 lines.

5. `src/lib/control-plane/replay.ts` — Replay validation. Check: `buildReplayEnvelope()` and `validateReplayEnvelope()`. Validation checks: event count, sequence, lineage, reason codes, execution lineage, digest.

6. `src/lib/control-plane/remote-execution.ts` — Remote execution adapter. Check: `parseRemoteExecutionConfig()` requires `NEMOCLAW_REMOTE_EXECUTION=1`. Gate sequence: config → policy → approval → trust → command safety → transport safety → execution.

### Part 3: Evidence and Proofpack (5 min)

**Objective**: Verify evidence export is deterministic and tamper-evident.

1. `src/lib/control-plane/evidence-types.ts` — Check: ProofpackExportFormat, EvidenceClassification, EvidenceDigest, EvidenceVerificationResult types.

2. `src/lib/control-plane/evidence-export.ts` — Check: `buildEvidenceBundle()` uses `deterministicSerialize()` for stable output. `sha256Digest()` computes hashes. Manifest includes integrity digest.

3. `src/lib/control-plane/serde.ts` — Check: `deterministicSerialize()` produces recursive key-sorted JSON. This is the foundation of proofpack determinism.

Expected finding: Same input always produces same proofpack digest. Tampered proofpack is rejected. No cryptographic signing yet.

### Part 4: Trust and Attestation (5 min)

**Objective**: Verify trust assessment is evidence-based, not assumed.

1. `src/lib/control-plane/worker-trust.ts` — Check: `buildWorkerIdentity()`, `createCapabilityClaimFromProbe()`, `markAttestationStatus()`, `decideWorkerTrust()`. Trust cascade: identity → attestation → evaluation → decision.

2. `src/lib/control-plane/worker-probes.ts` — Check: Probe output parsing for vllm, ollama, llama.cpp, nim, generic runtimes. Pattern-based parsing, not protocol-verified.

3. `src/lib/control-plane/device-registry.ts` — Check: Local registry of known worker nodes. Populated by probes, not automatic discovery.

Expected finding: Self-reported claims are marked `self_reported` and flagged `self_reported_not_sufficient`. Probe-observed claims require operator approval for trust. No cryptographic attestation.

### Part 5: Tests as Anti-Theatre Proof (10 min)

**Objective**: Verify that tests actively reject bad behavior, not just confirm good behavior.

1. `src/lib/control-plane/degraded-state-chaos.test.ts` — This is the most important test file. It:
   - Mutates replay envelopes and confirms rejection
   - Injects hidden retry attempts and confirms detection
   - Creates split-brain lease conflicts and confirms rejection
   - Simulates stale ownership and confirms rejection
   - Tests blocked remote execution paths

2. `src/lib/control-plane/execution-lifecycle.test.ts` — Tests:
   - Legal state transitions (accepted)
   - Illegal state transitions (rejected)
   - Missing reason codes (rejected)
   - Expired plans (rejected)
   - Duplicate lease attempts (rejected)

3. `src/lib/control-plane/evidence-export.test.ts` — Tests:
   - Deterministic output for same input
   - Tampered proofpack rejection
   - Manifest integrity check

4. `src/lib/control-plane/remote-execution.test.ts` — Tests:
   - Disabled by default
   - Policy denial blocks execution
   - Missing approval blocks execution
   - Trust below threshold blocks execution
   - Unsafe command blocks execution
   - Invalid URL blocks execution

5. `src/lib/dynamo/dynamo-adapter.test.ts` — Tests:
   - In-memory CRUD operations
   - Disabled by default
   - Fail-closed on unavailable

Expected finding: Tests verify rejection of bad behavior, not just acceptance of good behavior. This is the anti-theatre proof.

### Part 6: Security Boundaries (5 min)

**Objective**: Verify security controls are explicit, not assumed.

1. `src/lib/security/security-policy.ts` — Check: DEFAULT_SECURITY_POLICY, command descriptor validation, URL validation, auth redaction.

2. `src/lib/security/redact.ts` — Check: Pattern-based secret redaction. Not full DLP.

3. `src/lib/security/transport-safety.ts` — Check: Transport-level validation before any remote request.

4. `src/lib/security/export-boundary.ts` — Check: Secrets not leaked in proofpack exports.

5. `nemoclaw/src/blueprint/ssrf.ts` — Check: SSRF validation for network requests.

Expected finding: Security controls are explicit and test-verified. Pattern-based redaction is not a substitute for formal DLP. SSRF validation exists but is not comprehensive.

### Part 7: Scaffolded Components (5 min)

**Objective**: Identify what exists as types but is not yet wired.

1. `src/lib/control-plane/constitutional-runtime.ts` — Invariant types defined, violation detection exists, but not wired into execution paths.

2. `src/lib/control-plane/institutional-memory.ts` — Memory entry types defined, incident tracking defined, but no persistence or query layer.

3. `src/lib/control-plane/escalation.ts` — Escalation bundles, takeover envelopes, adjudication queues typed, but not connected to runtime.

4. `src/lib/control-plane/governance-simulation.ts` — Simulation types defined, routing simulation partially implemented, but policy impact and replay forecast simulations incomplete.

5. `src/lib/control-plane/capability-economics.ts` — Cost model types defined, not integrated into routing decisions.

6. `src/lib/dynamo/dynamo-adapter.ts` — In-memory store, no DynamoDB connection, disabled by default.

Expected finding: Scaffolded components have comprehensive type definitions but lack runtime integration, persistence, or external connectivity.

## Expected Conclusions

After completing this walkthrough, a reviewer should conclude:

1. **Governance substrate is implemented** for in-process execution. Policy evaluation, replay validation, proofpack export, and execution lifecycle records are functional and test-verified.

2. **Trust assessment is evidence-based**. Worker probes and attestation status are used to assess trust, but trust does not bypass authorization. Self-reported claims are explicitly marked as insufficient.

3. **Evidence is deterministic and tamper-evident**. Proofpacks use SHA-256 digests over deterministically serialized data. Tampered proofpacks are rejected.

4. **Remote execution is opt-in and gated**. It requires explicit env flag and passes multiple safety checks before transport.

5. **Degraded states are explicit**. No silent masking of failures. Chaos tests verify hidden retry detection.

6. **Major gaps remain**: constitutional invariant enforcement, institutional memory persistence, escalation runtime integration, durable storage, cryptographic attestation.

7. **This is not production-ready**. It is a reviewable substrate for governance and evidence, not a distributed execution platform.

## Follow-Up Inspection Points

If time permits, also inspect:

- `src/lib/scheduler/scheduler.ts` — Daemon-safe lease and queue management
- `src/lib/orchestration/orchestrator.ts` — Orchestration engine (env-flagged)
- `src/lib/policy-learning/policy-learning.ts` — Supervised policy proposals (not automatic learning)
- `src/lib/control-plane/intent-contract.ts` — Intent contract model with authority chains
- `src/lib/control-plane/heterogeneous-routing.ts` — Heterogeneous candidate selection
- `src/lib/control-plane/operational-memory.ts` — Append-only event log
