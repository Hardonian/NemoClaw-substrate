<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Transport Security

This document defines the transport security posture for all communication paths in the NemoClaw substrate.

## Transport inventory

| Transport | Status | Direction | Auth | Encryption |
|-----------|--------|-----------|------|------------|
| Local subprocess (runner) | Implemented | Host → child process | N/A (same-host) | N/A (same-host) |
| HTTP probe (remote) | Scaffolded (opt-in) | CLI → remote endpoint | Optional header token | TLS (when HTTPS) |
| SSH probe (remote) | Placeholder | CLI → remote host | Not implemented | Not implemented |
| Docker API | Implemented | CLI → Docker daemon | Unix socket / TCP | Host-local |
| OpenShell sandbox | Implemented | CLI → sandbox container | Provider credentials | Container boundary |

---

## Local subprocess transport

**Implementation:** `src/lib/runner.ts`

Security properties:
- **No shell interpretation.** All commands use `spawnSync(file, args)` with `shell: false`. The `shell: true` option throws at runtime. String commands are rejected.
- **Output redaction.** All piped stdout/stderr passes through `redact()` before reaching the operator terminal.
- **Error redaction.** Error objects (message, cmd, stdout, stderr, stack) are redacted via `redactError()`.
- **CWD isolation.** Commands execute with `cwd` set to the project root, not an arbitrary directory.
- **Environment forwarding.** Parent environment is forwarded with explicit overrides via `opts.env`. No implicit environment mutation.

Attack surface: An attacker who controls argv content can execute arbitrary binaries but cannot exploit shell metacharacters. The attack surface is limited to the set of binaries available on the host PATH.

---

## HTTP remote probe transport

**Implementation:** `src/lib/http-probe.ts`, `src/lib/control-plane/remote-runtime-probes.ts`

**Status:** Scaffolded; requires `NEMOCLAW_REMOTE_EXECUTION=1`.

Security properties:
- **SSRF protection.** Endpoint URLs are validated via `nemoclaw/src/blueprint/ssrf.ts:validateEndpointUrl()`:
  - Private hostnames (localhost, .local, .internal, link-local) are rejected before DNS lookup.
  - All DNS-resolved addresses are validated against private IP ranges.
  - DNS pinning replaces the hostname with the resolved IP to prevent TOCTOU rebinding.
  - Only `http:` and `https:` schemes are accepted.
- **Timeout ceiling.** HTTP probes enforce a configurable timeout (default 2000ms, max 10000ms, min 250ms) to prevent hanging connections.
- **Auth redaction.** Authentication headers in remote execution requests are redacted in receipts (`redactedAuth` field) before persistence or logging.
- **Response validation.** Non-2xx responses, malformed JSON, and non-`ok` status fields are classified as degraded/failed with explicit error codes.
- **No response trust.** Response content is treated as evidence, not authority (governance invariant INV-005).

**Not yet implemented:**
- Mutual TLS (mTLS) for transport-level authentication.
- Response content signing/verification.
- Certificate pinning for known endpoints.
- Connection pooling or keep-alive controls.

---

## SSH transport

**Implementation:** `src/lib/control-plane/remote-runtime-probes.ts` (placeholder)

**Status:** Not implemented.

The SSH transport seam exists as a typed placeholder. No SSH connections are established. No SSH keys are managed. The placeholder returns a `not_supported` status and emits a degraded state event.

When implemented, SSH transport must enforce:
- Key-based authentication only (no password auth).
- Known-hosts validation (no automatic host key acceptance).
- Command allowlisting (no arbitrary remote shell access).
- Output redaction through the same `redact()` pipeline.
- Timeout enforcement.

---

## Docker API transport

**Implementation:** `src/lib/runner.ts` (docker host detection), `src/lib/platform.ts`

Security properties:
- Docker host is auto-detected from environment (`DOCKER_HOST`) or platform defaults.
- Docker commands are executed via the same argv-based runner with shell safety.
- Sandbox containers are created with capability drops and process limits defined in the blueprint.
- No direct Docker API HTTP calls are made; all interaction is via the Docker CLI.

---

## OpenShell sandbox transport

**Implementation:** Managed by OpenShell runtime.

Security properties:
- Credentials are injected via OpenShell's provider credential mechanism at runtime.
- Credentials are never baked into container images or persistent filesystems.
- Network egress is controlled by policy presets (`nemoclaw-blueprint/policies/`).
- Container capabilities are restricted per the blueprint definition.

---

## Transport security invariants

1. **No plaintext credentials in transit logs.** All transports redact auth material before logging or receipt emission.
2. **No implicit remote transport.** Remote transports (HTTP, SSH) require explicit opt-in flags.
3. **No shell interpretation in any transport.** All command execution paths use argv arrays.
4. **No trusted remote responses.** All remote responses are evidence; none are authoritative.
5. **Timeouts are mandatory.** No transport may block indefinitely.
