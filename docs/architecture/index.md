<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architecture Guide

This guide describes the architecture of the NemoClaw governed execution substrate.

## Core Concepts

- **[Governance Invariants](governance-invariants.md):** The non-negotiable rules of the substrate.
- **[Trust Model](operator-truth-model.md):** How trust is established and maintained.
- **[Execution Lifecycle](execution-lifecycle-substrate.md):** The phases of a governed execution.
- **[Capability Matrix](capability-status-matrix.md):** Authoritative list of implemented vs planned features.

## Subsystems

- **[Control Plane](control-plane.md):** Routing, dispatch, and policy engine.
- **[Execution Plane](execution-lifecycle-substrate.md):** Sandboxing and lifecycle management.
- **[Observability](observability.md):** Telemetry and tracing.
- **[Security](security-policy-model.md):** Redaction, boundaries, and safety.

## Topology Maps

- **[System Topology](system-topology.md):** High-level component map.
- **[Governance Map](governance-map.md):** Policy and decision flow.
- **[Evidence Topology](evidence-topology.md):** Telemetry and proofpack structure.

## Technical Details

- **[Governed Routing](heterogeneous-routing.md):** Local vs Remote execution logic.
- **[Replayability](replayability.md):** Deterministic replay of execution events.
- **[Secret Redaction](secret-redaction-doctrine.md):** How we protect sensitive data.
- **[Failure Semantics](failure-semantics.md):** How the system behaves when components fail.
