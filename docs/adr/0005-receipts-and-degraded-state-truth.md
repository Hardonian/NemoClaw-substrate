<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0005: Receipts And Degraded-State Truth

- Status: Proposed

## Context

Operators need evidence trails and explicit degraded semantics to trust outcomes.

## Decision

Make structured execution receipts and degraded-state reason codes mandatory control-path artifacts.

## Consequences

Audits, replay, and incident diagnosis can rely on explicit machine-readable evidence.

## Alternatives considered

Best-effort logs without receipt schema; rejected as insufficient for trust and replayability.

## Verification implications

Control-path tests must assert receipt generation and degraded-state taxonomy correctness.
