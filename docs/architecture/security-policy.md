<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Policy Contracts

NemoClaw defines a first concrete security policy substrate in `src/lib/security/security-policy.ts`.
The contracts are deterministic helpers, not orchestration primitives.
They do not add queues, daemons, retries, GPU balancing, Dynamo integration, autonomous behavior, or default remote execution.

The policy surface includes:

- `SecurityPolicy`
- `NetworkPolicy`
- `TransportPolicy`
- `CommandExecutionPolicy`
- `SecretRedactionPolicy`
- `ProofpackExportPolicy`
- `SecurityDecision`
- `SecurityReasonCode`

Every decision is explicit and reason-coded.
Denied transport and command paths fail before fetch, process spawn, or remote transport calls.
The default runtime posture is preserved: remote execution remains disabled unless the existing explicit feature flag and governance checks allow it.

## Guard Boundaries

The security policy substrate is wired into:

- remote HTTP runtime probes
- guarded remote execution transport seam
- local probe URL validation
- command descriptor validation for local probe command execution
- operational memory event payload redaction
- diagnostics redaction through the shared redactor
- proofpack/export preflight helpers

The helpers are intentionally reusable so future export or proofpack adapters can call the same preflight before writing evidence.
Secret-bearing proofpack/export payloads are blocked by policy instead of silently exported.
