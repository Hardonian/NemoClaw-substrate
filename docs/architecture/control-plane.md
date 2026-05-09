<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Control plane foundation

## Purpose
Define deterministic, replayable control-plane contracts without rewriting current runtime behavior.

## Current implementation status
- **Implemented:** canonical contracts in `src/lib/control-plane/types.ts`, deterministic serialization, validation helpers, and registry seams.
- **Scaffolded:** scheduling and policy decision object shapes only.
- **Planned:** policy engine, deterministic scheduler, full runtime receipt wiring.
- **Future adapter work:** orchestration and telemetry adapters.

## Implemented contracts
`ControlRequestEnvelope`, `ControlDecision`, `ControlDecisionReason`, `SchedulingDecision`, `SchedulingCandidate`, `PolicyDecision`, `PolicyDecisionReason`, `ExecutionReceipt`, `ExecutionPhase`, `DegradedState`, `CapabilitySnapshot`, `NodeDescriptor`.

## Future integration points
- Runner/provider selection logic
- Shields/policy checks
- Diagnostics/audit export

## Known limitations
No autonomous scheduling or policy enforcement is implemented in this phase.

## Replayability and degraded semantics
All contracts require explicit timestamps, version fields, and machine-readable reason codes.

## Verification expectations
Contract serialization/order tests must remain deterministic.

## Non-goals
No hidden fallbacks, no dynamic routing, no autonomous governance.

## Open questions
Receipt persistence destination and replay CLI UX.

## Upstream concept alignment
Terminology reuses upstream concepts: provider, runner, state, audit, diagnostics, registry, shields.


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.
