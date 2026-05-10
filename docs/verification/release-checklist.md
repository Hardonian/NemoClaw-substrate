<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Release checklist

## Scope

This checklist gates the governed heterogeneous execution substrate integration checkpoint. It is for release-readiness closure only (no runtime feature expansion).

## Claim audit

- [x] No unsupported production-readiness claims.
- [x] No claims of implemented distributed execution.
- [x] No claims of implemented GPU balancing.
- [x] No claims of implemented Dynamo integration.
- [x] No claims of autonomous orchestration.
- [x] No claims of autonomous recovery behavior.
- [x] No claims of automatic policy learning.

## Status classification discipline

- [x] Architecture and roadmap pages classify work as implemented, scaffolded, opt-in, planned, or not implemented.
- [x] README reflects repository truth and release scope constraints.
- [x] CHANGELOG describes checkpoint truth without over-claiming.

## Verification gate

- [x] `npm run verify:release` passes.
- [x] `npm run verify:changelog-hygiene` passes.
- [x] `npm run verify:core` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `git diff --check` passes.

## CI gate

- [x] CI workflow invokes `npm run verify:release`.

## Packaging gate

- [x] No `package-lock.json` drift introduced.

## Residual matrix closure (2026-05-09)

- [x] Direct assertions added for replay drift rejection (policy/trust/candidate/degraded state mismatch reason-code failures).
- [x] Remote execution remains fail-closed before transport on deny, approval-required, trust denial, and stale/unhealthy worker states.
- [x] Telemetry registry update event branches (applied/skipped/conflict/stale) remain covered and replay-preserved.
- [x] Reserved event kinds (`replay_metadata`, `diagnostics_snapshot`) are documented as reserved and asserted as non-telemetry aggregates.
