<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Target-State Architecture

This document describes intended architecture for this fork. Status labels:

- **Implemented**
- **Partial**
- **Scaffolded**
- **Planned**
- **Unknown**

## Component status snapshot

| Component | Status | Notes |
|---|---|---|
| Execution plane (existing CLI/plugin/sandbox actions) | Implemented | Present in repo today. |
| Control plane separation | Library-implemented | Contracts exist in `src/lib/control-plane/` but are not wired into the main CLI flow. |
| Canonical request envelope | Scaffolded | Type definitions exist in control-plane modules. |
| Device registry | Library-implemented | In-memory registry in `src/lib/control-plane/device-registry.ts`. |
| Capability snapshots | Library-implemented | Worker capability types in `src/lib/control-plane/worker-trust.ts`. |
| Deterministic scheduler | Library-implemented | Scheduler logic in `src/lib/control-plane/scheduler.ts`, not wired into CLI. |
| Policy engine | Library-implemented | Multi-scope policy engine in `src/lib/control-plane/policy-engine.ts`. |
| Approval gates | Library-implemented | Approval workflow types in `src/lib/control-plane/execution-plans.ts`. |
| Execution receipts | Library-implemented | Receipt generation in `src/lib/control-plane/execution-lifecycle.ts`. |
| Degraded-state taxonomy | Library-implemented | Types in `src/lib/control-plane/types.ts`, surfaced in local diagnostics. |
| Operational memory | Library-implemented | Event log in `src/lib/control-plane/operational-memory.ts`. |
| Supervised policy promotion | Library-implemented | Policy promotion logic in `src/lib/control-plane/policy-promotion.ts`. |
| Observability | Library-implemented | Summary functions in `src/lib/control-plane/observability.ts`. |
| Replayability/audit history | Library-implemented | Replay envelopes in `src/lib/control-plane/replay.ts`. |
| Dynamo-style orchestration adapter seam | Planned | Adapter seam is a design target only. |

## Execution plane vs control plane

- **Execution plane (current + future):** performs sandbox/tool/model actions.
- **Control plane (target):** computes deterministic decisions before execution: eligibility, policy checks, approval requirements, routing, and receipt emission.

## Canonical request envelope

Target: define a stable request envelope for control decisions, including operator intent, workload constraints, policy context, device constraints, and trace identifiers.

## Device registry and capability snapshots

Target: maintain explicit local inventory of devices and runtimes with capability snapshot metadata (accelerator type, memory class, availability, and policy eligibility tags).

## Deterministic scheduler

Target: deterministic candidate evaluation using request envelope + registry + policy. Tie-breaking must be stable and explainable.

## Policy engine and approval gates

Target: inspectable policy rules in code/config, evaluated as explicit control-plane step. Promotion workflow should be supervised, versioned, and reversible.

## Execution receipts and degraded-state taxonomy

Target: every material decision emits an execution receipt with chosen path, rejected candidates, policy outcomes, and degraded-state reason codes when applicable.

## Operational memory and supervised policy promotion

Target: operator decisions are captured as memory artifacts for review and potential policy updates. Memory informs recommendations but must not silently mutate active policy.

## Observability, replayability, and audit history

Target: consolidate structured events/receipts to support operator-facing observability and deterministic replay/audit workflows.

## Hardening and failure-mode discipline

Target: fail-closed for sensitive decisions, explicit degraded-state outputs for non-sensitive partial failures, and no hidden degraded states.

## Future Dynamo-style GPU/device orchestration adapter seam

Target: keep orchestration integration behind adapter interfaces so local contracts remain stable before optional external scheduler/orchestrator integration.
