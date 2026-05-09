<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local-Stack Security Profiles

This document defines the trust boundaries, security profiles, and worker classification for the NemoClaw local execution stack.

## Trust boundary model

```text
┌─────────────────────────────────────────────────────────┐
│  Operator Host (trusted)                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  NemoClaw CLI (src/lib/)                          │  │
│  │  - Command execution (runner.ts)                  │  │
│  │  - Secret redaction (security/redact.ts)          │  │
│  │  - Credential filtering (security/credential-*)   │  │
│  │  - Control plane (control-plane/)                 │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │ Docker API / CLI                  │
│  ┌───────────────────▼───────────────────────────────┐  │
│  │  OpenShell Sandbox (container boundary)           │  │
│  │  - Network egress controlled by policy presets    │  │
│  │  - Capability drops per blueprint                 │  │
│  │  - Process limits enforced                        │  │
│  │  - Credentials injected at runtime (not persisted)│  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  OpenClaw Agent (agent boundary)            │  │  │
│  │  │  - Memory write scanning (secret-scanner)   │  │  │
│  │  │  - Tool call interception                   │  │  │
│  │  │  - SSRF validation on endpoint access       │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                      │ (opt-in only)                     │
│  ┌───────────────────▼───────────────────────────────┐  │
│  │  Remote Worker (untrusted by default)             │  │
│  │  - Requires NEMOCLAW_REMOTE_EXECUTION=1           │  │
│  │  - Policy evaluation before transport             │  │
│  │  - Operator approval required                     │  │
│  │  - Trust/attestation validation                   │  │
│  │  - Response treated as evidence, not authority     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Security profiles

### Profile: Local-only (default)

**Flag requirements:** None (default state).

| Property | Value |
|----------|-------|
| Remote execution | Disabled |
| Governed routing | Disabled |
| Heterogeneous routing | Disabled |
| Network egress | Controlled by sandbox policy presets |
| Command execution | argv-only, shell forbidden |
| Secret redaction | Always on (all tiers) |
| Memory scanning | Always on |
| Credential persistence | Stripped from configs, injected at runtime |

**Trust assumptions:**
- Operator host is trusted.
- Sandbox container is partially trusted (capability-restricted).
- Agent code runs with sandbox-level isolation.
- No external trust boundaries are crossed.

### Profile: Remote-enabled (opt-in)

**Flag requirements:** `NEMOCLAW_REMOTE_EXECUTION=1`

Adds to local-only profile:

| Property | Value |
|----------|-------|
| Remote execution | Enabled; policy-gated |
| Worker trust | Requires `trusted_remote` or `trusted_local` trust level |
| Worker attestation | Expired, revoked, or conflicted attestation blocks execution |
| Operator approval | Required for `approval_required` policy decisions |
| Execution plans | Optional but enforced when `executionPlanRequired` is set |
| Response integrity | Validated (JSON structure, status code); content not signed |

**Trust assumptions:**
- Remote workers are untrusted by default.
- Trust is a classification signal, not authorization (INV-003).
- Attestation is not trust (INV-004).
- Probe results are evidence, not authority (INV-005).

### Profile: Governed routing (opt-in)

**Flag requirements:** `NEMOCLAW_GOVERNED_ROUTING=1` (may also require `NEMOCLAW_HETEROGENEOUS_ROUTING=1`)

Adds to remote-enabled profile:

| Property | Value |
|----------|-------|
| Routing decisions | Policy-evaluated, receipt-emitting |
| Fallback paths | Explicit records with reason codes (INV-006) |
| Candidate selection | Policy-constrained, not telemetry-driven |
| Diagnostics | Read-only; no runtime mutation (INV-007) |
| Operational memory | Append-only; supervised proposals only (INV-016) |

---

## Worker classification

Workers are classified by trust level and attestation status. These are independent dimensions (INV-003, INV-004).

### Trust levels

| Level | Meaning | Authorization effect |
|-------|---------|---------------------|
| `trusted_local` | Operator's own host | Policy evaluation still required |
| `trusted_remote` | Operator-attested remote worker | Policy evaluation still required |
| `unverified` | No trust assertion | Remote execution blocked |
| `revoked` | Trust explicitly revoked | Remote execution blocked |

Trust level is a classification signal. It does not bypass policy evaluation. A `trusted_remote` worker with a `deny` policy decision is still blocked.

### Attestation status

| Status | Meaning | Effect |
|--------|---------|--------|
| `valid` | Attestation current | No block |
| `pending` | Attestation not yet evaluated | No block (evidence-only) |
| `unverified` | No attestation data | No block (evidence-only) |
| `expired` | Attestation has expired | Remote execution blocked |
| `revoked` | Attestation explicitly revoked | Remote execution blocked |
| `conflict_detected` | Conflicting attestation claims | Remote execution blocked |

Attestation status is independent of trust level. A `trusted_remote` worker with `expired` attestation is blocked.

---

## Boundary crossing rules

### Host → Sandbox

- Credentials are injected via OpenShell provider mechanism, not written to filesystem.
- Config files are sanitized via `credential-filter.ts` before any filesystem persistence.
- Sensitive files are excluded from backup entirely.

### Sandbox → External network

- Egress is controlled by policy presets in `nemoclaw-blueprint/policies/`.
- Deny-by-default: only explicitly listed domains are reachable.
- Endpoint URLs validated against SSRF protections before access.

### CLI → Remote worker (opt-in only)

- Four-gate authorization: flag → policy → approval → trust/attestation.
- Auth credentials are redacted in receipts before persistence.
- Responses are validated for structure but treated as evidence.
- All results emit receipts with governance lineage for replay integrity.

### Agent → Persistent memory

- All writes to memory paths are scanned for secrets.
- 14 protected path segments are monitored.
- Detected secrets are reported; writes may be blocked.

---

## Not implemented

The following security features are planned but not yet implemented:

| Feature | Status | Prerequisite |
|---------|--------|-------------|
| Mutual TLS for remote transport | Planned | Remote execution stabilization |
| Cryptographic response signing | Planned | Worker identity framework |
| Certificate pinning | Planned | Endpoint registry |
| Hardware attestation | Planned | Trusted execution environment |
| Distributed policy synchronization | Planned | Multi-node orchestration |
| Cryptographic attestation verification | Planned | PKI infrastructure |
| YAML credential stripping | Planned | Hermes config standardization |

These must not be claimed as implemented until code and test coverage exist.
