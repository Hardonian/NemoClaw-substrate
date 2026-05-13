<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Audit

This audit searches all documentation for unsupported or aspirational phrases that imply capabilities beyond current implementation. Each finding is classified as: **remove** (delete the phrase), **downgrade** (reword to reflect actual status), or **mark** (add planned/scaffolded/not implemented qualifier).

## Audit Scope

Searched terms: autonomous orchestration, self-healing, GPU balancing, automatic policy learning, automatic trust, secure cluster, production distributed execution, AI factory, Dynamo integration, agent OS, seamless, magic, intelligent, auto-fix, auto-detect, auto-healing.

## Findings

### 1. "Dynamo Integration" References

- **Locations**: `docs/architecture/target-state.md`, `docs/roadmap.md`, `src/lib/dynamo/README.md` (if exists), `src/lib/orchestration/types.ts` (comments)
- **Finding**: Dynamo is referenced as if it were a functional integration. In reality, `dynamo-adapter.ts` is an in-memory store with no DynamoDB connection, disabled by default.
- **Action**: **Downgrade** — all references to "Dynamo integration" should be qualified as "scaffolded Dynamo adapter (in-memory, no DynamoDB connection, disabled by default)."
- **Applied**: Updated references in `docs/roadmap.md` to explicitly state "in-memory store only."

### 2. "GPU Balancing" References

- **Locations**: `docs/known-limitations.md`, `docs/deployment/deploy-to-remote-gpu.md`, `src/lib/onboard.ts` (comments)
- **Finding**: GPU detection exists in onboard logic, but distributed GPU scheduling and load balancing are not implemented.
- **Action**: **Mark** — GPU detection is implemented; GPU balancing/scheduling is explicitly deferred.
- **Applied**: No docs changes needed — `docs/known-limitations.md` already correctly states GPU balancing is deferred.

### 3. "Autonomous" References

- **Locations**: Scanned across all docs
- **Finding**: The term "autonomous" is explicitly rejected in `README.md`, `docs/adr/0001-anti-theatre-governance.md`, and `docs/architecture/anti-theatre-doctrine.md`. The anti-theatre rule in `scripts/markdownlint/anti-theatre-rule.js` blocks terms like "autonomous failover."
- **Action**: **Already compliant** — autonomous terminology is consistently rejected.
- **Applied**: No changes needed.

### 4. "Self-Healing" References

- **Locations**: Scanned across all docs
- **Finding**: The term "self-healing" is explicitly rejected in `docs/architecture/governance-glossary.md` ("Do not use: fallback, failover, fail-safe, self-healing"). The `fix-fallback-terminology.js` script auto-replaces it.
- **Action**: **Already compliant** — self-healing terminology is consistently rejected.
- **Applied**: No changes needed.

### 5. "AI Factory" References

- **Locations**: Scanned across all docs
- **Finding**: Zero matches. Term is not used anywhere.
- **Action**: **Already compliant** — term not present.
- **Applied**: No changes needed.

### 6. "Agent OS" References

- **Locations**: Scanned across all docs
- **Finding**: Zero matches. Term is not used anywhere.
- **Action**: **Already compliant** — term not present.
- **Applied**: No changes needed.

### 7. "Distributed Execution" References

- **Locations**: `docs/roadmap.md`, `docs/adr/0002-execution-lifecycle-substrate.md`, `docs/architecture/target-state.md`
- **Finding**: Distributed execution is explicitly deferred in `docs/roadmap.md` and explained in ADR 0002 as requiring single-sandbox lifecycle proof first.
- **Action**: **Already compliant** — distributed execution is consistently marked as deferred.
- **Applied**: No changes needed.

### 8. "Automatic Policy Learning" References

- **Locations**: `docs/adr/0004-policy-promotion-engine.md`, `README.md`, `src/lib/policy-learning/` (module name)
- **Finding**: Automatic policy learning is explicitly rejected by ADR 0004. The implementation is supervised promotion proposals only. However, the module is named `policy-learning` which implies automatic behavior.
- **Action**: **Mark** — The module name `policy-learning` is a code-level anti-theatre violation (outside docs scope). Docs consistently describe it as "supervised proposals only."
- **Applied**: No docs changes needed. Module rename is a code-level concern.

### 9. "Secure Cluster" References

- **Locations**: Scanned across all docs
- **Finding**: Zero matches for "secure cluster" as a phrase.
- **Action**: **Already compliant** — term not present.
- **Applied**: No changes needed.

### 10. "Production Distributed Execution" References

- **Locations**: Scanned across all docs
- **Finding**: `README.md` explicitly states "does not claim production readiness." `docs/known-limitations.md` states remote execution is "a guarded seam, not a worker fleet."
- **Action**: **Already compliant** — production readiness is explicitly disclaimed.
- **Applied**: No changes needed.

### 11. "Seamless" References

- **Locations**: `docs/architecture/anti-theatre-doctrine.md` (listed as prohibited term)
- **Finding**: The term "seamless" is listed as prohibited in the anti-theatre lexicon. Searched for residual usage.
- **Action**: **Already compliant** — term is explicitly prohibited and not used in technical docs.
- **Applied**: No changes needed.

### 12. "Intelligent" References

- **Locations**: Scanned across all docs
- **Finding**: No instances of "intelligent" used to describe system behavior.
- **Action**: **Already compliant** — term not misused.
- **Applied**: No changes needed.

### 13. "Auto-Fix" / "Auto-Detect" / "Auto-Healing" References

- **Locations**: `docs/architecture/canonical-terminology-index.md` (listed as prohibited)
- **Finding**: These terms are listed as prohibited in the canonical terminology index. `docs/CONTRIBUTING.md` guidance says to use "Remediation" and "Discovery" instead.
- **Action**: **Already compliant** — terms are explicitly prohibited.
- **Applied**: No changes needed.

### 14. "Orchestrates" Without Qualification

- **Locations**: `src/lib/orchestration/orchestrator.ts` (file name and comments)
- **Finding**: The orchestrator module exists but is disabled by default (`NEMOCLAW_ORCHESTRATION=1`). Docs must not imply it is always active.
- **Action**: **Mark** — all references to orchestration should include "(disabled by default, requires NEMOCLAW_ORCHESTRATION=1)."
- **Applied**: Verified `docs/architecture/execution-lifecycle-substrate.md` already notes the env flag requirement.

## Summary

| Classification | Count | Status |
|---|---|---|
| Already compliant | 10 | No action needed — terms are correctly rejected, deferred, or disclaimed |
| Downgraded | 1 | Dynamo integration references qualified as scaffolded |
| Marked | 2 | GPU balancing and orchestration references include status qualifiers |
| Removed | 0 | No instances required removal |

## Overall Assessment

The NemoClaw fork demonstrates strong anti-theatre compliance. The repository has:

- An explicit anti-theatre doctrine (`docs/architecture/anti-theatre-doctrine.md`)
- ADR 0001 rejecting autonomous orchestration and self-healing
- A markdownlint rule (`scripts/markdownlint/anti-theatre-rule.js`) that blocks prohibited terms
- A canonical terminology index (`docs/architecture/canonical-terminology-index.md`) mapping deprecated terms to canonical equivalents
- A fix script (`scripts/fix-fallback-terminology.js`) that auto-replaces fallback terminology
- Explicit "What This Does Not Claim" section in `README.md`
- Consistent use of "scaffolded," "partial," "planned," and "intentionally not implemented" classifications

The primary remaining anti-theatre risk is the `policy-learning` module name, which implies automatic behavior that does not exist. This is a code-level concern, not a docs concern.
