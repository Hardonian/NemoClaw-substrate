<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Semantic Consistency Audit

This document tracks the audit of system terminology to ensure alignment with the NemoClaw **Anti-Theatre Doctrine**.

## Prohibited vs. Canonical Terminology

| Prohibited Term | Canonical Term | Rationale | Status |
|-----------------|----------------|-----------|--------|
| **Fallback** | **Degraded State** | "Fallback" implies a safe, hidden recovery. "Degraded State" forces explicit acknowledgement of failure. | **Remediation in progress** |
| **Failover** | **Degraded State** | Avoids the implication of seamless transition to a secondary system. | **Remediation in progress** |
| **Self-healing** | **Remediation** | Avoids anthropomorphizing the system; focuses on explicit corrective actions. | **Enforced** |
| **Autonomous** | **Governed / Deterministic** | Autonomy implies a lack of oversight. NemoClaw focuses on governed execution. | **Enforced** |
| **Seamless** | **Explicit / Traced** | "Seamlessness" often hides important operational transitions from the auditor. | **Enforced** |
| **Magic** | **Evidence-backed** | Any behavior must be explainable via evidence, not "magic" logic. | **Enforced** |

## Audit Results (May 2026)

### 1. "Fallback" Usage
- **Finding**: Several instances of `fallback` were found in documentation and internal utilities.
- **Action**: Renaming `fallback_evidence` to `degraded_state_evidence` in [Evidence Export Formats](../evidence-export-formats.md).
- **Action**: Renaming `includeFallback` to `includeExtendedDegraded` in [Fixture Generation Doctrine](../fixture-generation-doctrine.md).

### 2. "Intent" vs. "Plan"
- **Finding**: "Intent" is sometimes used interchangeably with "Plan".
- **Action**: Clarified in [Governance Glossary](../architecture/governance-glossary.md). **Intent** is the user's high-level request; **Plan** is the substrate's governed execution sequence.

### 3. "Evidence" vs. "Receipt"
- **Finding**: Some confusion between individual receipts and the aggregate evidence.
- **Action**: Defined **Receipt** as a single event and **Evidence** as the collection of receipts within a **Proofpack**.

### 4. "Reason Code" Consistency
- **Finding**: Some sub-systems used `ReasonCode` while others used `ErrorCode`.
- **Action**: Standardized on `ReasonCode` across all governance boundaries (`SecurityReasonCode`, `OrchestrationReasonCode`).

## Next Steps

1. **Purge remaining "Fallback" terminology**: Scan all non-internal code for remaining instances.
2. **Automate terminology check**: Add a linting rule or pre-commit hook to catch prohibited terms in documentation and code comments.
3. **Formalize Intent Schema**: Ensure the transition from "Intent" to "Plan" is captured in the Proofpack lineage.
