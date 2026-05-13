<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Strategic Gap Radar

This document identifies the unmet needs and architectural gaps that justify the NemoClaw substrate evolution. It serves as a radar for reviewers and contributors to understand where implementation effort is still required.

## Gap Analysis Map

| Need | Problem | Why it Matters | Status | Reviewer Risk |
|---|---|---|---|---|
| **Intent Contracts** | Raw prompts lack structured "intent" metadata for policy mapping. | Cannot prove that execution matched user intent. | Planned | High: Semantic drift in interpretation. |
| **Evidence Graph** | Evidence is currently linear; lacks relationship mapping between sub-tasks. | Difficult to trace the lineage of complex multi-agent decisions. | Planned | Medium: Fragmented audit trail. |
| **Institutional Memory** | No long-term storage for governance decisions across sessions. | Cannot identify patterns of policy violation or drift over time. | Partial | High: "Amnesia" in security posture. |
| **Capability Economics** | No model for the cost/value trade-off in routing decisions. | Inefficient resource allocation across heterogeneous workers. | Planned | Low: Purely operational efficiency. |
| **Human Escalation** | No formal substrate for pausing execution for human approval. | "All or nothing" agency is dangerous in high-stakes tasks. | Scaffolded | High: Unchecked autonomous harm. |
| **Constitutional Invariants** | Policy is reactive; lacks hard-coded "constitutional" safety limits. | Complex policies can be bypassed by edge cases. | Partial | Critical: Safety bypass. |
| **Proofpack Integrity** | Proofpacks are exported as plain files without hardware-backed signatures. | Evidence can be tampered with after the fact. | Partial | High: Evidence spoofing. |
| **Queue/Lease Substrate** | Durable persistence for execution queues is not yet implemented. | Crash recovery results in loss of state and evidence. | Planned | Medium: State inconsistency. |
| **Secure Transport** | Some local probes may still rely on unencrypted inter-process communication. | Credential leaks or command injection in the control plane. | Implemented | High: Intercepted secrets. |

## Detailed Gap Descriptions

### 1. Intent Contracts
**Problem**: Current execution starts with a string prompt. The "intent" is inferred by the agent logic rather than being an explicit contract.
**Missing Work**: Define a JSON schema for "Intent Contracts" that must be signed (scaffolded) or acknowledged before routing occurs.
**Follow-up Owner**: **Opus**

### 2. Evidence Graph
**Problem**: Evidence is collected as a flat list of events.
**Missing Work**: Implement a graph-based structure in the Proofpack that maps parent tasks to child sub-tasks and their respective evidence.
**Follow-up Owner**: **Gemini**

### 3. Institutional Operational Memory
**Problem**: The substrate "forgets" governance decisions once the session ends.
**Missing Work**: Implement a persistent governance ledger that records every Reason Code outcome.
**Follow-up Owner**: **Codex**

### 4. Digital-Twin Governance Simulation
**Problem**: Testing policy changes requires live execution (even if local).
**Missing Work**: A simulator that uses historical Proofpacks to "test-run" new policies against old intents to detect regressions.
**Follow-up Owner**: **Opus**

### 5. Constitutional Runtime Invariants
**Problem**: We rely on the Policy Engine to catch errors.
**Missing Work**: Hard-coded, non-configurable safety checks that run at the substrate level regardless of policy (e.g., "no writing to /etc/shadow").
**Follow-up Owner**: **Kilo**

### 6. Capability Economics
**Problem**: The system doesn't know if a $0.10 inference is "worth it" for a given task.
**Missing Work**: Metadata in the routing decision that includes cost-estimation and budget constraints.
**Follow-up Owner**: **Gemini**
