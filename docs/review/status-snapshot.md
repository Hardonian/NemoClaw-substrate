<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Status Snapshot

This is a point-in-time classification of all major NemoClaw fork capabilities. Use this as a quick reference for reviewers. For detailed evidence links, see [evidence-map.md](../review/evidence-map.md). For gap analysis, see [gap-radar.md](../strategy/gap-radar.md).

Snapshot date: 2026-05-12

## Implemented (Tested and Verified)

| Capability | Verification | Risk Note |
|---|---|---|
| Governed routing | `npm run verify:governed-routing` | In-process policy evaluation only |
| Replay fail-closed | `npm run verify:chaos` | Local validation, not distributed consensus |
| Proofpack determinism | `npm run verify:proofpack` | No cryptographic signing |
| Evidence export | `npm run verify:export` | JSON/NDJSON only, no compression |
| Execution lifecycle records | `npm run verify:execution-lifecycle` | In-process data structures |
| Queue/lease/idempotency | `npm run verify:execution-lifecycle` | No durable storage |
| Intent contracts | `npm run verify:execution-lifecycle` | No persistent intent storage |
| Execution plans | `npm run verify:execution-lifecycle` | No persistent plan query |
| Trust assessment | `npm run verify:remote-probes` | Structural attestation only |
| Telemetry as evidence | `npm run verify:remote-probes` | Pattern-based probe parsing |
| Degraded state taxonomy | `npm run verify:chaos` | In-process classification |
| Secret redaction | `npm run verify:core` | Pattern-based, not full DLP |
| Operator CLI (read-only) | `node ./bin/nemoclaw.js operator status --json` | Fixture-backed |
| Changelog hygiene | `npm run verify:changelog-hygiene` | Structural format check only |
| SSRF validation | `npm test` | Network request validation |
| Network policy presets | `npm test` | Sandbox isolation |

## Opt-In (Requires Explicit Flag)

| Capability | Flag | Verification | Risk Note |
|---|---|---|---|
| Remote execution | `NEMOCLAW_REMOTE_EXECUTION=1` | `npm run verify:remote-probes` | No worker fleet, no mTLS |
| Heterogeneous routing | Env flag | `npm run verify:governed-routing` | Not a distributed scheduler |
| Scheduler | Daemon flag | `npm test` | Disabled by default |
| Orchestrator | `NEMOCLAW_ORCHESTRATION=1` | `npm test` (with flag) | Not production-ready |

## Scaffolded (Types Exist, Not Wired)

| Capability | Implementation File | Missing Work | Reviewer Risk |
|---|---|---|---|
| Constitutional runtime invariants | `constitutional-runtime.ts` | Not wired to execution paths | HIGH — invariants are the anti-theatre foundation |
| Institutional operational memory | `institutional-memory.ts` | No persistence or query layer | HIGH — no crash recovery or history |
| Human escalation infrastructure | `escalation.ts` | Not connected to runtime | MEDIUM — fail-closed works but escalation is manual |
| Governance simulation | `governance-simulation.ts` | Policy impact/replay forecast incomplete | MEDIUM — policy changes lack impact assessment |
| Capability economics | `capability-economics.ts` | Not integrated into decisions | LOW for current use |
| Dynamo adapter | `dynamo-adapter.ts` | No DynamoDB connection | LOW — explicitly deferred |

## Partial (Some Functionality, Gaps Remain)

| Capability | What Exists | What's Missing | Reviewer Risk |
|---|---|---|---|
| Evidence graph | Artifact types, bundles, manifests, verification | Cross-artifact relationship indexing, query layer | MEDIUM |
| GPU balancing | GPU detection in onboard | Distributed GPU scheduling | LOW — not claimed |
| Policy learning | Supervised promotion proposals | Not automatic (by design) | LOW — ADR 0004 |

## Intentionally Not Implemented

| Capability | Rationale | ADR |
|---|---|---|
| Autonomous orchestration | Anti-theatre doctrine rejects hidden autonomy | ADR 0001 |
| Automatic policy learning | Policy changes require operator review | ADR 0004 |
| Self-healing | Degraded states must be explicit | ADR 0001 |

## Planned (No Code Yet)

| Capability | Description | Prerequisite Phase |
|---|---|---|
| Multi-agent governance | Cross-agent policy scoping and conflict detection | Phase 10 |
| Distributed execution | Worker fleet with Dynamo coordination | Phase 11 |
| Cryptographic attestation | Hardware-backed worker trust chain | Phase 2 |
| mTLS transport | Encrypted remote execution transport | Phase 2 |

## Risk Summary

| Risk Level | Count | Primary Concerns |
|---|---|---|
| HIGH | 2 | Constitutional invariant enforcement, institutional memory persistence |
| MEDIUM | 4 | Escalation runtime integration, governance simulation, evidence graph query, operator CLI live telemetry |
| LOW | 6 | Capability economics, Dynamo adapter, GPU balancing, policy learning, multi-agent governance, distributed execution |
