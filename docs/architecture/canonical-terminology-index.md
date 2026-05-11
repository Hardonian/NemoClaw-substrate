<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Canonical Terminology Index

This index maps deprecated or drifting terminology to their canonical NemoClaw equivalents.

| Drifting / Deprecated Term | Canonical Term | Subsystem | Notes |
|----------------------------|----------------|-----------|-------|
<!-- markdownlint-disable anti-theatre-terms -->
| `evidence bundle`, `export bundle` | **Proofpack** | Export | Proofpacks contain evidence. |
| `task queue`, `lease manager` | **Queue / Lease** | Execution | Queue handles waiting; Lease handles active reservations. |
| `autonomous failover`, `auto-recover` | **Degraded State** | Execution | Failure semantics require operator judgment. |
| `fallback`, `failover`, `fail-safe` | **Degraded State** | Control Plane | Avoid "self-healing" theatre; always surface degraded states explicitly. |
| `hidden rule`, `implicit policy` | **Explicit Policy** | Governance | All routing is explicitly governed. |
| `trust decision` | **Authorization** | Policy Engine | Trust is evidence-based confidence; Authorization is binary policy. |
| `orchestrate`, `seamless`, `automatic` | **Coordinate / Deterministic** | Actions / CLI | Avoid theatre; focus on explicit coordination. |
| `auto-fix`, `auto-detect`, `auto-healing` | **Remediation / Discovery** | Onboard | Use "Remediation" for manual/semi-auto fixes; "Discovery" for probes. |
| `fallback`, `failover` | **Degraded State** | Routing | Explicitly acknowledge the state rather than implying hidden magic. |
| `background`, `daemon` | **Detached / Long-lived** | Execution | Be explicit about the lifecycle (e.g. "Detached Timer"). |
<!-- markdownlint-enable anti-theatre-terms -->

| `failure reason`, `error code` | **Reason Code** | Governance | Used to explicitly classify policy outcomes and degraded states. |
