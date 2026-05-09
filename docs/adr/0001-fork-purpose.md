<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0001: Fork Purpose
- Status: Proposed
## Context
The fork aims to evolve from sandbox orchestration baseline into local operator-grade AI governance with explicit trust semantics.
## Decision
Adopt deterministic governance, auditable control decisions, and explicit degraded truth as top-level architecture goals.
## Consequences
Design and delivery prioritize explainability and verification over opaque autonomy claims.
## Alternatives considered
Keep upstream orientation unchanged; rejected because it does not explicitly frame operator-governance architecture goals for this fork.
## Verification implications
Roadmap and architecture docs must separate current repo truth from planned capabilities and avoid implementation overclaims.
