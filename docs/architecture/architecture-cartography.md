<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architecture Cartography

This document provides a definitive mapping of logical functional blocks to physical source files within the NemoClaw governed execution substrate.

## 1. Control Plane Subsystem (`src/lib/control-plane/`)

The Control Plane is the deterministic heart of the substrate, responsible for routing, policy enforcement, and verification.

### 1.1 Lifecycle & Execution Contracts

Defines the core state machines and data structures for execution.

| Component | Responsibility | Source File |
|-----------|----------------|-------------|
| **Execution Lifecycle** | State transitions (Plan -> Queue -> Lease) | [execution-lifecycle.ts](../../src/lib/control-plane/execution-lifecycle.ts) |
| **Execution Plans** | Blueprint-to-Plan compilation and validation | [execution-plans.ts](../../src/lib/control-plane/execution-plans.ts) |
| **Contract Types** | Canonical types for nodes, Worker capabilities, and Receipts | [types.ts](../../src/lib/control-plane/types.ts) |
| **Serialization** | Deterministic serialization (canonical JSON) | [serde.ts](../../src/lib/control-plane/serde.ts) |

### 1.2 Governance & Policy Engine

Ensures all execution follows explicit, auditable rules.

| Component | Responsibility | Source File |
|-----------|----------------|-------------|
| **Policy Primitives** | Base types for Effects, Reasons, and Evaluation | [governance.ts](../../src/lib/control-plane/governance.ts) |
| **Policy Engine** | Multi-scope evaluation, inheritance, and tracing | [policy-engine.ts](../../src/lib/control-plane/policy-engine.ts) |
| **Policy Promotion** | Workflow for elevating local rules to environment/global | [policy-promotion.ts](../../src/lib/control-plane/policy-promotion.ts) |
| **Redaction Validation**| Validating secret-redaction coverage | [redaction-validation.ts](../../src/lib/control-plane/redaction-validation.ts) |

### 1.3 Routing & Dispatch

Maps abstract execution requests to physical workers and providers.

| Component | Responsibility | Source File |
|-----------|----------------|-------------|
| **Runtime Dispatch** | Root entrypoint for command-to-runtime mapping | [runtime-dispatch-integration.ts](../../src/lib/control-plane/runtime-dispatch-integration.ts) |
| **Provider Routing** | Selecting the correct provider (Ollama, NIM, etc.) | [governed-provider-routing.ts](../../src/lib/control-plane/governed-provider-routing.ts) |
| **Heterogeneous Routing**| Routing across mixed local/remote/simulated nodes | [heterogeneous-routing.ts](../../src/lib/control-plane/heterogeneous-routing.ts) |
| **Runtime Seams** | Abstraction layer between host and sandbox | [runtime-seams.ts](../../src/lib/control-plane/runtime-seams.ts) |
| **Scheduler** | Deterministic task ordering | [scheduler.ts](../../src/lib/control-plane/scheduler.ts) |

### 1.4 Probes & Worker Trust

Inventorying and validating worker capabilities.

| Component | Responsibility | Source File |
|-----------|----------------|-------------|
| **Worker Probes** | Probing worker health and capabilities | [worker-probes.ts](../../src/lib/control-plane/worker-probes.ts) |
| **Worker Trust** | Evidence-based trust scoring and attestation | [worker-trust.ts](../../src/lib/control-plane/worker-trust.ts) |
| **Device Registry** | Canonical inventory of known execution nodes | [device-registry.ts](../../src/lib/control-plane/device-registry.ts) |
| **Local Probes** | Probing the local Docker/GPU environment | [local-runtime-probes.ts](../../src/lib/control-plane/local-runtime-probes.ts) |
| **Remote Probes** | Probing remote/cloud execution endpoints | [remote-runtime-probes.ts](../../src/lib/control-plane/remote-runtime-probes.ts) |

### 1.5 Observability & Proofpacks

Capturing evidence and ensuring auditability.

| Component | Responsibility | Source File |
|-----------|----------------|-------------|
| **Evidence Export** | Packaging receipts and telemetry into Proofpacks | [evidence-export.ts](../../src/lib/control-plane/evidence-export.ts) |
| **Evidence Formats** | Schema definitions for auditable evidence | [evidence-formats.ts](../../src/lib/control-plane/evidence-formats.ts) |
| **Replay Stream** | Log-structured capture of execution events | [replay.ts](../../src/lib/control-plane/replay.ts) |
| **Operational Memory** | Transient state for active execution contexts | [operational-memory.ts](../../src/lib/control-plane/operational-memory.ts) |
| **Integrity Checks** | Hash-based verification of evidence bundles | [fixture-integrity.ts](../../src/lib/control-plane/fixture-integrity.ts) |

## 2. Core Library Subsystems (`src/lib/`)

| Subsystem | Responsibility | Entrypoint / Key Files |
|-----------|----------------|------------------------|
| **Runner** | Low-level process execution (spawnSync) | [runner.ts](../../src/lib/runner.ts) |
| **Onboard** | Initial sandbox configuration and validation | [onboard.ts](../../src/lib/onboard.ts) |
| **Security** | Secret scanning and boundary enforcement | [security/](../../src/lib/security/) |
| **State** | Persistence and migration logic | [state/](../../src/lib/state/) |
| **Config** | Substrate-wide configuration schemas | [config/](../../src/lib/config/) |
