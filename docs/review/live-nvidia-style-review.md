<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Live Review Narrative — Senior Reviewer 20-Minute Walkthrough

This document prepares a senior reviewer to understand the NemoClaw fork in 20 minutes. It is structured as a guided review, not a marketing pitch.

## 2-Minute Pitch

NemoClaw is a fork of the NemoClaw/OpenClaw sandbox stack that inserts a deterministic governance and evidence layer between what an AI agent requests, what policy permits, and what actually executes.

The problem it solves is narrow: always-on AI assistants tend to blur intent, policy, and outcome. An operator cannot tell whether a result represents what was requested, what was allowed, or what happened after silent retries.

This fork adds typed execution lifecycle records, replay fail-closed validation, explicit degraded state taxonomy, opt-in remote execution with trust gates, and deterministic proofpack exports. It does not add distributed workers, autonomous orchestration, or GPU balancing. Those are explicitly deferred.

The useful part is not scale. It is inspectability.

## Architecture Walk (5 minutes)

### Layer 1: Retained Sandbox Stack

- NemoClaw CLI, OpenShell blueprint, local inference routing, plugin system, network policies — all retained from upstream.
- Files: `src/lib/sandbox/`, `src/lib/inference/`, `nemoclaw/`, `nemoclaw-blueprint/`

### Layer 2: Governance Substrate (new)

- **Policy evaluation**: `governance.ts` — rule-based evaluation with scope precedence, reason codes. `policy-engine.ts` — scope precedence hierarchy (emergency > operator > execution > worker > runtime > environment > global).
- **Intent contracts**: `intent-contract.ts` — typed intent with operator authority, delegation scopes, escalation boundaries. Intent is hashed for replay.
- **Execution plans**: `execution-plans.ts` — plans carry intent, approval, authorization, policy snapshot, trust snapshot, routing decision.
- **Trust assessment**: `worker-trust.ts` — identity → attestation → evaluation → decision cascade. Attestation statuses: none, self_reported, probe_observed, operator_approved, expired, revoked, conflict_detected.
- **Remote execution**: `remote-execution.ts` — opt-in (env flag). Before transport: policy check, approval check, trust check, command safety, transport safety, auth redaction.

### Layer 3: Evidence Substrate (new)

- **Replay**: `replay.ts` — deterministic SHA-256 digest over serialized event sequences. Validates: event count, sequence order, replay lineage, reason codes, execution lineage, digest. Rejects on any drift.
- **Evidence export**: `evidence-export.ts` — deterministic EvidenceBundles and ReplayEvidencePackages with manifest integrity digests. JSON and NDJSON export.
- **Proofpacks**: `evidence-types.ts` — proofpack export formats, export options, event category classification. Tamper-evident via deterministic serialization + SHA-256.

### Layer 4: Execution Lifecycle (new)

- **Lifecycle records**: `execution-lifecycle.ts` (1087 lines) — plans, queue items, leases, receipts, proofpacks, diagnostics. 47 typed reason codes. Legal/illegal state transition validation. Hidden retry detection. Stale owner rejection. Split-brain lease detection.
- **Scheduler**: `scheduler.ts` (588 lines) — daemon-safe lease and queue management. Heartbeat monitoring. Stale daemon detection. Disabled by default.

### Layer 5: Scaffolds (not yet wired)

- Constitutional runtime invariants (`constitutional-runtime.ts`)
- Institutional operational memory (`institutional-memory.ts`)
- Escalation infrastructure (`escalation.ts`)
- Governance simulation (`governance-simulation.ts`)
- Capability economics (`capability-economics.ts`)
- Dynamo adapter (`dynamo-adapter.ts`)
- GPU scheduling (`gpu-scheduler.ts`)

## Verification Walk (3 minutes)

Run these commands to verify core claims without GPU, network, or live workers:

```bash
npm run verify:execution-lifecycle  # Lifecycle state transitions
npm run verify:chaos                 # Replay drift rejection
npm run verify:proofpack             # Proofpack determinism and tamper rejection
npm run verify:governed-routing      # Policy evaluation determinism
npm run verify:remote-probes         # Trust gates remote execution
npm run verify:export                # Evidence export integrity
npm run review:claims                # Docs claim-to-code verification
```

Each command is a deterministic, in-process test suite. No external dependencies required.

The chaos tests (`degraded-state-chaos.test.ts`) are the most important: they mutate evidence to confirm validation rejects it. This is the anti-theatre proof — the system does not accept tampered data.

## Evidence Walk (3 minutes)

### What counts as evidence

- Worker probe outputs (parsed for vllm, ollama, llama.cpp, nim, generic runtimes)
- Policy evaluation results (allow/deny/approval_required with reason codes)
- Trust assessment records (attestation status, reason codes, conflict detection)
- Execution receipts (with lineage, provenance, degraded state classification)
- Replay envelopes (with SHA-256 digest, lineage, reason codes)
- Proofpack exports (deterministic bundles with manifest integrity)

### What is NOT evidence

- Console output without receipt
- Telemetry without attestation correlation
- Trust claims without probe observation or operator approval
- Policy decisions without reason codes
- Execution results without lineage

### How to inspect evidence

```bash
# Operator CLI (fixture-backed)
npm run build:cli
node ./bin/nemoclaw.js operator status --json
node ./bin/nemoclaw.js operator degraded --json

# Evidence export
npm run verify:proofpack
npm run verify:export
```

## Failure-Mode Walk (3 minutes)

### What happens when things go wrong

1. **Policy denied**: Decision is recorded with `policy_denied` reason code. No execution occurs. Receipt reflects denial.
2. **Trust below threshold**: Worker is ineligible for remote execution. `attestation_conflict` or `attestation_expired` reason code. Decision blocked.
3. **Approval required**: Execution plan enters `approval_required` state. No execution until operator decides.
4. **Replay drift detected**: `validateReplayEnvelope()` returns `{ ok: false, reasons: [...] }`. Reasons include: `digest_mismatch`, `sequence_mismatch`, `missing_replay_lineage`, `missing_replay_reason_code`, `missing_execution_plan_lineage`, `policy_snapshot_mismatch`, `trust_snapshot_mismatch`.
5. **Degraded state**: Worker or subsystem classified as degraded, unavailable, stale, or conflicted. Classification carries reason code and severity. No silent masking.
6. **Hidden retry detected**: Chaos test detects hidden retry attempt and rejects it. `hidden_retry_detected` reason code.
7. **Stale owner**: Lease owner no longer matches current ownership. `stale_queue_ownership` or `ownership_mismatch` reason code. Rejected.
8. **Split-brain lease**: Two entities claim same lease. `duplicate_lease_attempt` or `conflicting_ownership` reason code. Rejected.
9. **Constitutional invariant violation**: If wired, critical violations block execution. Currently scaffolded.

### What does NOT happen

- No silent retry
- No automatic fallback
- No self-healing
- No autonomous recovery
- No hidden degraded state masking
- No inference of success from absence of failure

## Security/Trust Walk (2 minutes)

### Trust model

1. **Identity**: `WorkerIdentity` — worker ID, endpoint, provider. Built from explicit input, not discovered.
2. **Attestation**: `WorkerCapabilityAttestation` — claim with source (self_reported, probe_observed, operator_approved), staleness, conflict detection. Structural, not cryptographic.
3. **Evaluation**: `WorkerTrustDecision` — trust level, remote execution eligibility, reason codes. Derived from attestation, not assumed.
4. **Authorization**: Binary policy decision (allow/deny). Trust does not bypass authorization.

### Security boundaries

- SSRF validation before any remote request
- Pattern-based credential redaction before export
- Command descriptor safety validation before remote execution
- Transport safety validation (URL, headers, auth)
- Export boundary enforcement (secrets not leaked in proofpacks)
- Network policy presets for sandbox isolation

### What is NOT secured

- No cryptographic attestation (structural only)
- No hardware trust root
- No mTLS for remote transport (yet)
- No encrypted evidence export (yet)
- No credential rotation (yet)

## What to Inspect First

If you have 5 minutes:

1. Read `src/lib/control-plane/degraded-state-chaos.test.ts` — this is the anti-theatre proof. It mutates evidence and confirms rejection.
2. Read `src/lib/control-plane/replay.ts` — this is the replay fail-closed core. 59 lines, no dependencies beyond crypto and serialization.
3. Read `src/lib/control-plane/remote-execution.ts` — this is the trust-gated remote execution seam. Note the explicit gate sequence: policy → approval → trust → command safety → transport safety.
4. Run `npm run verify:chaos` — confirm all tampering vectors are rejected.

## Hard Questions and Honest Answers

**Q: Is this production-ready?**
A: No. In-process state, no durable storage, no cryptographic attestation, no distributed execution.

**Q: What's actually implemented vs scaffolded?**
A: Implemented: policy evaluation, replay validation, proofpack export, execution lifecycle records (in-process), trust assessment, remote execution adapter (opt-in), degraded state taxonomy, operator CLI (fixture-backed). Scaffolded: constitutional invariants, institutional memory, escalation, simulation, capability economics, Dynamo adapter, GPU scheduling.

**Q: Why not just add distributed execution now?**
A: Because distributed execution without replay, evidence, and degraded-state semantics creates systems where operators cannot verify what happened. Governance substrate first, scale later. This is explicit in ADR 0001.

**Q: Can I trust the worker probe outputs?**
A: No. Probe outputs are evidence, not authority. They must be correlated with attestation status and policy evaluation. Self-reported claims are marked as `self_reported` and flagged as `self_reported_not_sufficient`.

**Q: What happens if the process crashes mid-execution?**
A: In-flight leases and queue items are lost. This is a known limitation. Durable storage is a prerequisite for crash recovery and is listed as next useful work.

**Q: Is the remote execution adapter safe to enable?**
A: It is gated by policy, approval, trust, command safety, and transport safety checks. But there is no worker fleet, no mTLS, and no cryptographic attestation. Enable only for review/testing, not production.

**Q: What is the biggest gap?**
A: Constitutional invariants are defined but not wired into execution paths. Institutional memory is typed but not persistent. Escalation infrastructure exists but is not connected to runtime. These are the highest-risk gaps for production use.

## Known Limitations

- All control-plane state is in-process. Durable storage and crash recovery are not implemented.
- Remote execution is a guarded seam, not a worker fleet.
- Trust and attestation are structural, not cryptographic.
- Operator CLI output is fixture-backed for review/demo use.
- Some older docs remain as historical detail. Canonical review docs are linked from the README.
- GPU detection exists in onboard but distributed GPU scheduling is not implemented.
- Dynamo adapter is an in-memory store with no DynamoDB connection.
- Orchestrator requires `NEMOCLAW_ORCHESTRATION=1` and is not production-ready.

## Why This Is More Than OpenClaw + Remote Execution

OpenClaw solves: run AI assistants in sandboxes with local inference.

Adding remote execution to that solves: run AI assistants in sandboxes with local or remote inference.

NemoClaw fork solves: verify that what happened matches what was requested, what policy allowed, and what evidence supports it.

The difference is not execution capability. It is inspection capability. A reviewer can examine a decision path without trusting console prose or assuming silent retries succeeded.
