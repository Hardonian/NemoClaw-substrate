<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# ADR 0006: Trust And Attestation Before Remote Execution

- Status: Accepted for structural trust modeling

## Context

Remote execution needs more than an endpoint URL. A worker can be stale, untrusted, revoked, expired, or conflicted. Attestation can prove provenance without proving that the worker is safe for a specific action.

## Decision

Worker trust and attestation are explicit fields in node descriptors and remote execution decisions. Remote transport must be blocked when trust, health, approval, policy, or command safety checks fail.

## Why We Did Not Treat Attestation As Trust

Attestation and authorization answer different questions. Collapsing them would make an expired or conflicted worker look safe if it had once produced a plausible claim.

## Consequences

Remote execution setup is more verbose. The benefit is that blocked paths are visible and testable before transport occurs.

## Implementation Links

- `src/lib/control-plane/worker-trust.ts`
- `src/lib/control-plane/worker-probes.ts`
- `src/lib/control-plane/device-registry.ts`
- `src/lib/control-plane/remote-execution.ts`
- `src/lib/control-plane/remote-execution.test.ts`

## Verification

- `npm run verify:remote-probes`
- `npm run verify:chaos`
