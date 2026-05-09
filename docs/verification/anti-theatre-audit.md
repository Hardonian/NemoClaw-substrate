<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Audit

This document performs a semantic audit of the repository's claims to ensure strict alignment with current implementation reality and to prevent "theatre"—the practice of making future-state or purely decorative claims.

## Audit Summary (2026-05-09)

| Surface | Status | Findings | Recommendations |
|---|---|---|---|
| **README.md** | PASS | Explicitly lists "Not implemented" capabilities. Clear distinction between truth and roadmap. | Maintain the "Not implemented yet" section as a living record. |
| **Roadmap.md** | PASS | Dependencies are clearly mapped. Rationale is grounded in contract-first design. | Use "Scaffolded" cautiously; ensure it implies interface presence, not partial behavior. |
| **Architecture Docs** | WARNING | Some documents use "will" or "should" in ways that might imply existing behavior to a casual reader. | Standardize on "Planned:" or "Target State:" prefixes for non-implemented sections. |
| **Verification Claims** | PASS | `verify:core` and `verify:release` are grounded in actual test suites. | Ensure `verify:chaos` results are explicitly surfaced in PRs. |

## Detailed Findings

### 1. Implied Orchestration

**Flag:** Some architecture diagrams show remote execution flows that might imply a background orchestrator or queue manager.

**Correction:** Explicitly label these as "Synchronous Remote Dispatch" and note the absence of distributed queues or retries in the [Capability Status Matrix](../architecture/capability-status-matrix.md).

### 2. Autonomous vs. Reactive

**Flag:** The term "always-on assistants" in `AGENTS.md` might imply autonomous self-healing loops.

**Correction:** Clarify that "always-on" refers to persistence of the governed environment, not autonomous agency. All agent actions are reactive to explicit triggers in the current substrate.

### 3. GPU Balancing and Dynamo

**Flag:** Frequent mentions of Dynamo integration and GPU balancing in "planned" sections.

**Correction:** Ensure every mention is paired with "Contingent on stable local control contracts" to prevent the perception of imminent delivery.

### 4. Self-Healing Claims

**Flag:** Any mention of "self-healing" or "automatic recovery".

**Correction:** Remove or replace with "Explicit Fail-Closed and Manual Recovery" until a supervised recovery engine is implemented.

## Audit Rules for Contributors

1. **No Implementation overclaims:** If a feature isn't in `main` with tests, it doesn't exist in documentation truth.
2. **Deterministic Phrasing:** Use "X is implemented" or "Y is planned". Avoid "X is being implemented" or "Y is almost ready".
3. **Operator-Truth Semantics:** Documentation must prioritize what the operator can *observe* and *verify* today.
4. **Preserve Anti-Theatre Posture:** Reject PRs that add "ornamental" documentation or decorative architecture claims.
