<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# System Topology

This page consolidates governed substrate topology for release-candidate review. It is documentation-only and does not change runtime behavior.

## Runtime Dispatch and Heterogeneous Routing Topology

```mermaid
flowchart TD
  CLI[nemoclaw CLI] --> Dispatch[Runtime Dispatch Integration]
  Dispatch --> Classify[Task Classification]
  Classify --> Policy[Policy Engine]
  Policy --> Route[Governed Provider Routing]
  Route --> Local[Local Runtime Probes]
  Route --> Remote[Remote Runtime Probes]
  Local --> Exec[Remote/Local Execution Adapter]
  Remote --> Exec
  Exec --> Receipts[Receipts + Degraded State]
  Receipts --> Replay[Replay Stream]
```

## Execution Plan and Queue/Lease Topology

```mermaid
flowchart LR
  Plan[Execution Plans] --> Queue[Execution Queue]
  Queue --> Lease[Lease Manager]
  Lease --> Govern[Execution Governance]
  Govern --> Run[Execution]
  Run --> Idem[Idempotency + Cancellation]
  Idem --> Receipt[Receipt Emission]
```

## Diagnostics and Degraded-State Topology

```mermaid
flowchart TD
  Probe[Worker/Runtime Probes] --> Obs[Observability]
  Obs --> Diag[Local + Dry-Run Diagnostics]
  Diag --> Gate{Healthy?}
  Gate -- yes --> Continue[Continue Path]
  Gate -- no --> Degraded[Degraded-State Record]
  Degraded --> FailClosed[Fail-Closed Policy Checkpoints]
  FailClosed --> Operator[Operator-visible Truth]
```
