<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Canonical Terminology Index

This index maps deprecated or drifting terminology to their canonical NemoClaw equivalents.

| Drifting / Deprecated Term | Canonical Term | Subsystem | Notes |
|----------------------------|----------------|-----------|-------|
| `evidence bundle`, `export bundle` | **Proofpack** | Export | Proofpacks contain evidence. |
| `task queue`, `lease manager` | **Queue / Lease** | Execution | Queue handles waiting; Lease handles active reservations. |
| `fallback`, `failover`, `fail-safe` | **Degraded State** | Control Plane | Avoid "self-healing" theatre; always surface degraded states explicitly. |
| `replay log`, `execution log` | **Replay Receipt** | Observability | Receipts are deterministic, tamper-evident records. |
| `trust decision` | **Authorization** | Policy Engine | Trust is evidence-based confidence; Authorization is binary policy. |
| `failure reason`, `error code` | **Reason Code** | Governance | Used to explicitly classify policy outcomes and degraded states. |
