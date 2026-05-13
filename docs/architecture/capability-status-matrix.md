<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

Use this table for status. Use the [evidence index](../review/evidence-index.md) for claim-level proof links. Use the [evidence map](../review/evidence-map.md) for detailed implementation/test/doc references.

## Status Definitions

| Status | Meaning |
|---|---|
| **Implemented** | Code, tests, and verification commands exist; works in-process |
| **Opt-in** | Implemented but requires explicit environment flag |
| **Scaffolded** | Type definitions, interfaces, and partial helpers exist; key paths not wired |
| **Partial** | Some functionality exists; major gaps remain |
| **Planned** | Described in ADRs or target-state docs; no code yet |
| **Intentionally not implemented** | Explicitly rejected by design (see ADR 0001) |

## Capability Inventory

| Capability | Status | Primary verification | Limitation | Evidence |
|---|---|---|---|---|
| Governed routing | Implemented | `npm run verify:governed-routing` | Policy evaluation is in-process; no persistent policy storage | `src/lib/control-plane/governance.ts`, `src/lib/control-plane/governance.test.ts` |
| Heterogeneous routing | Opt-in implementation | `npm run verify:governed-routing` | Candidate selection types exist; not integrated with live worker registry | `src/lib/control-plane/heterogeneous-routing.ts` |
| Remote execution | Opt-in guarded boundary | `npm run verify:remote-probes`, `npm run verify:chaos` | No worker fleet; single guarded adapter seam | `src/lib/control-plane/remote-execution.ts` |
| Secure shell / SSH | Not implemented | n/a | SSH transport not wired; only HTTP transport in remote execution | `src/lib/control-plane/remote-execution.ts` (HTTP only) |
| Telemetry | Implemented | `npm run verify:remote-probes` | Pattern-based probe parsing, not protocol-verified | `src/lib/control-plane/worker-probes.ts` |
| Trust/attestation | Structural implementation | `npm run verify:remote-probes` | Structural attestation only; no cryptographic attestation chain | `src/lib/control-plane/worker-trust.ts` |
| Replay | Implemented | `npm run verify:chaos` | Local validation; no distributed consensus | `src/lib/control-plane/replay.ts` |
| Evidence graph | Partial | `npm run verify:proofpack`, `npm run verify:export` | Individual artifacts verifiable; cross-artifact relationship indexing not implemented | `src/lib/control-plane/evidence-types.ts`, `src/lib/control-plane/evidence-graph.ts` |
| Proofpacks | Implemented | `npm run verify:proofpack`, `npm run verify:export` | No hardware-backed signing; no cross-environment verification | `src/lib/control-plane/evidence-export.ts` |
| Operational memory | Scaffolded | `npm test` (types only) | Append-only event log; no persistence or query layer | `src/lib/control-plane/institutional-memory.ts` |
| Intent contracts | Implemented | `npm run verify:execution-lifecycle` | In-process; no persistent intent storage | `src/lib/control-plane/intent-contract.ts` |
| Execution plans | Implemented (in-process) | `npm run verify:execution-lifecycle` | No persistent plan storage or query layer | `src/lib/control-plane/execution-plans.ts` |
| Queue/lease/idempotency | Implemented (in-process) | `npm run verify:execution-lifecycle` | No durable storage; no distributed lease coordination | `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/scheduler/scheduler.ts` |
| Multi-agent governance | Planned | n/a | Single-agent policy evaluation only | `src/lib/control-plane/agent-governance.ts` (single-agent scope) |
| Digital twin simulation | Scaffolded | `npm test` (types only) | Routing simulation partial; policy impact and replay forecast not implemented | `src/lib/control-plane/governance-simulation.ts` |
| Capability economics | Scaffolded | `npm test` (types only) | Cost model types defined; not integrated into decisions | `src/lib/control-plane/capability-economics.ts` |
| Human escalation | Scaffolded | `npm test` (types only) | Escalation types defined; not wired to runtime | `src/lib/control-plane/escalation.ts` |
| Constitutional runtime | Scaffolded | `npm test` (types only) | Invariant types and violation detection exist; not wired to execution paths | `src/lib/control-plane/constitutional-runtime.ts` |
| Dynamo adapter | Scaffolded | `src/lib/dynamo/dynamo-adapter.test.ts` | In-memory store; no DynamoDB connection; disabled by default | `src/lib/dynamo/dynamo-adapter.ts` |
| GPU balancing | Partial | n/a | GPU detection in onboard; no distributed GPU scheduling | `src/lib/onboard.ts`, `src/lib/gpu-scheduling/gpu-scheduler.ts` |
| Autonomous orchestration | Intentionally not implemented | n/a | Explicitly rejected by ADR 0001 | `docs/adr/0001-anti-theatre-governance.md` |
| Policy learning (automatic) | Intentionally not implemented | n/a | Only supervised promotion proposals allowed (ADR 0004) | `src/lib/policy-learning/policy-learning.ts` |
| Changelog hygiene | Implemented | `npm run verify:changelog-hygiene` | Structural format check only, not semantic validation | `scripts/verify-changelog-hygiene.mjs` |
| Operator CLI | Fixture-backed implementation | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` | Not live telemetry; deterministic fixtures | `src/lib/commands/operator.ts`, `fixtures/demo/` |
| Degraded state taxonomy | Implemented | `npm run verify:chaos` | In-process classification; no cross-worker correlation | `src/lib/control-plane/types.ts` |
| Secret redaction | Implemented | `npm run verify:core` | Pattern-based, not full DLP | `src/lib/security/redact.ts` |
| Network policy presets | Implemented | `npm test` | YAML presets for sandbox isolation | `nemoclaw-blueprint/policies/presets/` |
| SSRF validation | Implemented | `npm test` | Network request validation | `nemoclaw/src/blueprint/ssrf.ts` |
| Scheduler | Implemented (disabled by default) | `npm test` | Daemon-safe lease/queue management; requires daemon flag | `src/lib/scheduler/scheduler.ts` |
| Orchestrator | Implemented (disabled by default) | `npm test` (with env flag) | Plans/runs/steps/receipts; requires `NEMOCLAW_ORCHESTRATION=1` | `src/lib/orchestration/orchestrator.ts` |
