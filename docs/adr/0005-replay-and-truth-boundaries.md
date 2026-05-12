<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0005: Replay & Truth Boundaries

- Status: Accepted

## Context

Operators need evidence trails and explicit degraded semantics to trust outcomes.

## Decision

Make structured execution receipts and degraded-state reason codes mandatory control-path artifacts.

The execution lifecycle substrate extends this decision to plan, queue, lease, replay, proofpack, and diagnostics records. Each governed transition must produce explicit state and reason-code evidence when it is represented in a lifecycle proofpack.

## Consequences

Audits, replay, and incident diagnosis can rely on explicit machine-readable evidence.

The substrate must reject hidden recovery, hidden retry, replay drift, receipt mismatch, lease mismatch, ownership mismatch, trust drift, governance metadata loss, and degraded states without reasons.

## Alternatives considered

Best-effort logs without receipt schema; rejected as insufficient for trust and replayability.

## Verification implications

Control-path tests must assert receipt generation and degraded-state taxonomy correctness.

`npm run verify:execution-lifecycle` validates deterministic lifecycle receipts, proofpack integrity, replay lineage, and degraded-state propagation. `npm run verify:chaos` includes these lifecycle assertions alongside degraded-state chaos coverage.
