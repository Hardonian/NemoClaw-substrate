<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Roadmap

This page tracks the governed substrate implementation status, dependency ordering, and phased workstreams.

## Status Definitions

| Label | Meaning |
|---|---|
| **Implemented** | Code exists, tested, and wired into a user-facing or operator-facing path. |
| **Library-implemented** | Code exists and is tested but not yet wired into the main CLI flow. Available for integration. |
| **Scaffolded** | Types, interfaces, or stub adapters exist; behavior is not yet implemented. |
| **Planned** | Design is documented (ADR, target-state); no code yet. |
| **Intentionally-not-implemented** | Deliberately excluded; see [Non-Goals](non-goals.md). |

## Phase 1 — Local Operator CLI (Implemented)

| Capability | Status | Notes |
|---|---|---|
| CLI sandbox lifecycle | Implemented | `nemoclaw` commands for sandbox create/start/stop/destroy. |
| Onboarding wizard | Implemented | Interactive provider/model selection in `src/lib/onboard.ts`. |
| Inference provider integration | Implemented | NVIDIA NIM, local Ollama, vLLM, NIM-local profiles. |
| Network policy presets | Implemented | 12 presets in `nemoclaw-blueprint/policies/presets/`. |
| Plugin runtime context | Implemented | OpenClaw plugin injects `<nemoclaw-runtime>` context. |
| Secret scanning | Implemented | Pre-write secret pattern scanner in plugin. |
| SSRF validation | Implemented | DNS pinning and private network blocklist. |
| Shield audit logging | Implemented | Append-only JSONL audit trail. |

## Phase 2 — Control-Plane Contracts (Library-Implemented)

| Capability | Status | Notes |
|---|---|---|
| Policy engine | Library-implemented | `src/lib/control-plane/policy-engine.ts` with multi-scope inheritance. Not wired into CLI routing. |
| Execution lifecycle | Library-implemented | `src/lib/control-plane/execution-lifecycle.ts` with queue, lease, state transitions. Not wired into CLI execution paths. |
| Execution plans | Library-implemented | `src/lib/control-plane/execution-plans.ts` with intent hashing and approval workflows. |
| Replay envelopes | Library-implemented | `src/lib/control-plane/replay.ts` with SHA-256 digests and lineage validation. |
| Worker trust | Library-implemented | `src/lib/control-plane/worker-trust.ts` with attestation records. |
| Device registry | Library-implemented | `src/lib/control-plane/device-registry.ts` in-memory registry. |
| Operational memory | Library-implemented | `src/lib/control-plane/operational-memory.ts` event log. |
| Governed provider routing | Library-implemented | Behind `NEMOCLAW_GOVERNED_ROUTING=1` flag. |
| Heterogeneous routing | Library-implemented | Behind `NEMOCLAW_HETEROGENEOUS_ROUTING=1` flag. |
| Remote execution adapter | Library-implemented | Behind `NEMOCLAW_REMOTE_EXECUTION=1` flag. |
| Local runtime probes | Library-implemented | Deterministic probe execution with degraded-state surfacing. |
| Telemetry adapters | Library-implemented | Local GPU telemetry (`nvidia-smi`) with explicit unavailable/stale states. |
| Telemetry registry | Library-implemented | Registry persistence with provenance tracking. |
| Diagnostics summary | Library-implemented | Probe/degraded state, registry summary, telemetry availability. |
| Security policy guards | Library-implemented | Transport blocking, secret redaction, proofpack/export preflight. |

## Phase 3 — Operator Tooling (Partial)

| Capability | Status | Notes |
|---|---|---|
| Configuration profiles | Implemented | Operator CLI profiles for demo/benchmark/production. |
| Diagnostic explainers | Partial | Operator-facing explanations for degraded states. |
| Replay verification | Scaffolded | `scripts/verify-replay.ts` exists but requires trace fixtures to activate. |
| Proof-pack verification | Scaffolded | `scripts/verify-proofpack.ts` exists but requires proof fixtures to activate. |
| Benchmark fixtures | Library-implemented | Stress fixture generators exist for testing control-plane contracts. |

## Phase 4 — Integration and Wiring (Planned)

| Capability | Status | Notes |
|---|---|---|
| CLI integration of control-plane | Planned | Wire policy engine, execution lifecycle, and routing into main CLI flow. |
| Persistent storage adapter | Planned | Replace in-memory stores with file-based or external persistence. |
| External orchestration adapter | Planned | Dynamo-style integration behind adapter interfaces. |
| Formal attestation provider | Planned | Cryptographic attestation chain for worker trust. |
| Richer approval workflows | Planned | Multi-operator approval, time-bound authorizations. |

## Intentionally Not Implemented

| Capability | Rationale |
|---|---|
| Autonomous orchestration loops | Violates operator-grade governance. See [Non-Goals](non-goals.md). |
| Hidden retries / daemon recovery | Degrades operator visibility. Failures must be explicit. |
| Policy learning from prompts | Violates ADR-0007 (Declarative-Only Policy). |
| Distributed execution fabric | Out of scope for local operator focus. |
| GPU balancing | Planned for Phase 4+ with governance-defined scope. |
| Automatic remote execution enablement | Must remain operator-invoked. |

## Dependency Ordering

1. Phase 1 must be stable before Phase 2 wiring.
2. Phase 2 library contracts must have test coverage before Phase 3 tooling.
3. Phase 3 verification tools must pass before Phase 4 external integration.
4. External orchestration (Phase 4) requires stable local contracts (Phase 2) first.
