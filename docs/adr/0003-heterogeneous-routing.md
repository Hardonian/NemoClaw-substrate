<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0003: Heterogeneous Routing

- Status: Proposed

## Context

Opaque or ad hoc routing weakens operator trust and reproducibility.

## Decision

Require deterministic scheduler behavior from explicit inputs with stable tie-break rules and explainable rationale.

## Consequences

Equivalent inputs should produce equivalent outcomes, enabling replay and incident forensics.

## Alternatives considered

Probabilistic or prompt-driven "best route" selection; rejected due to non-reproducibility.

## Verification implications

Add deterministic ordering/property tests and receipt assertions for candidate acceptance/rejection reasons.
