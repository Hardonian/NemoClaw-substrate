<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0002: Execution Lifecycle Substrate

- Status: Proposed

## Context

Current execution paths combine command orchestration with decision logic spread across modules.

## Decision

Introduce explicit control-plane contracts separated from execution-plane mechanics.

## Consequences

Routing/policy/approval decisions become testable and replayable independently of execution adapters.

## Alternatives considered

Continue embedding decisions inside command handlers; rejected due to poor auditability and high coupling.

## Verification implications

New tests should verify deterministic control decisions independently from sandbox command side effects.
