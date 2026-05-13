<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw vs. OpenClaw

This document clarifies the relationship between the upstream OpenClaw-style assistant systems and the NemoClaw substrate fork.

## The Core Distinction

| Feature | OpenClaw-style Baseline | NemoClaw Substrate |
|---------|-------------------------|--------------------|
| **Primary Goal** | Task completion & agency | Governed execution & evidence |
| **Trust Model** | Implicit / API-Key based | Explicit / Attestation-aware |
| **Success Metric** | Success rate | Auditability & Determinism |
| **Failure Handling** | Retries / Fallbacks | Degraded States / Reason Codes |
| **Evidence** | Logs / Trace | Proofpacks / Replay-ready |

## What OpenClaw Solves

OpenClaw-style systems are designed for high-performance agentic workflows. They focus on:
- **Task Planning**: Breaking down user requests into actionable steps.
- **Tool Execution**: Interacting with environments (sandboxes, APIs, filesystems).
- **Inference Integration**: Efficiently querying Large Language Models.
- **State Management**: Maintaining conversation and task context.

## What NemoClaw Adds

NemoClaw is an **operational governance substrate**. It sits beneath or around the agent execution to ensure that every action is auditable, governed, and verifiable.

### 1. Governed Routing
Instead of simple API calls, NemoClaw routes execution through governed boundaries. Every routing decision is backed by:
- **Explicit Policy**: No hidden rules.
- **Reason Codes**: Every outcome (success or rejection) is classified.

### 2. Evidence and Proofpacks
NemoClaw treats logs as insufficient for high-stakes governance. It implements:
- **Deterministic Replay**: Ability to verify that the same inputs and policy would produce the same routing outcome.
- **Proofpacks**: Cryptographically linkable (scaffolded) export bundles containing intent, evidence, and results.

### 3. Explicit Degraded States
In a governed system, "failing over" to a less-secure or less-observable mode is a security risk. NemoClaw:
- **Rejects Hidden Fallbacks**: If a preferred execution path is unavailable, the system enters an explicit **Degraded State**.
- **Operator Truth**: Surfaces these states to the operator rather than attempting to mask them with autonomous recovery.

## Strategic Positioning

NemoClaw is not a competitor to OpenClaw; it is the **hardened foundation** upon which OpenClaw can be deployed in institutional environments that require high levels of trust and auditability.

It is specifically **not** "remote execution + SSH". It is a system for ensuring that remote execution (when opt-in) is as governed and evidence-backed as local execution.

## Status and Evidence

| Capability | OpenClaw-style baseline | NemoClaw fork | Status | Evidence link |
|---|---|---|---|---|
| **Lifecycle Tracking** | Standard logging | Governed lifecycle records | Implemented | [Execution Lifecycle](../architecture/execution-lifecycle-substrate.md) |
| **Policy Enforcement** | Application logic | Explicit policy engine | Implemented | [Policy Engine](../architecture/policy-engine.md) |
| **Replay Validation** | N/A | Deterministic drift rejection | Implemented | [Replayability](../architecture/replayability.md) |
| **Secret Redaction** | Basic regex (if any) | Pattern-based doctrine | Implemented | [Secret Redaction](../architecture/secret-redaction-doctrine.md) |
| **Remote Execution** | Plugin-based | Governed adapter | Opt-in | [Remote Execution](../architecture/remote-execution-adapters.md) |
| **Distributed Scaling** | N/A | Scaffolded substrate | Planned | [Roadmap](../roadmap.md) |
| **Autonomous Recovery** | Implicit | Explicitly rejected | Not implemented | [Anti-Theatre](../architecture/anti-theatre-doctrine.md) |
