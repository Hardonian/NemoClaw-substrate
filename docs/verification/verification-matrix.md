<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verification Matrix

This matrix provides a detailed view of the verification status for each capability in the NemoClaw substrate. It maps architectural claims to specific verification methods and their current status.

## Verification Status Key

- **VERIFIED**: Automated test exists and passes in CI.
- **MANUAL**: Verified through manual operator audit or guided trace.
- **PLAN**: Verification method defined but not yet implemented/automated.
- **N/A**: Verification not applicable to this substrate layer.

## Control Plane & Governance

| Capability | Verification Method | Status | Evidence Location |
|---|---|---|---|
| **Deterministic Routing** | Property-based routing tests. | **VERIFIED** | `test/routing/*.test.ts` |
| **Policy Enforcement** | Negative test suite (Denied connections). | **VERIFIED** | `test/policy/enforcement.test.ts` |
| **Fail-Closed Logic** | Chaos injection (Killing signing service). | **MANUAL** | `docs/verification/chaos-reports/` |
| **Receipt Integrity** | Signature validation check on export. | **VERIFIED** | `test/evidence/integrity.test.ts` |

## Evidence & Replay

| Capability | Verification Method | Status | Evidence Location |
|---|---|---|---|
| **Deterministic Replay** | Bit-for-bit trace reproduction. | **VERIFIED** | `test/replay/determinism.test.ts` |
| **Lineage Tracking** | Decision parent/child hash validation. | **PLAN** | `src/lib/evidence/lineage.ts` |
| **Sensitive Masking** | Regex-based leak detection in receipts. | **VERIFIED** | `test/evidence/sanitization.test.ts` |
| **Audit Export** | Integration test with mock supervisor. | **MANUAL** | `test/integration/export-flow.js` |

## Security & Isolation

| Capability | Verification Method | Status | Evidence Location |
|---|---|---|---|
| **Sandbox Egress** | Network policy audit via `nmap`. | **VERIFIED** | `test/e2e/network-isolation.sh` |
| **SSRF Prevention** | Red-team payloads (Metadata service probes). | **VERIFIED** | `test/security/ssrf.test.ts` |
| **Credential Safety** | Static analysis (No secrets in code/logs). | **VERIFIED** | `make check` (Gitleaks) |
| **Identity Attestation** | Mock HSM attestation flow. | **PLAN** | `src/lib/trust/attestation.ts` |

## Verification Roadmap

The following verification automation is prioritized for the next release:

1. **Automated Chaos Suite**: Integrate `fail-closed` chaos tests into the standard CI pipeline.
2. **Lineage Consistency Check**: Implement background validation for decision lineage during batch export.
3. **Cross-Substrate Replay**: Enable replaying traces from a secondary substrate instance to verify cross-host determinism.

---

*Last Updated: March 2026*
