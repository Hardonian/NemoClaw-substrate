<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Topology

## Policy Evaluation and Promotion Topology

```mermaid
flowchart TD
  Inbound[Input + Context] --> PolicyEngine[Policy Engine]
  PolicyEngine --> Trace[Policy Tracing]
  Trace --> Decision{Allowed?}
  Decision -- yes --> Routed[Governed Routing]
  Decision -- no --> Blocked[Fail-Closed Block]
  Routed --> Promotion[Supervised Policy Promotion]
  Promotion --> Registry[Registry Synchronization]
```

## Trust/Attestation Topology

```mermaid
flowchart LR
  Worker[Worker Identity] --> Trust[Worker Trust Evaluation]
  Device[Device Registry] --> Trust
  Trust --> Attest[Capability Attestation]
  Attest --> Gate{Trust threshold met?}
  Gate -- yes --> Execute[Execution eligible]
  Gate -- no --> Quarantine[Restricted / degraded path]
```
