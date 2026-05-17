<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Verification Matrix

This matrix maps each security doctrine requirement to its verification command and expected result.

## Verification commands

| ID | Domain | Verification command | Expected result |
| --- | --- | --- | --- |
| SEC-V01 | Secret redaction (CLI output) | `npx vitest run src/lib/security/redact.test.ts` | PASS — token patterns redacted, URL sanitization works |
| SEC-V02 | Secret redaction (shell fallback) | `npx vitest run src/lib/security/redact.test.ts` | PASS — EXPECTED_SHELL_PREFIXES consistency |
| SEC-V03 | Credential stripping | `npx vitest run src/lib/security/credential-filter.test.ts` | PASS — credential fields stripped, sensitive files excluded |
| SEC-V04 | Memory write scanning | `npx vitest run nemoclaw/src/security/secret-scanner.test.ts` | PASS — secret patterns detected in memory content |
| SEC-V05 | Command execution safety | `npx vitest run src/lib/runner-argv.test.ts` | PASS — shell:true rejected, strings rejected, metacharacters literal |
| SEC-V06 | SSRF protection | `npx vitest run nemoclaw/src/blueprint/ssrf.test.ts` | PASS — private IPs blocked, DNS pinning works |
| SEC-V07 | Remote execution gating | `npm run verify:chaos` | PASS — disabled by default, policy/approval gates enforce |
| SEC-V08 | Replay envelope integrity | `npx vitest run src/lib/control-plane/replay.test.ts` | PASS — digest mismatch rejected, missing lineage rejected |
| SEC-V09 | Trust/attestation separation | `npm run verify:chaos` | PASS — revoked/expired/conflicted attestation blocks execution |
| SEC-V10 | Policy authority | `npm run verify:governed-routing` | PASS — policy decisions are authoritative |
| SEC-V11 | Full security suite | `npm run verify:core` | PASS — all security-relevant tests pass |

## Cross-reference to doctrine documents

| Doctrine document | Verification IDs |
| --- | --- |
| `security-threat-model.md` | SEC-V01 through SEC-V10 |
| `security-policy-model.md` | SEC-V05, SEC-V07, SEC-V10 |
| `transport-security.md` | SEC-V05, SEC-V06, SEC-V07 |
| `secret-redaction-doctrine.md` | SEC-V01, SEC-V02, SEC-V03, SEC-V04 |
| `command-execution-safety.md` | SEC-V05 |
| `local-stack-security-profiles.md` | SEC-V06, SEC-V07, SEC-V09 |
| `governance-invariants.md` | SEC-V07, SEC-V08, SEC-V09, SEC-V10 |

## Cross-reference to threat model

| Threat ID | Verification IDs |
| --- | --- |
| THREAT-001: Credential leakage via CLI | SEC-V01, SEC-V02 |
| THREAT-002: Credential persistence | SEC-V03 |
| THREAT-003: Credential leakage via URLs | SEC-V01 |
| THREAT-004: Secret in memory writes | SEC-V04 |
| THREAT-005: Command injection | SEC-V05 |
| THREAT-006: SSRF/DNS rebinding | SEC-V06 |
| THREAT-007: Malicious remote worker | SEC-V07, SEC-V09 |
| THREAT-008: Forged telemetry | SEC-V10 |
| THREAT-009: Replay tampering | SEC-V08 |
| THREAT-010: Remote exec without consent | SEC-V07, SEC-V09 |
| THREAT-011: Proofpack integrity | SEC-V08 |
| THREAT-012: Trust conflation | SEC-V09, SEC-V10 |

## Maintenance rules

1. Adding a new threat to `security-threat-model.md` requires adding a corresponding SEC-V entry.
2. Every SEC-V entry must have a runnable verification command.
3. `npm run verify:core` must pass before any security-doctrine PR merges.
4. Security verification tests must not be skipped in CI.
