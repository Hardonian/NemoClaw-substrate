<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Policy Model

This document defines the security policy concepts enforced by the NemoClaw substrate. Policies are the operator's expressed intent; no other subsystem can override them (governance invariant INV-017).

## Policy evaluation pipeline

All execution authorization follows a deterministic pipeline. No step may be skipped.

```text
Request → Flag Gate → Policy Evaluation → Approval Gate → Trust/Attestation Check → Transport
   │          │              │                  │                    │                    │
   │          │              │                  │                    │                    └─ Execute
   │          │              │                  │                    └─ BLOCK (revoked/expired/conflict)
   │          │              │                  └─ BLOCK (approval_required, not approved)
   │          │              └─ BLOCK (policy denied)
   │          └─ BLOCK (flag disabled)
   └─ Validate request shape
```

Each gate emits a deterministic reason code on rejection. No silent fallthrough.

---

## Policy concepts

### NetworkPolicy

**Status:** Implemented (sandbox egress)  
**Scope:** Controls which external endpoints the sandbox can reach.

Defined in `nemoclaw-blueprint/policies/` as YAML presets. Each preset specifies allowed egress domains. The operator selects which presets apply during onboarding. Unlisted endpoints are denied (deny-by-default).

SSRF protection (`nemoclaw/src/blueprint/ssrf.ts`) supplements the network policy with DNS-pinning and private-IP blocking for any endpoint URL validation.

### CommandExecutionPolicy

**Status:** Implemented  
**Scope:** Governs how subprocess commands are executed.

Hard constraints (not configurable — always enforced):
- Commands must be `argv` arrays. String commands are rejected.
- `shell: true` is forbidden and throws at runtime.
- All subprocess output is redacted before terminal emission.

These constraints are structural (enforced in `src/lib/runner.ts`) and cannot be overridden by policy configuration.

### RemoteExecutionPolicy

**Status:** Scaffolded (opt-in via `NEMOCLAW_REMOTE_EXECUTION=1`)  
**Scope:** Controls whether execution may cross trust boundaries to remote workers.

Policy evaluation chain (implemented in `src/lib/control-plane/remote-execution.ts`):
1. **Flag gate:** Disabled unless `NEMOCLAW_REMOTE_EXECUTION=1`.
2. **Policy evaluation:** `evaluatePolicy()` from `src/lib/control-plane/governance.ts` determines allow/deny/approval_required.
3. **Approval gate:** If `approval_required`, explicit operator approval must be present.
4. **Execution plan validation:** If `executionPlanRequired`, a valid execution plan with matching intent hash, policy snapshot hash, and trust snapshot hash must be provided.
5. **Node health/trust check:** Revoked trust, expired attestation, conflict-detected attestation, unhealthy nodes all block execution.
6. **Endpoint validation:** Target URL must be valid HTTP(S).

### CredentialPolicy

**Status:** Implemented  
**Scope:** Controls credential handling across persistence boundaries.

Rules (enforced in `src/lib/security/credential-filter.ts`):
- Credential fields are stripped from config files during migration and backup.
- Sensitive files (`auth-profiles.json`, `auth.json`) are excluded from backups entirely.
- Config files written after sanitization have permissions set to `0o600`.
- `gateway` sections (containing runtime auth tokens) are removed during sanitization.
- Credentials are injected at runtime via OpenShell's provider mechanism, never persisted to disk.

### SecretRedactionPolicy

**Status:** Implemented  
**Scope:** Controls how secrets appear in operator-visible outputs.

Three redaction tiers (implemented in `src/lib/security/redact.ts`):

| Tier | Function | Behavior | Consumer |
|------|----------|----------|----------|
| Partial | `redact()` | Keep first 4 chars, mask remainder | Runner CLI output |
| Full | `redactFull()` | Replace entire match with `<REDACTED>` | Diagnostic dumps |
| Sensitive | `redactSensitiveText()` | Full replacement + 240-char truncation | Onboard session logs |

All tiers source patterns from `src/lib/security/secret-patterns.ts`.

### MemoryWritePolicy

**Status:** Implemented  
**Scope:** Controls what content may be written to persistent workspace memory.

Rules (enforced in `nemoclaw/src/security/secret-scanner.ts`):
- All writes targeting memory paths are scanned for high-confidence secret patterns.
- 14 protected path segments are monitored (`.openclaw/memory/`, `.openclaw/credentials/`, `.nemoclaw/`, etc.).
- Detected secrets are reported with redacted snippets; writes may be blocked.

---

## Policy decision types

Policy decisions use a structured type from `src/lib/control-plane/types.ts`:

```typescript
interface PolicyDecision {
  allowed: boolean;
  requiredApproval: boolean;
  reasons: Array<{
    code: string;         // Deterministic reason code
    explanation: string;  // Human-readable explanation
    source: string;       // Source rule identifier
  }>;
}
```

Every policy decision carries reason codes. No policy decision is emitted without an explanation. This is enforced by governance invariant INV-009.

---

## Policy defaults

All policies follow deny-by-default:

| Policy | Default state | Override mechanism |
|--------|--------------|-------------------|
| Remote execution | Disabled | `NEMOCLAW_REMOTE_EXECUTION=1` |
| Governed routing | Disabled | `NEMOCLAW_GOVERNED_ROUTING=1` |
| Heterogeneous routing | Disabled | `NEMOCLAW_HETEROGENEOUS_ROUTING=1` |
| Shell interpretation | Forbidden | None (structural; cannot be overridden) |
| Network egress | Deny-by-default | Preset selection during onboarding |
| Secret redaction | Always on | None (structural; cannot be disabled) |
| Credential stripping | Always on | None (structural; cannot be disabled) |
| Memory write scanning | Always on | None (structural; cannot be disabled) |
