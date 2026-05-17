<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw vs OpenClaw-Style Baseline

This document clarifies what problem this fork actually addresses, how it differs from the upstream baseline, and what remains incomplete.

## Problem Space

OpenClaw-style systems solve: how to run always-on AI assistants inside sandboxed environments with local inference, provider routing, and plugin extensions. The baseline focus is sandbox orchestration, workspace management, and inference provider integration.

NemoClaw substrate addresses a different problem: **when a sandboxed AI agent makes execution decisions, how can an operator verify that what happened matches what was requested, what policy allowed, and what evidence supports it?**

## Core Difference

OpenClaw-style systems assume: if the sandbox runs the command and returns output, the job is done.

NemoClaw fork assumes: sandbox execution is insufficient evidence. A reviewer needs to confirm intent, policy evaluation, degraded states, trust posture, and replay integrity before accepting the result as authoritative.

## Capability Comparison

| Capability | OpenClaw-style baseline | NemoClaw fork | Status | Evidence link |
|---|---|---|---|---|
| Sandbox lifecycle | Implemented | Implemented (retained) | Implemented | `src/lib/sandbox/`, `nemoclaw/` |
| Local inference routing | Implemented | Implemented (retained) | Implemented | `src/lib/inference/` |
| Plugin system | Implemented | Implemented (retained) | Implemented | `nemoclaw-blueprint/openclaw-plugins/` |
| Network policy presets | Limited | Implemented | Implemented | `nemoclaw-blueprint/policies/presets/` |
| Execution lifecycle records | Not present | Typed records: plans, queue, lease, receipt, proofpack | Implemented | `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/control-plane/execution-lifecycle.test.ts` |
| Replay fail-closed validation | Not present | Deterministic digest + lineage + reason code validation | Implemented | `src/lib/control-plane/replay.ts`, `src/lib/control-plane/degraded-state-chaos.test.ts` |
| Telemetry as evidence (not authority) | Not present | Probe-based capability claims with attestation statuses | Implemented | `src/lib/control-plane/worker-trust.ts`, `src/lib/control-plane/worker-probes.ts` |
| Remote execution opt-in boundary | Not present | Policy + approval + trust + transport gates; disabled by default | Opt-in implementation | `src/lib/control-plane/remote-execution.ts`, `src/lib/control-plane/remote-execution.test.ts` |
| Degraded state taxonomy | Not present | Explicit categories: healthy, constrained, degraded, unavailable, partial_capability, stale, unreachable, unknown | Implemented | `src/lib/control-plane/types.ts`, `src/lib/control-plane/degraded-state-chaos.test.ts` |
| No hidden fallback | Not present | Chaos tests verify hidden retry detection and blocked degraded paths | Implemented | `src/lib/control-plane/degraded-state-chaos.test.ts` |
| Operator CLI read-by-default | Not present | Fixture-backed inspection; no mutation commands | Fixture-backed implementation | `src/lib/commands/operator.ts`, `test/operator/operator.test.ts` |
| Governed provider routing | Not present | Flag-gated; preserves default local behavior | Opt-in implementation | `src/lib/control-plane/governed-provider-routing.ts`, `src/lib/control-plane/governed-provider-routing.test.ts` |
| Intent contract model | Not present | Hashed intent contracts with authority, delegation, escalation boundaries | Implemented | `src/lib/control-plane/intent-contract.ts` |
| Execution plans with approval | Not present | Typed plans with approval, authorization, trust/intent/policy snapshots | Implemented | `src/lib/control-plane/execution-plans.ts`, `src/lib/control-plane/execution-plans.test.ts` |
| Queue/lease/idempotency semantics | Not present | Lease acquire/renew/release/expire with ownership validation | Implemented (in-process) | `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/scheduler/scheduler.ts` |
| Evidence export / proofpacks | Not present | Deterministic serialization, SHA-256 digests, tamper rejection | Implemented | `src/lib/control-plane/evidence-export.ts`, `src/lib/control-plane/evidence-export.test.ts` |
| Policy evaluation engine | Not present | Rule-based evaluation with scope precedence, reason codes | Implemented | `src/lib/control-plane/governance.ts`, `src/lib/control-plane/governance.test.ts` |
| Constitutional runtime invariants | Not present | Invariant rule definitions with violation detection and enforcement | Scaffolded | `src/lib/control-plane/constitutional-runtime.ts` |
| Institutional operational memory | Not present | Event log with governance incident tracking and exception clustering | Scaffolded | `src/lib/control-plane/institutional-memory.ts` |
| Escalation infrastructure | Not present | Escalation bundles, operator takeover envelopes, adjudication queues | Scaffolded | `src/lib/control-plane/escalation.ts` |
| Governance simulation | Not present | Routing, policy impact, replay forecast simulations | Scaffolded | `src/lib/control-plane/governance-simulation.ts` |
| Capability economics | Not present | Trust cost, execution cost, evidence burden modeling | Scaffolded | `src/lib/control-plane/capability-economics.ts` |
| Dynamo adapter | Not present | In-memory store with type definitions, disabled by default | Scaffolded | `src/lib/dynamo/dynamo-adapter.ts`, `src/lib/dynamo/dynamo-adapter.test.ts` |
| GPU balancing | Not present | GPU detection in onboard, no distributed scheduling | Partial | `src/lib/onboard.ts`, `src/lib/gpu-scheduling/` |
| Distributed execution | Not present | Orchestrator with plans, steps, receipts | Disabled by default (env flag) | `src/lib/orchestration/orchestrator.ts`, `src/lib/orchestration/types.ts` |
| Autonomous orchestration | Not present | Intentionally not implemented | Intentionally not implemented | `docs/adr/0001-anti-theatre-governance.md` |
| Automatic policy learning | Not present | Supervised promotion proposals only | Partial | `src/lib/policy-learning/policy-learning.ts` |
| Cryptographic attestation | Not present | Structural attestation only | Partial | `src/lib/control-plane/worker-trust.ts` |
| Durable storage | Not present | In-process data structures only | Not implemented | — |
| Secure cluster / distributed trust | Not present | Single-sandbox with bounded remote adapters | Not implemented | — |

## Why This Is Not "OpenClaw + Remote Execution"

Adding remote execution without replay, evidence, and degraded-state semantics creates systems where operators cannot distinguish between:

1. What the agent intended to do
2. What policy actually permitted
3. What the remote worker claimed happened
4. What evidence supports that claim

NemoClaw fork inserts explicit contracts between those four layers. Remote execution is gated by trust assessment, approval state, and policy evaluation. Results are not accepted as authority; they become evidence subject to replay validation. Degraded states are surfaced explicitly rather than masked by silent retries.

## What Remains Planned

All items in the comparison table marked "Scaffolded" or "Partial" require implementation work beyond type definitions and in-process data structures. Specifically:

- **Constitutional runtime invariants**: types defined, violation detection functions exist, enforcement hooks not wired to execution paths
- **Institutional operational memory**: event log types and incident tracking defined, persistence and query layer not implemented
- **Escalation infrastructure**: bundle and envelope types defined, operator takeover flows not connected to runtime
- **Governance simulation**: simulation types and routing simulations exist, policy impact and replay forecast simulations incomplete
- **Capability economics**: cost model types defined, not integrated into routing or execution decisions
- **Dynamo adapter**: in-memory store with CRUD, no DynamoDB connection, disabled by default
- **GPU balancing**: GPU detection exists in onboard, distributed GPU scheduling not implemented
- **Distributed execution**: orchestrator types exist, requires `NEMOCLAW_ORCHESTRATION=1` to enable, not production-ready
- **Cryptographic attestation**: structural attestation with status enum, no hardware trust root or signing

## What Is Deliberately Not Claimed

This repository explicitly rejects claims of:

- Production readiness
- Autonomous orchestration or self-healing
- GPU load balancing across distributed workers
- DynamoDB integration for production use
- Cryptographic attestation chains
- Automatic policy learning without operator review
- Durable distributed queues
- Daemon workers running in the background
- Automatic recovery loops

See [docs/adr/0001-anti-theatre-governance.md](../../docs/adr/0001-anti-theatre-governance.md) and [docs/known-limitations.md](../../docs/known-limitations.md) for the rationale.
