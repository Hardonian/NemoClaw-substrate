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
| Control plane separation | Planned | Explicit control-plane contracts are not yet present. |
| Canonical request envelope | Planned | Contract/type not yet implemented. |
| Device registry | Planned | No dedicated registry for heterogeneous device capability snapshots yet. |
| Capability snapshots | Planned | No unified snapshot schema yet. |
| Deterministic scheduler | Planned | No standalone deterministic scheduler module yet. |
| Policy engine | Partial | Policy presets and schemas exist, but no dedicated decision-time policy engine with approval workflow. |
| Approval gates | Planned | No explicit gate framework for policy promotion or routing approvals yet. |
| Execution receipts | Planned | No cross-cutting receipt contract currently emitted for control decisions. |
| Degraded-state taxonomy | Partial | Local degraded reporting exists in specific commands, but no shared taxonomy. |
| Operational memory | Planned | No explicit append-only operator decision memory module yet. |
| Supervised policy promotion | Planned | Not implemented yet as formal workflow. |
| Observability | Partial | Diagnostics/log surfaces exist; no unified control-plane observability model yet. |
| Replayability/audit history | Partial | Some audit/state artifacts exist; no end-to-end replayable control history contract yet. |
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
