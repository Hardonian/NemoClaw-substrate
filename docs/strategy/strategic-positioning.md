<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Strategic Positioning

NemoClaw Substrate is positioned as **deterministic operational governance and evidence infrastructure** for heterogeneous AI execution.

## The Problem: Agency Without Auditability

Most AI agent orchestration frameworks focus on "getting the job done." They prioritize:
- Velocity of implementation.
- Autonomous recovery from failures.
- Simplified "one-click" remote execution.

While these are valuable for development, they introduce significant risks in enterprise and secure environments:
- **Hidden Transitions**: Failing over to a public endpoint when a local one is busy without explicit record.
- **Inscrutable Logs**: Traces that show *what* happened but not *why* it was allowed or *how* it matches policy.
- **Theatre of Control**: Implying security through complexity rather than proving it through evidence.

## The NemoClaw Solution: The Evidence Substrate

NemoClaw shifts the focus from "what can the agent do" to "how can the operator prove what the agent did."

### 1. Governance as Code, Not Logic
Governance is not an afterthought implemented in application-level `if/else` blocks. It is a dedicated **substrate layer** that intercepts all major execution transitions. This allows for:
- **Centralized Policy**: One source of truth for routing and security.
- **Deterministic Validation**: Policy outcomes can be verified independently of the agent logic.

### 2. Evidence as a First-Class Citizen
In NemoClaw, a success result is not the end of the lifecycle. The goal is the creation of a **Proofpack**—a deterministic set of evidence that allows a third party (human or machine) to verify the integrity of the execution.

### 3. Replay-First Engineering
We assume that everything will be audited. Therefore, the system is built for **Deterministic Replay**. If a decision cannot be re-simulated with identical inputs and policy, the system is considered to have "drifted" and enters a failure state.

## Why the Fork?

NemoClaw exists as a fork to maintain this strict **anti-theatre doctrine**. While upstream projects may prioritize "magic" autonomous features, NemoClaw prioritizes:
- **Explicit Degraded States**: Preferring a stopped task over a hidden fallback.
- **Operator Truth**: Ensuring the CLI reflects actual system state, even if it is "messy" or "degraded."
- **Institutional Memory**: Building the infrastructure for recording *every* governed decision for long-term audit.

## Summary of Positioning

| Area | Traditional Orchestration | NemoClaw Substrate |
|------|--------------------------|--------------------|
| **Core Value** | Productivity / Autonomy | Governance / Evidence |
| **User Persona** | Developer / AI Engineer | Operator / Auditor |
| **Key Output** | Completed Task | Proofpack |
| **Trust Model** | Trust the System | Trust the Evidence |
| **Failure Mode** | Auto-Recovery (Theatre) | Explicit Degraded State (Truth) |
