<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Failure Semantics Taxonomy

Normalized failure semantics for the NemoClaw substrate. Each state has a canonical meaning, operator interpretation, and explicit recovery expectations.

Automatic recovery is intentionally absent for all failure states unless explicitly noted. This is a design decision, not an omission.

---

## degraded

**Meaning:** System is operating with reduced capability or confidence. Some functions remain available.

**Operator interpretation:** Investigate root cause. Some operations may succeed with reduced quality or coverage.

**Replay implications:** Degraded events carry reason codes and are preserved in replay. Replay validation does not reject degraded-state events.

**Observability implications:** Degraded states are explicitly surfaced with source, subsystem, and reason. Never suppressed.

**Receipt implications:** Receipts emitted during degraded state carry the degraded context.

**Retry expectations:** Operator may retry after investigation. No automatic retry.

**Automatic recovery absent:** Yes. Intentional — operator must evaluate degraded cause.

---

## denied

**Meaning:** Policy explicitly denied the requested operation. The request was evaluated and rejected.

**Operator interpretation:** Review policy rules. The denial is intentional enforcement.

**Replay implications:** Denial decisions are recorded with policy rationale and reason codes.

**Observability implications:** Denial events are visible in policy outcome summaries.

**Receipt implications:** Denial receipts include policy reference and denial reason.

**Retry expectations:** Retry only after policy change or request modification. No automatic retry.

**Automatic recovery absent:** Yes. Intentional — policy denial reflects operator intent.

---

## unavailable

**Meaning:** The requested resource or service cannot be reached or is not responding.

**Operator interpretation:** Infrastructure issue. Check connectivity, service health, endpoint status.

**Replay implications:** Unavailable events carry timestamp and last-known state.

**Observability implications:** Explicitly reported as unavailable. Never omitted or masked as healthy.

**Receipt implications:** Receipts carry unavailable status with source and reason.

**Retry expectations:** Operator may retry after infrastructure investigation. No automatic retry.

**Automatic recovery absent:** Yes. Intentional — unavailability cause must be diagnosed.

---

## stale

**Meaning:** Data exists but has exceeded freshness thresholds. Previously observed data is preserved with stale markers.

**Operator interpretation:** Data may still be accurate but is not current. Re-probe or refresh recommended.

**Replay implications:** Stale markers are preserved in replay. Stale data does not trigger deletion.

**Observability implications:** Stale data is distinguished from current data in all outputs.

**Receipt implications:** Receipts may reference stale evidence; staleness is explicit in receipt metadata.

**Retry expectations:** Re-probe to refresh. No automatic refresh.

**Automatic recovery absent:** Yes. Intentional — stale data may still be valid.

---

## conflicted

**Meaning:** Multiple sources provide contradictory information about the same state.

**Operator interpretation:** Investigate conflicting sources. Resolution requires operator judgment.

**Replay implications:** Conflict events carry both conflicting values and sources.

**Observability implications:** Conflicts are surfaced as explicit events, not silently resolved.

**Receipt implications:** Receipts during conflict state carry conflict metadata.

**Retry expectations:** Resolve conflict before retry. No automatic resolution.

**Automatic recovery absent:** Yes. Intentional — conflicts require operator judgment.

---

## expired

**Meaning:** A time-bounded credential, attestation, or approval has exceeded its validity period.

**Operator interpretation:** Renew or re-issue the expired artifact. Execution dependent on it is blocked.

**Replay implications:** Expiration events carry expiration timestamp and affected artifact.

**Observability implications:** Expired artifacts are visible in trust/attestation summaries.

**Receipt implications:** Receipts carry expiration as blocking reason.

**Retry expectations:** Renew expired artifact, then retry. No automatic renewal.

**Automatic recovery absent:** Yes. Intentional — renewal is an operator action.

---

## unverifiable

**Meaning:** A claim or assertion cannot be independently verified with available evidence.

**Operator interpretation:** Treat as untrusted until verification is possible. Do not assume truth.

**Replay implications:** Unverifiable claims are recorded as such, not as verified.

**Observability implications:** Unverifiable status is explicit in evidence summaries.

**Receipt implications:** Receipts note unverifiable claims without asserting truth.

**Retry expectations:** Provide verification evidence, then retry. No automatic verification.

**Automatic recovery absent:** Yes. Intentional — verification requires evidence.

---

## replay-invalid

**Meaning:** Replay validation failed due to integrity mismatch, sequence gap, or missing governance metadata.

**Operator interpretation:** Replay log may be corrupted or tampered. Investigate source. Do not trust replayed history.

**Replay implications:** Replay processing halts. No partial acceptance. Fail-closed.

**Observability implications:** Replay-invalid events are critical alerts.

**Receipt implications:** No receipts are emitted for replay-invalid records.

**Retry expectations:** Investigate and repair replay source. No automatic recovery.

**Automatic recovery absent:** Yes. Intentional — replay integrity failure requires investigation.

---

## lineage-missing

**Meaning:** A decision or event lacks required governance lineage metadata.

**Operator interpretation:** The decision path is unauditable. Investigate origin.

**Replay implications:** Events with missing lineage are rejected by replay validation.

**Observability implications:** Lineage-missing events are flagged as governance failures.

**Receipt implications:** Receipts without lineage are invalid.

**Retry expectations:** Fix event emission to include lineage. No automatic fix.

**Automatic recovery absent:** Yes. Intentional — lineage absence is a code defect.

---

## authorization-failed

**Meaning:** The request was evaluated against policy and the requester lacks authorization.

**Operator interpretation:** Review requester permissions and policy configuration.

**Replay implications:** Authorization failures are recorded with policy reference.

**Observability implications:** Authorization failures are visible in policy outcome summaries.

**Receipt implications:** Receipts carry authorization failure with policy context.

**Retry expectations:** Adjust permissions or policy, then retry. No automatic retry.

**Automatic recovery absent:** Yes. Intentional — authorization is policy-driven.

---

## approval-missing

**Meaning:** Policy requires explicit operator approval and no approval context was provided.

**Operator interpretation:** Provide explicit approval for the operation, then retry.

**Replay implications:** Approval-missing events are recorded with the approval requirement context.

**Observability implications:** Approval-missing blocks are visible in execution summaries.

**Receipt implications:** Receipts carry approval-missing as blocking reason.

**Retry expectations:** Provide approval context, then retry. No automatic approval.

**Automatic recovery absent:** Yes. Intentional — approval is an explicit operator action.

---

## fallback-blocked

**Meaning:** A fallback path was identified but blocked by policy or explicit no-fallback configuration.

**Operator interpretation:** Review fallback policy. The block is intentional enforcement.

**Replay implications:** Fallback-blocked events carry origin, target, and blocking reason.

**Observability implications:** Fallback-blocked events are visible in routing summaries.

**Receipt implications:** Receipts carry fallback-blocked with full context.

**Retry expectations:** Adjust fallback policy or provide alternative. No automatic fallback.

**Automatic recovery absent:** Yes. Intentional — fallback blocking reflects operator policy.

---

## policy-mismatch

**Meaning:** The request parameters do not match any applicable policy rule.

**Operator interpretation:** Review policy rules for coverage gaps.

**Replay implications:** Policy-mismatch events are recorded with request context and evaluated rules.

**Observability implications:** Policy-mismatch events surface coverage gaps.

**Receipt implications:** Receipts carry policy-mismatch with evaluated context.

**Retry expectations:** Update policy rules, then retry. No automatic policy update.

**Automatic recovery absent:** Yes. Intentional — policy gaps require operator review.

---

## trust-insufficient

**Meaning:** Worker trust level is below the threshold required for the requested operation.

**Operator interpretation:** Review worker trust state. Elevate trust via operator approval if appropriate.

**Replay implications:** Trust-insufficient events carry trust level and required threshold.

**Observability implications:** Trust-insufficient events are visible in trust summaries.

**Receipt implications:** Receipts carry trust-insufficient as blocking reason.

**Retry expectations:** Elevate trust via operator review, then retry. No automatic elevation.

**Automatic recovery absent:** Yes. Intentional — trust elevation requires operator review.

---

## telemetry-unavailable

**Meaning:** Telemetry data cannot be collected for one or more endpoints.

**Operator interpretation:** Check probe connectivity and endpoint health. Operations continue without telemetry (telemetry is not authoritative).

**Replay implications:** Telemetry-unavailable events are recorded. Previously observed data preserved.

**Observability implications:** Telemetry unavailability is explicit. Never omitted.

**Receipt implications:** Receipts during telemetry-unavailable carry the unavailability context.

**Retry expectations:** Re-probe after connectivity investigation. No automatic re-probe.

**Automatic recovery absent:** Yes. Intentional — unavailability cause must be diagnosed.

---

## telemetry-partial

**Meaning:** Telemetry data was collected but is incomplete (some fields missing or parser unable to extract all metadata).

**Operator interpretation:** Available data is usable but incomplete. Consider upgrading probe or parser.

**Replay implications:** Partial telemetry events carry confidence level and available fields.

**Observability implications:** Partial telemetry is distinguished from complete telemetry.

**Receipt implications:** Receipts reference partial telemetry with confidence metadata.

**Retry expectations:** Upgrade parser or probe, then retry. No automatic upgrade.

**Automatic recovery absent:** Yes. Intentional — partial telemetry may be sufficient.

---

## transport-blocked

**Meaning:** Network transport to a remote endpoint was blocked by policy, firewall, or SSRF validation.

**Operator interpretation:** Review network policy and endpoint configuration.

**Replay implications:** Transport-blocked events carry endpoint and blocking reason.

**Observability implications:** Transport-blocked events are visible in remote execution summaries.

**Receipt implications:** Receipts carry transport-blocked with endpoint and reason.

**Retry expectations:** Update network policy or endpoint, then retry. No automatic retry.

**Automatic recovery absent:** Yes. Intentional — transport blocking reflects security policy.
