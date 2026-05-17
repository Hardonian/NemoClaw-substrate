<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Threat Model

Governance-specific threats to the NemoClaw substrate. Each threat is grounded in implementation state.

## Status taxonomy

- **Mitigated:** enforcement exists with test coverage.
- **Partially mitigated:** some controls exist; gaps remain.
- **Not yet applicable:** threat requires unimplemented capabilities.

---

## GT-001: Forged telemetry

**Scenario:** False telemetry injected into the device registry via manipulated probes.

**Affected subsystem:** Worker probes, telemetry adapters, device registry.

**Current mitigations:** Telemetry is evidence only (INV-002). Probe results carry source/confidence provenance. No background polling. Registry detects conflicts.

**Verification:** `npm run verify:remote-probes`, telemetry conflict/stale tests.

**Missing mitigations:** No cryptographic signing of probe responses. No cross-probe consistency validation.

**Residual risk:** Medium. Limited to observability deception; cannot drive execution.

**Status:** Partially mitigated.

---

## GT-002: Replay drift

**Scenario:** Replay records diverge from actual execution via missed events or corrupted serialization.

**Affected subsystem:** Replay validation, operational memory, receipts.

**Current mitigations:** Deterministic serialization with digest validation. Sequence continuity enforcement. Fail-closed on mismatch (INV-001).

**Verification:** `npm run verify:chaos`, replay validation tests.

**Missing mitigations:** No external replay store integrity verification. No cross-session continuity.

**Residual risk:** Low (in-process). Higher for future distributed replay.

**Status:** Mitigated (in-process scope).

---

## GT-003: Replay truncation

**Scenario:** Replay log truncated, removing evidence of specific decisions.

**Affected subsystem:** Replay validation, audit export.

**Current mitigations:** Sequence continuity detects gaps. Fail-closed on missing entries.

**Missing mitigations:** No tamper-evident external storage. No out-of-band integrity monitoring.

**Residual risk:** Medium. In-process replay not durable against process crashes.

**Status:** Partially mitigated.

---

## GT-004: Missing lineage

**Scenario:** Decisions recorded without governance lineage (decision IDs, policy refs, reason codes).

**Affected subsystem:** Receipts, replay, operational memory.

**Current mitigations:** Required metadata validation on replay envelopes (INV-008, INV-009). Replay rejection for missing reason codes.

**Verification:** `npm run verify:chaos`.

**Missing mitigations:** Runtime validation only; no compile-time enforcement.

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-005: Fake capability claims

**Scenario:** Worker self-reports capabilities it does not possess.

**Affected subsystem:** Worker identity, trust/attestation, device registry.

**Current mitigations:** Self-reported claims are evidence only (INV-003, INV-004). Operator approval required. Revoked/expired attestations block remote execution.

**Missing mitigations:** No cryptographic attestation. No independent capability verification.

**Residual risk:** Medium. Mitigated by approval requirement.

**Status:** Partially mitigated. Cryptographic attestation planned.

---

## GT-006: Stale approvals

**Scenario:** Approval from time T used at time T+N when operator intent changed.

**Affected subsystem:** Policy evaluation, remote execution.

**Current mitigations:** Approval context is per-evaluation, not cached (INV-011).

**Missing mitigations:** No explicit expiration or revocation mechanism.

**Residual risk:** Low (approvals are ephemeral in current scope).

**Status:** Partially mitigated.

---

## GT-007: hidden degraded state

**Scenario:** Execution silently falls back without operator visibility.

**Affected subsystem:** Governed routing, heterogeneous routing.

**Current mitigations:** All degraded states are explicit (INV-006). No-hidden-degraded state chaos assertions.

**Verification:** `npm run verify:governed-routing`, `npm run verify:chaos`.

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-008: Unauthorized remote execution

**Scenario:** Workload dispatched to remote worker without opt-in/policy/approval.

**Affected subsystem:** Remote execution adapters, heterogeneous routing.

**Current mitigations:** Explicit flag gating (INV-010). Policy gating. Approval blocking. Trust gating.

**Verification:** `npm run verify:chaos`.

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-009: Observability deception

**Scenario:** Observability presents fabricated certainty from absent data.

**Affected subsystem:** Observability, diagnostics, telemetry.

**Current mitigations:** Distinguished observed/unavailable/stale states (INV-013, INV-014, INV-015).

**Missing mitigations:** No alerting on extended unavailability.

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-010: Trust escalation

**Scenario:** Worker trust auto-elevated via telemetry/probes/history without operator review.

**Affected subsystem:** Worker identity/trust, operational memory.

**Current mitigations:** Trust != authorization (INV-003). No auto-elevation in code. Operator approval explicit (INV-011).

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-011: Policy snapshot drift

**Scenario:** Policy changes between evaluation and execution (TOCTOU).

**Affected subsystem:** Policy engine, governed routing.

**Current mitigations:** Synchronous evaluation within request path. Receipt captures policy rationale.

**Missing mitigations:** No policy versioning/snapshot pinning. No async TOCTOU detection.

**Residual risk:** Low (synchronous). Higher for future async/distributed paths.

**Status:** Partially mitigated.

---

## GT-012: Replay forgery

**Scenario:** Crafted replay records that pass integrity checks but represent fabricated history.

**Affected subsystem:** Replay validation, audit export.

**Current mitigations:** Deterministic digest validation. Sequence continuity.

**Missing mitigations:** No cryptographic signing. No external witness/notary.

**Residual risk:** Medium for exported replay.

**Status:** Partially mitigated.

---

## GT-013: Degraded-state masking

**Scenario:** Degraded states suppressed or aggregated into healthy signals.

**Affected subsystem:** Observability, diagnostics.

**Current mitigations:** Required metadata on degraded states (INV-012). No fabricated certainty (INV-013).

**Residual risk:** Low.

**Status:** Mitigated.

---

## GT-014: Receipt tampering

**Scenario:** Receipts modified after emission, altering recorded decision path.

**Affected subsystem:** Receipts, replay, audit export.

**Current mitigations:** Deterministic serialization. Replay digest validation. Append-only memory (INV-016).

**Missing mitigations:** No cryptographic signing. No immutable storage backend.

**Residual risk:** Low (in-process). Medium for exported receipts.

**Status:** Partially mitigated.

---

## GT-015: Operational-memory manipulation

**Scenario:** Historical memory entries modified, altering recommendation basis.

**Affected subsystem:** Operational memory, policy promotion.

**Current mitigations:** Append-only interface (INV-016). No mutation APIs. No auto-mutation.

**Missing mitigations:** No integrity verification of historical entries.

**Residual risk:** Low (in-process).

**Status:** Mitigated (in-process scope).

---

## GT-016: Future queue poisoning

**Scenario:** Malicious work items injected into future execution queue.

**Affected subsystem:** Not implemented (future queuing).

**Current mitigations:** Not applicable — no queuing infrastructure exists.

**Missing mitigations:** Queue authentication, item integrity, lineage validation, rate limiting.

**Residual risk:** Not yet applicable. Must be addressed before queue implementation.

**Status:** Not yet applicable. See `distributed-execution-prerequisites.md`.

---

## GT-017: Future distributed trust poisoning

**Scenario:** Compromised node injects false trust signals into future trust federation.

**Affected subsystem:** Not implemented (future trust federation).

**Current mitigations:** Not applicable — trust is local-only.

**Missing mitigations:** Cross-node trust verification, signal authentication, revocation propagation.

**Residual risk:** Not yet applicable. Must be addressed before trust federation.

**Status:** Not yet applicable. See `distributed-execution-prerequisites.md`.
