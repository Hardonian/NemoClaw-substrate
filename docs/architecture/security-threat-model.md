<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Threat Model

This document catalogs the security threats relevant to the NemoClaw governed execution substrate. Each threat is grounded in implemented code paths and maps to concrete enforcement points. Status reflects repository truth as of this writing.

## Status taxonomy

- **Mitigated:** enforced in code with test coverage.
- **Partially mitigated:** enforcement exists but gaps remain.
- **Scaffolded:** defensive seam exists; enforcement is partial or opt-in.
- **Not yet applicable:** requires infrastructure not yet implemented.

---

## THREAT-001: Credential leakage via CLI output

**Category:** Secret exposure
**Status:** Mitigated
**Attack vector:** API keys, tokens, or passwords embedded in subprocess stdout/stderr leak to the operator terminal or diagnostic logs.

**Enforcement:**

- `src/lib/security/redact.ts` — All subprocess output passes through `redact()` before terminal emission. Partial redaction (first 4 chars preserved) for CLI output; full replacement via `redactFull()` for diagnostic dumps.
- `src/lib/security/secret-patterns.ts` — Canonical regex patterns for NVIDIA, OpenAI, GitHub, Slack, AWS, HuggingFace, GitLab, Groq, PyPI, Telegram, and Discord tokens. Single source of truth; adding a new token class means updating this file only.
- `src/lib/runner.ts:spawnAndHandle()` — `writeRedactedResult()` is called unconditionally on piped stdout/stderr before process output reaches the terminal.
- `src/lib/security/redact.ts:redactError()` — Error objects (message, cmd, stdout, stderr, output array, stack trace) are redacted before surfacing.

**Known limitations:**

- Secrets encoded as base64 or hex are not detected by regex patterns.
- Secrets split across multiple output lines may evade per-line pattern matching.
- Shell `sed` fallback in `debug.sh` covers only `EXPECTED_SHELL_PREFIXES` (nvapi-, nvcf-, ghp_, sk-) when Node.js is unavailable.

**Verification:** `npx vitest run src/lib/security/redact.test.ts`, `npx vitest run src/lib/runner-argv.test.ts`

---

## THREAT-002: Credential persistence in config files

**Category:** Secret exposure
**Status:** Mitigated
**Attack vector:** API keys baked into sandbox filesystem or local backup archives survive beyond their intended runtime scope.

**Enforcement:**

- `src/lib/security/credential-filter.ts:stripCredentials()` — Recursively replaces values for credential-bearing field names (`apiKey`, `api_key`, `token`, `secret`, `password`, `resolvedKey`, plus pattern-based `*Token`, `*Key`, `*Secret`, `*Password` suffixes) with `[STRIPPED_BY_MIGRATION]`.
- `src/lib/security/credential-filter.ts:sanitizeConfigFile()` — Strips credentials from JSON config files in-place, removes `gateway` section (contains auth tokens), and sets file permissions to `0o600`.
- `src/lib/security/credential-filter.ts:isSensitiveFile()` — Blocks `auth-profiles.json` and `auth.json` from backup entirely.
- Credentials are injected at runtime via OpenShell's provider credential mechanism, never persisted to disk.

**Known limitations:**

- YAML config files (e.g. Hermes) are skipped if not valid JSON; YAML-specific credential stripping is not implemented.
- Non-standard credential field names outside the pattern set will pass through.

**Verification:** `npx vitest run src/lib/security/credential-filter.test.ts`

---

## THREAT-003: Credential leakage via URLs

**Category:** Secret exposure
**Status:** Mitigated
**Attack vector:** Tokens embedded in URL query parameters, userinfo, or path segments leak through logging or diagnostic output.

**Enforcement:**

- `src/lib/security/redact.ts:redactUrlPartial()` — Replaces URL username/password with `****`; replaces query parameters matching `signature|sig|token|auth|access_token` with `****`.
- `src/lib/security/redact.ts:redactUrl()` — Full URL sanitization: strips userinfo, redacts sensitive query params, removes hash fragment.
- URL redaction runs as part of the `redact()` pipeline before any token-prefix pattern matching.

**Known limitations:**

- Tokens embedded in URL path segments (not query params) are only caught if they match a token-prefix pattern.
- Custom parameter names not matching the `signature|sig|token|auth|access_token` pattern are not redacted.

---

## THREAT-004: Secret persistence in workspace memory writes

**Category:** Secret exposure
**Status:** Mitigated
**Attack vector:** An agent writes an API key or credential into a persistent memory file (MEMORY.md, workspace files, agent skills), where it survives across sessions.

**Enforcement:**

- `nemoclaw/src/security/secret-scanner.ts:scanForSecrets()` — Regex-based scanner covering NVIDIA, OpenAI, GitHub, AWS, Slack, Discord, npm, PEM private keys, Bearer tokens, Telegram, Google, Anthropic, and HuggingFace patterns.
- `nemoclaw/src/security/secret-scanner.ts:isMemoryPath()` — Identifies memory write targets across `.openclaw/memory/`, `.openclaw/workspace/`, `.openclaw/credentials/`, `.nemoclaw/`, and 10 other protected path segments.
- Scanner is invoked on tool call content before persistence to memory paths.

**Known limitations:**

- Base64-encoded, hex-encoded, and split-across-writes secrets are not detectable by regex alone. This is an inherent limitation documented in code.
- Scanner targets high-confidence patterns; novel token formats require explicit pattern additions.

**Verification:** `npx vitest run nemoclaw/src/security/secret-scanner.test.ts`

---

## THREAT-005: Command injection via shell interpretation

**Category:** Command execution safety
**Status:** Mitigated
**Attack vector:** An attacker crafts input containing shell metacharacters (`$(whoami)`, `&& rm -rf /`, backtick expansion) that are interpreted if commands are executed via shell.

**Enforcement:**

- `src/lib/runner.ts` — All command execution uses `spawnSync(file, args, { shell: false })` with argv arrays. String commands are rejected with an explicit error.
- `src/lib/runner.ts` — `shell: true` is explicitly forbidden and throws `shell option is forbidden` on any attempt.
- Arguments containing `$()`, `&&`, backticks, pipes are passed as literal strings to the subprocess, not interpreted.

**Test coverage:**

- `src/lib/runner-argv.test.ts` — Verifies: empty argv rejection, `shell: true` rejection, string command rejection, shell metacharacter non-expansion, ENOENT surfacing.

**Verification:** `npx vitest run src/lib/runner-argv.test.ts`

---

## THREAT-006: SSRF via DNS rebinding (TOCTOU)

**Category:** Network safety
**Status:** Mitigated
**Attack vector:** An attacker controls a DNS record that returns a public IP at validation time and a private/internal IP at connection time, bypassing the private-IP check.

**Enforcement:**

- `nemoclaw/src/blueprint/ssrf.ts:validateEndpointUrl()` — Performs DNS lookup, validates all resolved addresses against private IP ranges, then pins the URL to the first resolved IP address. The pinned URL is used for HTTP connections, preventing rebinding between validation and connection.
- `nemoclaw/src/blueprint/ssrf.ts` — Blocks private hostnames (localhost, `.local`, `.internal`, link-local) before DNS lookup.
- Only `http:` and `https:` schemes are allowed; all others are rejected.
- For HTTPS endpoints, TLS certificate validation provides additional rebinding protection since the attacker cannot present a valid certificate for the rebinding target.

**Known limitations:**

- DNS pinning is bypassed for already-IP URLs (no rebinding risk for literal IPs).
- IPv6 zone IDs and exotic address formats may need additional coverage.

**Verification:** `npx vitest run nemoclaw/src/blueprint/ssrf.test.ts`

---

## THREAT-007: Malicious or compromised remote worker

**Category:** Transport/trust boundary
**Status:** Scaffolded
**Attack vector:** A remote worker endpoint returns forged execution results, manipulated telemetry, or exfiltrates command payloads.

**Enforcement (current):**

- Remote execution is disabled by default. Requires explicit `NEMOCLAW_REMOTE_EXECUTION=1` flag.
- `src/lib/control-plane/remote-execution.ts:runRemoteExecution()` — Policy evaluation precedes any transport call. Policy can `deny`, require `approval`, or allow execution.
- Worker trust level and attestation status are checked before transport: revoked trust, expired attestation, and conflict-detected attestation all block execution.
- Auth credentials in remote execution requests are redacted in receipts (`redactedAuth` field).
- Response validation: non-2xx status, malformed JSON, and non-`ok` status are all classified as degraded/failed states with explicit reason codes.

**Not yet implemented:**

- Cryptographic response signing/verification.
- Mutual TLS for transport authentication.
- Response content integrity validation beyond JSON structure.

---

## THREAT-008: Forged telemetry injection

**Category:** Observability integrity
**Status:** Partially mitigated
**Attack vector:** An attacker injects fabricated telemetry data (fake GPU counts, false health status) to influence operational intelligence or mislead operators.

**Enforcement (current):**

- Governance invariant INV-002: Telemetry is evidence only, never authoritative for execution decisions.
- Governance invariant INV-005: Probe results update registry evidence, not authorization state.
- `src/lib/control-plane/operational-intelligence.ts` — Telemetry aggregation outputs are non-authoritative.
- Policy decisions are independent of telemetry state.

**Residual risk:**

- Telemetry data is accepted without cryptographic provenance verification.
- Operator dashboards display unverified telemetry as evidence, which could mislead human decision-making even though it cannot drive automated execution.

---

## THREAT-009: Replay envelope tampering

**Category:** Audit integrity
**Status:** Mitigated
**Attack vector:** An attacker modifies exported replay envelopes (event payloads, sequence numbers, lineage references) to forge execution history.

**Enforcement:**

- `src/lib/control-plane/replay.ts:validateReplayEnvelope()` — Validates event count, sequence continuity, governance lineage presence, reason codes, and digest integrity.
- Digest is computed from deterministic serialization of sorted events. Any modification to event content invalidates the digest.
- Missing replay lineage (`replayRef.lineage`) is rejected explicitly.
- Missing governance reason codes on `degraded_state`, `fallback`, and `policy_outcome` events are rejected.
- `src/lib/control-plane/replay.ts:validateExecutionReplayGovernance()` — Validates execution plan lineage, approval lineage, authorization lineage, policy snapshot hashes, trust snapshot hashes, and intent hashes.

**Verification:** `npx vitest run src/lib/control-plane/replay.test.ts`, `npm run verify:chaos`

---

## THREAT-010: Remote execution without operator consent

**Category:** Authorization boundary
**Status:** Mitigated
**Attack vector:** A local command silently dispatches execution to a remote worker without the operator being aware of the trust boundary crossing.

**Enforcement:**

- Governance invariant INV-010: Remote execution requires explicit `NEMOCLAW_REMOTE_EXECUTION=1`.
- Governance invariant INV-011: Operator approval is explicit, per-request, never inferred from prior approvals.
- `src/lib/control-plane/remote-execution.ts` — Four-gate sequence: (1) flag check, (2) policy evaluation, (3) approval verification, (4) trust/attestation validation. Failure at any gate blocks transport.
- When `executionPlanRequired` is set, execution without a valid plan is rejected as `authorization_denied`.
- Execution plan authorization validates intent hash, policy snapshot hash, and trust snapshot hash against current state; drift triggers rejection.

**Verification:** `npm run verify:chaos` (approval-required blocking tests, trust-gating tests)

---

## THREAT-011: Proofpack / export integrity compromise

**Category:** Evidence integrity
**Status:** Partially mitigated
**Attack vector:** Exported proofpacks (receipts, plans, telemetry) are modified after export, creating a false audit trail.

**Enforcement (current):**

- Replay envelopes include deterministic digests computed from sorted, serialized events.
- Governance invariant INV-018: Receipts are deterministically serialized with stable identifiers.
- `src/lib/control-plane/serde.ts` — Deterministic serialization ensures identical inputs produce identical digests.

**Not yet implemented:**

- Cryptographic signing of proofpacks (planned).
- Chain-of-custody envelope wrapping.
- External timestamping service integration.

---

## THREAT-012: Unauthorized privilege escalation via trust conflation

**Category:** Authorization boundary
**Status:** Mitigated
**Attack vector:** A worker with high trust (based on telemetry or self-reported claims) bypasses policy evaluation to execute unauthorized work.

**Enforcement:**

- Governance invariant INV-003: Trust is not authorization. Trust level is a classification signal; authorization requires explicit policy evaluation and operator approval.
- Governance invariant INV-004: Attestation is not trust. Valid attestation proves provenance, not truthfulness.
- `src/lib/control-plane/types.ts` — `TrustLevel` and `AttestationStatus` are structurally separate from `PolicyDecision`.
- Policy gating precedes transport regardless of trust level in `remote-execution.ts`.

**Verification:** `npm run verify:chaos` (trust-gating tests)
