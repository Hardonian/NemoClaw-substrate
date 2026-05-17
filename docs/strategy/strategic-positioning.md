<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Strategic Positioning

## Thesis

NemoClaw fork is not about adding more execution capability to OpenClaw. It is about inserting a **deterministic operational governance and evidence substrate** that makes heterogeneous AI execution systems inspectable, replayable, and trust-bounded.

The positioning is: **governance and evidence first, orchestration scale later**.

## Why Fork

Three concerns are routinely conflated in always-on AI assistant stacks:

1. **What was requested** — the operator or system intent
2. **What policy allowed** — the governance decision
3. **What actually happened** — the execution result and its evidence

When these are not separated, operators must trust console output, assume silent retries succeeded, or accept degraded states that are never surfaced. The fork inserts explicit contracts and evidence between these layers.

## What Upstream OpenClaw-Style Systems Solve

- Running AI assistants inside sandboxed environments
- Local inference provider routing and configuration
- Plugin ecosystem for messaging and tool integrations
- Workspace and file management within sandboxes
- Basic network policy for sandbox isolation
- Onboarding and credential management

These are real problems. The fork does not replace them; it retains them.

## What NemoClaw Adds

### Governance Substrate

- **Typed execution lifecycle**: plans, queue items, leases, receipts, proofpacks, diagnostics — all with explicit state transitions and reason codes
- **Replay fail-closed**: validation rejects digest mismatch, missing lineage, missing reason codes, ownership mismatch, lease mismatch, trust drift, hidden degraded triggers, hidden retry paths
- **Explicit degraded states**: taxonomy of healthy, constrained, degraded, unavailable, partial_capability, stale, unreachable, unknown — each with reason codes and severity levels
- **Policy evaluation engine**: rule-based with scope precedence, effect classification, and structured reason codes
- **Constitutional runtime invariants**: defined invariant categories (operator supremacy, evidence requirement, bounded autonomy, anti-theatre, deterministic truth, non-fabrication, degraded state disclosure, fail-closed, replay integrity, authority chain, no implicit trust, no silent execution, no hidden retry, no autonomous policy mutation, no speculative execution)

### Evidence Infrastructure

- **Proofpack determinism**: SHA-256 digests over deterministically serialized event sequences; tamper detection; no cryptographic signing yet
- **Telemetry as evidence**: worker capability claims with attestation statuses (self_reported, probe_observed, operator_approved, expired, revoked, conflict_detected); telemetry is input to trust assessment, not final authority
- **Intent contract model**: hashed intent contracts with operator authority, delegation scopes, escalation boundaries

### Trust Gates

- **Trust gates remote execution**: before transport, evaluate policy, check approval, validate trust posture, verify command safety, redact auth tokens
- **Worker trust model**: identity → attestation → evaluation → decision cascade; structural attestation (not cryptographic)
- **Approval lineage**: execution plans carry approval records with authorization validation

### Degraded-State Semantics

- **Chaos-tested degradation**: tests mutate evidence to confirm validation rejects tampered replay envelopes, expired leases, stale owners, split-brain lease conflicts, blocked remote execution
- **No hidden fallback**: explicit degraded state triggers replace silent retry patterns
- **Reason code discipline**: every governance outcome carries a canonical reason code

### Operator Truth

- **Operator CLI**: read-only inspection surfaces backed by deterministic fixtures
- **Evidence export**: structured bundles and manifests for external review
- **Review automation**: verification scripts that check proofpack integrity, execution lifecycle contracts, chaos rejection paths, governed routing

## Why Governance and Evidence Are Distinct from Orchestration

Orchestration focuses on getting work done: schedule tasks, route to workers, collect results. Governance and evidence focus on proving the work was done correctly:

| Orchestration concern | Governance concern |
|---|---|
| Did the task execute? | Was execution policy-compliant? |
| Which worker ran it? | Was the worker trust-assessed? |
| What was the output? | Is the output evidence-verified? |
| Did it succeed or fail? | What is the degraded state classification? |
| Can it be retried? | Can the decision be replayed and re-validated? |
| Is it faster on GPU A? | Is GPU A's capability attestation current? |

These are orthogonal concerns. Orchestration without governance is automation theatre. Governance without orchestration is audit without action. This fork builds governance substrate first so orchestration scale (when it comes) inherits contracts instead of inventing trust at runtime.

## Status Classification

| Classification | Meaning |
|---|---|
| **Implemented** | Code, tests, and verification commands exist; works in-process |
| **Opt-in** | Implemented but requires explicit environment flag |
| **Scaffolded** | Type definitions, interfaces, and partial helpers exist; key paths not wired |
| **Partial** | Some functionality exists; major gaps remain |
| **Planned** | Described in ADRs or target-state docs; no code yet |
| **Intentionally not implemented** | Explicitly rejected by design (see ADR 0001) |

## Remaining Work

All items marked scaffolded, partial, or planned require implementation beyond in-process data structures. See [capability-status-matrix.md](../architecture/capability-status-matrix.md) for the full inventory and [gap-radar.md](gap-radar.md) for the unmet needs analysis.

## Not Claimed

This fork does not claim: production readiness, autonomous orchestration, GPU balancing, DynamoDB integration, cryptographic attestation, automatic policy learning, durable distributed queues, daemon workers, or automatic recovery loops.

The implemented review path is: source code, tests, verification commands, and fixture-backed demos.
