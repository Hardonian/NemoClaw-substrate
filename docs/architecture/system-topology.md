<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# System Topology

This document maps the high-level system components and their interaction flows within the NemoClaw governed execution substrate.

## Runtime Dispatch Flow

The runtime dispatch flow separates control-plane decision logic from execution-plane mechanics.

```mermaid
graph TD
    User([User Request]) --> CLI[CLI Launcher / Plugin]
    CLI --> CP[Control Plane]
    
    subgraph Control Plane
        CP --> Policy[Policy Engine]
        CP --> Registry[Device Registry]
        Policy --> Sched[Deterministic Scheduler]
        Registry --> Sched
        Sched --> Decision[Control Decision]
    end
    
    Decision --> EP[Execution Plane]
    
    subgraph Execution Plane
        EP --> Local[Local Execution]
        EP --> Provider[Provider Dispatch]
        EP --> Remote[Remote Adapter]
    end
    
    EP --> Receipt[Receipt Generation]
    Receipt --> User
```

## Heterogeneous Routing Flow

Heterogeneous routing enables selection across diverse local and remote execution candidates.

```mermaid
sequenceDiagram
    participant R as Request
    participant Reg as Device Registry
    participant Pol as Policy Engine
    participant Sched as Scheduler
    participant E as Execution
    
    R->>Reg: Query available candidates
    Reg-->>Sched: Capability snapshots
    Sched->>Pol: Evaluate candidates against policy
    Pol-->>Sched: Allowed/Blocked/Approval-Required
    Sched->>Sched: Deterministic selection (tie-break)
    Sched->>E: Dispatch to selected candidate
    E-->>R: Execution outcome + Receipt
```

## Remote Execution Gate Flow

Remote execution is strictly gated by policy and explicit operator approval.

```mermaid
graph LR
    Decision[Remote Decision] --> P[Policy Check]
    P -- Deny --> Blocked[Blocked Path]
    P -- Allow --> Transport[Remote Transport]
    P -- Requires Approval --> Gate[Approval Gate]
    
    Gate -- Approved --> Transport
    Gate -- Rejected --> Blocked
    
    Transport --> Execution[Remote Execution]
    Execution --> Receipt[Evidence/Receipt]
```

## Telemetry Lifecycle

Telemetry is observed through explicit probes and maintained as non-authoritative evidence.

```mermaid
graph TD
    Probe[Manual/Triggered Probe] --> Evidence[Collected Evidence]
    Evidence --> Parser[Telemetry Parser]
    Parser --> Registry[Device Registry Update]
    Registry --> Event[Event Emission]
    
    Registry -.-> Sched[Scheduler Input]
```
