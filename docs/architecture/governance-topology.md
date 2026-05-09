<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Topology

This document details the governance-specific flows for replay, evidence, and trust within the substrate.

## Replay Validation Lifecycle

Replay ensures that past control-plane decisions remain deterministic and consistent with current policy.

```mermaid
graph TD
    Receipt[Original Receipt] --> Replay[Replay Engine]
    Envelope[Governance Envelope] --> Replay
    CurrentPolicy[Current Policy] --> Replay
    
    Replay --> Sim[Simulated Decision]
    Sim --> Compare{Compare Decisions}
    
    Compare -- Matches --> Success[Validation Success]
    Compare -- Drift Detected --> Rejection[Drift Rejection]
    
    Rejection --> Audit[Audit Log / Alert]
```

## Evidence/Export Lifecycle

Every control decision generates a verifiable evidence trail for auditing and forensics.

```mermaid
sequenceDiagram
    participant CP as Control Plane
    participant EP as Execution Plane
    participant S as Storage (Append-only)
    participant Op as Operator/Auditor
    
    CP->>EP: Dispatch
    EP->>EP: Execute
    EP->>CP: Result + Evidence
    CP->>CP: Generate Receipt
    CP->>S: Persist Receipt (Hashed)
    CP->>S: Persist Telemetry Snapshot
    
    Op->>S: Request Export
    S-->>Op: Verifiable Evidence Bundle
```

## Trust/Attestation Lifecycle

Trust is earned through evidence and explicit operator approval; self-reported claims are treated as unverified.

```mermaid
graph TD
    Claim[Self-Reported Claim] --> Evidence[Probe-Observed Evidence]
    Evidence --> Evaluation[Trust Evaluation]
    
    Evaluation -- Low Confidence --> Unverified[Unverified State]
    Evaluation -- High Confidence --> Approval[Operator Approval Required]
    
    Approval -- Approved --> Trusted[Governed Trust Elevation]
    Approval -- Denied --> Blocked[Blocked Path]
    
    Trusted --> Attestation[Cryptographic Attestation (Planned)]
```
