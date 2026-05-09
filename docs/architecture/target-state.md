<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Target-State Architecture

## Control-plane principles

- Deterministic scheduling decisions from explicit inputs.
- Policy enforcement as code with supervised promotion.
- Explicit degraded states with operator-visible reasons.
- Receipt/provenance emission for every material control decision.

## Target components

1. **Control-plane core**
   - canonical request envelope
   - deterministic decision function
   - policy-evaluation boundary
2. **Device registry**
   - machine + accelerator inventory
   - capability and health snapshots
   - routing eligibility flags
3. **Deterministic scheduler**
   - scored candidate selection based on registry + policy + request constraints
   - tie-break strategy with stable ordering
4. **Policy engine**
   - versioned policies
   - dry-run and supervised promote/rollback flow
5. **Receipts + degraded-state layer**
   - structured receipt output for each execution decision
   - typed degraded-state taxonomy and reason codes
6. **Operational memory**
   - append-only operator decisions and overrides
   - replayable history for recurrence handling
7. **Observability + hardening**
   - control-plane metrics and traceability
   - strict input validation and fail-closed behavior for sensitive paths

## Delivery guardrails

- No implicit model/provider fallback paths.
- No “unknown success” state.
- Every new control path must include verification hooks.
- Every policy change requires attributable promotion metadata.
