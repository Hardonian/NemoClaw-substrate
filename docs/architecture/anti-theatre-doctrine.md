<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Doctrine

The NemoClaw governed substrate is built on a core philosophy of **Anti-Theatre**. This doctrine mandates that the system must prioritize observable truth, deterministic control, and explicit failure over opaque autonomy, "AI magic," or aspirational orchestration.

## Core Principles

### 1. Truth in Execution

NemoClaw rejects the use of hidden fallbacks or silent recoveries. If a component fails, the system must report it as a [Degraded State](failure-semantics.md) rather than attempting to hide the failure behind autonomous retries that the operator cannot audit.

### 2. Determinism Over Autonomy

The substrate is decision infrastructure, not a feature factory. Every decision made by the control plane—whether it is routing to a local provider or denying a network request—must be governed by inspectable contracts and policy artifacts. We do not rely on "prompt-only" instructions for core system safety.

### 3. Explicit Capability Matrix

We distinguish clearly between what is **implemented**, **scaffolded**, and **planned**. Documentation must never present a target-state design as current repository truth. This prevents "architecture theatre" where non-existent capabilities are marketed as functional.

### 4. Fail-Closed Governance

In the event of a conflict between autonomy and governance, governance always wins. If the system cannot verify the safety of an action (e.g., due to a stale policy or unavailable telemetry), it must [fail-closed](governance-invariants.md).

## Implementation in the Substrate

- **Execution Proofpacks:** When execution lifecycle evidence is exported, it must be packaged as a verifiable Proofpack built from recorded plans, queue history, leases, receipts, replay lineage, diagnostics, and explicit unavailable states. The substrate does not fabricate a Proofpack for work it did not record.
- **Strict Verification Gates:** Release readiness is determined by a deterministic verification chain (`verify:core`, `verify:release`), not by subjective "vibe checks" of agent performance.
- **No Automatic Policy Mutation:** Policies are promoted via supervised operator approval flows. The system does not "learn" new trust boundaries autonomously, as this would violate the principle of deterministic control.

## Anti-Theatre Lexicon

To maintain this doctrine, we avoid the following terms in technical documentation and code comments:

- **"Seamlessly"**: Implies hidden complexity that should be observable.
- **"Intelligently"**: Replaced by specific descriptions of the heuristic or algorithm used.
- **"Automatically heals"**: Replaced by "recovers to a known state via [specific mechanism]."
- **"Learns"**: Replaced by "updates configuration based on [specific supervised input]."

By adhering to the Anti-Theatre Doctrine, NemoClaw ensures that operators maintain full agency and trust in the execution environment.
