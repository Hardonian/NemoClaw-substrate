<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architecture Guide

This guide describes the architecture of the NemoClaw governed execution substrate.

## Core Governance & Trust

- **[Governance Invariants](governance-invariants.md):** The non-negotiable rules of the substrate.
- **[Governance Map](governance-map.md):** Policy and decision flow.
- **[Trust Boundaries](security-boundaries.md):** Where we draw the line between high-trust and untrusted code.
- **[Operator Truth Model](operator-truth-model.md):** How trust is established and maintained.
- **[Anti-Theatre Doctrine](anti-theatre-doctrine.md):** Our core philosophy on AI autonomy.

## Execution Substrate

- **[Execution Lifecycle](execution-lifecycle-substrate.md):** The state-machine for governed execution.
- **[Governed Routing](heterogeneous-routing.md):** Local vs Remote provider dispatch.
- **[Control Plane](control-plane.md):** Routing, dispatch, and policy engine.
- **[Capability Matrix](capability-status-matrix.md):** Authoritative list of implemented vs planned features.
- **[Replayability](replayability.md):** Deterministic replay of execution events.

## Security & Safety

- **[Security Threat Model](security-threat-model.md):** Our assessment of risks and mitigations.
- **[Command Execution Safety](command-execution-safety.md):** How we govern tool execution.
- **[Secret Redaction Doctrine](secret-redaction-doctrine.md):** How we prevent credential leakage.
- **[Security Policy Model](security-policy-model.md):** Detailed policy evaluation logic.
- **[Local Stack Security Profiles](local-stack-security-profiles.md):** Pre-configured hardening profiles.

## Subsystems & Integration

- **[Device Registry](device-registry.md):** Capability discovery and inventory.
- **[Scheduler](scheduler.md):** Deterministic device selection.
- **[Observability](observability.md):** Telemetry and tracing.
- **[Evidence Topology](evidence-topology.md):** Telemetry and proofpack structure.
- **[Failure Semantics](failure-semantics.md):** How the system behaves under component failure.
- **[Diagnostics](diagnostics.md):** Troubleshooting substrate failures.

## Reference

- **[Architecture Cartography](architecture-cartography.md):** Visual topology and file mappings.
- **[Governance Glossary](governance-glossary.md):** Canonical definitions of governance terms.
- **[Canonical Terminology](canonical-terminology-index.md):** Ensuring consistent language across the substrate.
- **[Cross-Reference Index](architecture-cross-reference-index.md):** Mapping requirements to implementation.
