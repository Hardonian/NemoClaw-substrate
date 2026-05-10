<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Invariants

This document formalizes the hard invariants that govern the NemoClaw substrate. Each invariant is derived from implemented behavior and architecture decisions. Violation of any invariant constitutes a governance failure.

## Status taxonomy

- **Implemented:** enforced in code with test coverage.
- **Scaffolded:** contract exists; enforcement is partial.
- **Planned:** design intent only; no enforcement exists.

---

## INV-001: Replay must fail closed

**Statement:** Replay validation rejects envelopes on any integrity mismatch. There is no silent adaptation, no best-effort replay, and no partial acceptance.

**Rationale:** Replay is the integrity backbone for audit and governance lineage. Silent adaptation would allow tampered or drifted records to appear valid.

**Violation impact:** Forged or drifted execution history could pass audit checks, undermining governance trust.

**Enforcement points:**

- `src/lib/control-plane/replay.ts` — digest validation, sequence continuity checks.
- `src/lib/control-plane/degraded-state-chaos.test.ts` — replay digest mismatch detection.

**Verification:** `npm run verify:chaos`, `npx vitest run src/lib/control-plane/replay.test.ts`.

**Future distributed implications:** Distributed replay must preserve this invariant across node boundaries. Partial network replay must fail closed, not silently truncate.

---

## INV-002: Telemetry never authorizes execution

**Statement:** Telemetry is evidence only. It informs confidence and observability but is never authoritative for routing, scheduling, or execution decisions.

**Rationale:** Telemetry can be stale, unavailable, or malformed. Granting it authority would allow forged or degraded telemetry to drive execution.

**Violation impact:** Routing decisions driven by telemetry could be manipulated via probe forgery or stale cache injection.

**Enforcement points:**

- `src/lib/control-plane/operational-intelligence.ts` — telemetry aggregation outputs are non-authoritative.
- `src/lib/control-plane/worker-probes.ts` — probe results update registry evidence, not authorization state.
- Policy evaluator (`src/lib/control-plane/types.ts`) — policy decisions are independent of telemetry.

**Verification:** `npm run verify:remote-probes`, telemetry aggregation tests.

**Future distributed implications:** Distributed telemetry federation must not elevate telemetry to authorization. Cross-node telemetry remains evidence subject to local policy evaluation.

---

## INV-003: Trust is not authorization

**Statement:** Worker trust level (self-reported claims, probe observations, operator attestations) is a classification signal. It does not grant execution authorization. Authorization requires explicit policy evaluation and operator approval.

**Rationale:** Trust is a confidence gradient derived from evidence. Authorization is a binary policy decision. Conflating them allows trust escalation to bypass policy.

**Violation impact:** A worker with high trust but denied policy could execute unauthorized remote work.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — `TrustLevel` and `AttestationStatus` are separate from `PolicyDecision`.
- Remote execution adapter — policy gating precedes transport regardless of trust level.
- `src/lib/control-plane/degraded-state-chaos.test.ts` — trust-denied workers are blocked before transport.

**Verification:** `npm run verify:chaos`, trust-gating tests in worker-probes and governed-routing suites.

**Future distributed implications:** Distributed trust federation must not create automatic authorization paths. Federated trust remains evidence; local policy remains authoritative.

---

## INV-004: Attestation is not trust

**Statement:** Attestation status (valid, expired, revoked, conflicted, pending, unverified) is the provenance record of a trust claim. It does not automatically determine trust level.

**Rationale:** A valid attestation proves claim provenance, not claim truthfulness. Expired attestations may still be accurate. Conflated attestation-as-trust would create a single point of trust failure.

**Violation impact:** Expired attestations could silently drop trust, or valid attestations could grant unearned trust.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — `AttestationStatus` and `TrustLevel` are distinct fields.
- Capability attestation helpers evaluate both independently.

**Verification:** Attestation/authorization helper tests.

**Future distributed implications:** Cryptographic attestation (not yet implemented) must update attestation status without automatically elevating trust. Operator review of attestation changes remains required.

---

## INV-005: Probes are evidence, not authority

**Statement:** Probe execution (local or remote) produces observational evidence. Probe results do not authorize, deny, or modify execution paths. They update registry evidence only.

**Rationale:** Probes are best-effort, potentially stale, and environment-dependent. Granting probes authority would allow probe manipulation to control routing.

**Violation impact:** A manipulated probe response could authorize or deny execution without policy evaluation.

**Enforcement points:**

- `src/lib/control-plane/local-runtime-probes.ts` — probes update registry, not policy.
- `src/lib/control-plane/worker-probes.ts` — remote probes update evidence fields, not authorization.
- Diagnostics summary — reports probe evidence without making authorization claims.

**Verification:** `npm run verify:local-probes`, `npm run verify:remote-probes`.

**Future distributed implications:** Distributed probes must remain evidence-only. Cross-node probe results must not create implicit authorization paths.

---

## INV-006: Fallback must always be explicit

**Statement:** Every fallback path is represented as an operator-visible planning record with origin candidate, fallback target, reason, policy status, and operator explanation. There are no hidden fallbacks.

**Rationale:** Hidden fallbacks obscure failure modes and prevent operator understanding of routing decisions.

**Violation impact:** Execution could silently route to unintended targets without operator visibility or audit trail.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — `FallbackRecord` with explicit fields.
- Governed routing — no-candidate paths are explicit failures, not silent fallback.
- `src/lib/control-plane/degraded-state-chaos.test.ts` — no-hidden-fallback assertions.

**Verification:** `npm run verify:governed-routing`, `npm run verify:chaos`.

**Future distributed implications:** Distributed fallback across nodes must preserve explicit fallback records. Cross-node fallback must emit receipts at both origin and target.

---

## INV-007: Diagnostics never mutate runtime

**Statement:** Diagnostics collection and reporting are read-only operations. They observe and report state. They do not modify runtime behavior, routing decisions, policy state, or execution paths.

**Rationale:** Diagnostics that mutate state create feedback loops where observation changes behavior, violating determinism.

**Violation impact:** Diagnostic collection could alter routing outcomes or mask failures.

**Enforcement points:**

- `src/lib/control-plane/local-diagnostics-summary.ts` — pure aggregation functions.
- Diagnostics command paths — read-only access to state.

**Verification:** `npm run verify:local-probes` (diagnostics summary tests).

**Future distributed implications:** Distributed diagnostics aggregation must remain read-only. Cross-node diagnostic queries must not trigger state changes at remote nodes.

---

## INV-008: Replay lineage absence is failure

**Statement:** Replay envelopes without governance lineage metadata (decision IDs, policy references, reason codes) are invalid and must be rejected. Missing lineage is never treated as optional.

**Rationale:** Lineage is required for audit integrity. Missing lineage means the decision path is unverifiable.

**Violation impact:** Decisions without lineage could pass replay validation, creating unauditable execution history.

**Enforcement points:**

- `src/lib/control-plane/replay.ts` — required governance metadata validation.
- Replay validation tests — explicit rejection of missing lineage fields.

**Verification:** `npm run verify:chaos` (replay rejection assertions).

**Future distributed implications:** Distributed replay must propagate lineage across node boundaries. Cross-node decisions without lineage must fail closed at the receiving node.

---

## INV-009: Governance metadata absence is failure

**Statement:** Control decisions, receipts, and operational events without required governance metadata (timestamps, reason codes, source component, subsystem) are invalid.

**Rationale:** Governance metadata is the minimum context for operator understanding and audit. Its absence makes events uninterpretable.

**Violation impact:** Events without governance metadata could accumulate, creating an unauditable operational history.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — required fields on `ExecutionReceipt`, `DegradedState`, operational events.
- Deterministic serialization — validates presence of required fields.

**Verification:** Control-plane contract tests, receipt emission tests.

**Future distributed implications:** All distributed events must carry governance metadata. Cross-node event forwarding must validate metadata presence before acceptance.

---

## INV-010: Remote execution is never implicit

**Statement:** Remote execution requires explicit opt-in via `NEMOCLAW_REMOTE_EXECUTION=1`, policy eligibility evaluation, and approval context. There is no implicit remote dispatch.

**Rationale:** Implicit remote execution would allow local operations to silently cross trust boundaries.

**Violation impact:** Local workloads could execute on untrusted remote workers without operator awareness.

**Enforcement points:**

- `src/lib/control-plane/remote-execution-adapter.ts` — flag gating before any transport.
- Policy evaluation — explicit `deny` or `approval_required` blocking.
- `src/lib/control-plane/degraded-state-chaos.test.ts` — remote execution disabled/denied assertions.

**Verification:** `npm run verify:chaos`, governed routing tests.

**Future distributed implications:** Distributed execution must preserve explicit opt-in semantics. Cross-node routing must require per-request policy evaluation.

---

## INV-011: Operator approval is explicit

**Statement:** Operator approval is a distinct, explicit action. It is never inferred from trust level, telemetry state, or prior approvals. Each approval context is request-scoped.

**Rationale:** Implicit approval from historical context would allow stale or revoked approvals to persist.

**Violation impact:** Stale approvals could authorize execution that the operator would no longer permit.

**Enforcement points:**

- Remote execution adapter — `approval_required` blocks without explicit approval context.
- Policy evaluator — approval decisions are per-evaluation, not cached.

**Verification:** `npm run verify:chaos` (approval-required blocking tests).

**Future distributed implications:** Distributed approval must not cache or forward approvals across trust boundaries. Each node must re-evaluate approval requirements.

---

## INV-012: Degraded states must remain observable

**Statement:** Every degraded state carries a reason code, timestamp, source component, subsystem, and operator explanation. Degraded states are never suppressed or aggregated into false-healthy signals.

**Rationale:** Suppressed degraded states create false confidence and prevent operator intervention.

**Violation impact:** Operators could believe the system is healthy when it is degraded, missing required intervention windows.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — `DegradedState` with required fields.
- Observability aggregation — degraded states are surfaced, not suppressed.
- Diagnostics — explicit degraded-state reporting in summaries.

**Verification:** `npm run verify:chaos`, diagnostics summary tests.

**Future distributed implications:** Distributed degraded states must propagate across node boundaries. Cross-node health aggregation must not mask per-node degraded states.

---

## INV-013: Observability must not fabricate certainty

**Statement:** Observability outputs distinguish between observed, unavailable, stale, and partial states. They never fabricate healthy status from absent data.

**Rationale:** Fabricated certainty from missing data is worse than reported uncertainty. Operators need truth, not comfort.

**Violation impact:** Missing telemetry could appear as healthy state, preventing detection of actual failures.

**Enforcement points:**

- `src/lib/control-plane/observability.ts` — outputs distinguish observed/unavailable states.
- Telemetry registry — unavailable telemetry does not clear previously observed data.
- Diagnostics — explicit unavailable/stale reporting.

**Verification:** `npm run verify:local-probes`, observability aggregation tests.

**Future distributed implications:** Distributed observability must propagate uncertainty. Cross-node health dashboards must display per-node confidence, not fabricated aggregate health.

---

## INV-014: Stale telemetry is not deletion

**Statement:** When telemetry becomes unavailable or stale, previously observed data is preserved with stale markers. Unavailable telemetry does not erase inventory.

**Rationale:** Deleting data on unavailability would create oscillating inventory state and prevent reasoning about historical observations.

**Violation impact:** Temporary probe failures could erase device registry state, causing scheduling instability.

**Enforcement points:**

- `src/lib/control-plane/worker-probes.ts` — unavailable/stale telemetry preserved with provenance markers.
- Registry telemetry persistence policy — observed/partial/unavailable/stale/conflict provenance.

**Verification:** `npm run verify:remote-probes`, telemetry registry update tests.

**Future distributed implications:** Distributed registry synchronization must not delete stale entries on unavailability. Cross-node registry reconciliation must preserve provenance.

---

## INV-015: Unavailable telemetry is explicit

**Statement:** When telemetry is unavailable, the system reports unavailability explicitly. It does not silently omit or silently succeed.

**Rationale:** Silent omission of unavailable telemetry creates false completeness in observability outputs.

**Violation impact:** Operators could believe telemetry coverage is complete when critical nodes are unmonitored.

**Enforcement points:**

- `src/lib/control-plane/operational-intelligence.ts` — explicit unavailable categorization.
- Diagnostics — telemetry availability state explicitly reported.
- `src/lib/control-plane/degraded-state-chaos.test.ts` — telemetry non-erasure under unavailable probes.

**Verification:** `npm run verify:chaos`, telemetry unavailability tests.

**Future distributed implications:** Distributed telemetry must propagate unavailability signals. Cross-node telemetry dashboards must distinguish between "no data" and "healthy."

---

## INV-016: Operational memory is append-only and supervised

**Statement:** Operational memory records are append-only. Memory informs recommendations but never silently mutates active policy, routing behavior, or trust state.

**Rationale:** Mutable memory that can alter policy creates autonomous learning, which violates operator sovereignty.

**Violation impact:** Accumulated memory could silently shift routing behavior away from operator intent.

**Enforcement points:**

- `src/lib/control-plane/operational-memory.ts` — append-only interface, no mutation APIs.
- Policy promotion — supervised proposals only, no automatic application.

**Verification:** Operational memory tests (append-only assertions, no-auto-mutation assertions).

**Future distributed implications:** Distributed operational memory must not synchronize mutations. Cross-node memory sharing must be read-only and supervised.

---

## INV-017: Policy remains authoritative

**Statement:** Policy decisions are authoritative for execution authorization. No other subsystem (telemetry, probes, trust, memory, diagnostics) can override a policy decision.

**Rationale:** Policy is the operator's expressed intent. Overriding it from any other subsystem would violate operator sovereignty.

**Violation impact:** Execution could bypass operator-configured policy through trust escalation, telemetry manipulation, or memory influence.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — `PolicyDecision` is the gating type for execution.
- Governed routing — policy evaluation precedes candidate selection.
- Remote execution — policy gating precedes transport.

**Verification:** `npm run verify:governed-routing`, `npm run verify:chaos`.

**Future distributed implications:** Distributed policy must not be overridden by remote node state. Cross-node policy must be evaluated locally, not delegated.

---

## INV-018: Receipts are deterministic and replay-oriented

**Statement:** Execution receipts are deterministically serialized, carry stable identifiers, and are designed for replay integrity validation. Receipt content is immutable after emission.

**Rationale:** Non-deterministic receipts would produce different replay digests for identical executions, breaking replay integrity.

**Violation impact:** Replay validation would fail on legitimate executions due to serialization instability.

**Enforcement points:**

- `src/lib/control-plane/types.ts` — deterministic serialization for receipts.
- Receipt emission in governed routing and remote execution paths.

**Verification:** Control-plane contract serialization tests, replay tests.

**Future distributed implications:** Distributed receipts must use the same deterministic serialization. Cross-node receipt forwarding must not re-serialize with different ordering.
