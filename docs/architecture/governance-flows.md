<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Flows

This document details the control-plane decision logic and the explicit handling of blocked or degraded execution paths.

## Policy Evaluation and Approval Gating

Policy is the primary gate for all execution decisions. There is no hidden fallback to "allow" if a policy check fails.

```mermaid
graph TD
    Request[Execution Request] --> Policy[Policy Engine]
    
    Policy --> Evaluate{Evaluate Policy}
    
    Evaluate -- Deny --> Blocked[Blocked Path: Error + Event]
    Evaluate -- Allow --> Sched[Scheduler]
    Evaluate -- Approval Required --> Gate[Approval Gate]
    
    Gate -- Approved --> Sched
    Gate -- Rejected --> Blocked
    
    Blocked --> Receipt[Receipt: BLOCKED_BY_POLICY]
    Blocked --> Diagnostic[Diagnostic Generation]
```

## Trust Gating and Degraded-State Handling

Trust levels are derived from evidence and gating rules. Degraded states are surfaced explicitly to the operator.

```mermaid
graph TD
    Candidate[Candidate Selection] --> Trust[Trust Evaluation]
    
    Trust -- Low Confidence --> Degraded[Degraded Path]
    Trust -- High Confidence --> Trusted[Trusted Path]
    Trust -- Conflict/Invalid --> Blocked[Blocked Path]
    
    Degraded --> Sched[Scheduler: Select with Warning]
    Degraded --> Receipt[Receipt: DEGRADED_TRUST]
    
    Blocked --> Receipt[Receipt: TRUST_VIOLATION]
```

## Replay Validation and Fallback Handling

Replay validation is a mandatory check for governance integrity. Fallback behavior is always explicit and governed.

```mermaid
graph TD
    Replay[Replay Request] --> Validation{Validate Lineage}
    
    Validation -- Valid --> Execute[Execute Replay]
    Validation -- Invalid/Drift --> Fallback[Explicit Fallback]
    
    Fallback --> Manual[Manual Review Required]
    Fallback --> Receipt[Receipt: REPLAY_DRIFT]
    
    Execute --> Receipt[Receipt: REPLAY_SUCCESS]
```

## Evidence Trail Generation

Every decision flow terminates in a machine-readable receipt and a corresponding event emission.

```mermaid
graph LR
    Decision[Control Decision] --> R[Generate Receipt]
    Decision --> E[Emit Event]
    Decision --> D[Generate Diagnostics]
    
    R --> Storage[(Append-only Store)]
    E --> Telemetry[Telemetry Stream]
    D --> Console[Operator Console]
```

## No Hidden Fallback Guarantees

1. **Policy Failure:** If the policy engine is unavailable or errors out, the system fails-closed (BLOCKED).
2. **Registry Staleness:** If the device registry data is beyond the staleness threshold, the candidate is marked as DEGRADED or BLOCKED.
3. **Approval Timeout:** If an approval gate times out, the request is REJECTED.
4. **Replay Drift:** If replay cannot reproduce a decision, it does not "guess" the intent; it triggers a DRIFT_REJECTION.
