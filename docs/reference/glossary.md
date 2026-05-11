# NemoClaw Terminology Glossary

This glossary defines the canonical terminology used across the NemoClaw governed substrate. Adherence to these definitions is mandatory for all documentation, code comments, and operator-visible outputs to maintain structural coherence and prevent entropy.

## Core Concepts

### Evidence vs. Authorization

* **Evidence**: Immutable records of fact (receipts, telemetry, logs) that prove what happened. Evidence is the basis for auditability.
* **Authorization**: A point-in-time decision to allow or deny an action based on policy and evidence. Authorization is the "authority," while evidence is the "truth."

### Degraded vs. Unavailable

* **Degraded**: The system is functioning but with reduced capabilities, accuracy, or performance (e.g., scoring without live telemetry, using Degraded State providers).
* **Unavailable**: A subsystem or dependency is completely unreachable or non-functional, preventing execution of associated tasks.

### Planned vs. Implemented

* **Planned**: Features or behaviors described in design documents or ROADMAP.md that are not yet part of the codebase.
* **Implemented**: Capabilities that exist in the current codebase, are verified by tests, and are ready for use in specified environments.
* **CRITICAL**: Documentation must explicitly distinguish between these to avoid "theatre."

### Replay vs. Receipts

* **Receipts**: Individual, atomic records of specific events or decisions (e.g., `PLAN_STARTED`, `STEP_COMPLETED`).
* **Replay**: The process of re-executing a sequence of events (using a Replay Envelope) to verify that the same inputs still produce the same deterministic outputs and receipts.

### Telemetry vs. Orchestration

* **Telemetry**: Passive collection of system state (GPU VRAM, thermal levels, network latency). Telemetry serves as evidence.
* **Orchestration**: Active management and coordination of tasks across multiple steps, providers, or environments based on plans and policies.

## System Components

### Attestation Record

A cryptographic proof of identity or state, typically signed by a trusted hardware component or a secure enclave (e.g., TPM, Landlock sandbox).

### Blueprint

The declarative definition of a sandbox's lifecycle, resource limits, and network policies.

### Fanout

The simultaneous execution of a task across multiple candidates (providers or regions) to select the best result or ensure availability.

### Landlock

A Linux security module (LSM) used by NemoClaw for unprivileged sandboxing of the agent process.

### OpenShell

The underlying sandbox orchestration engine that NemoClaw wraps and hardens.

### Proofpack

A packaged bundle of evidence (manifest, artifacts, signatures) exported for external audit or verification.

### Receipt

An immutable, signed record of a discrete event within the substrate.

### Substrate

The collection of low-level services (orchestration, execution, policy, telemetry) that provide the foundation for governed agent execution.

### Trust Boundary

The logical perimeter within which code and data are considered trusted based on attestation and policy enforcement.

---

## Anti-Theatre Guidance

* **Use**: "Planned for v2.0" instead of "Supports future-proof scaling."
* **Use**: "Degraded state" instead of "Degraded State in progress" (unless it is actually healing).
* **Avoid**: Marketing-heavy terms like "AI-powered" unless referring to a specific, implemented model-driven logic.
* **Avoid**: "Real-time" unless the latency bounds are deterministic and verified.
