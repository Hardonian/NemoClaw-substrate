<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Glossary

This glossary defines the canonical terminology for the NemoClaw governed execution substrate. Use these terms consistently across code, documentation, and issues to prevent semantic drift and anti-theatre violations.

## Core Concepts

- **Proofpack**: A cryptographic, tamper-evident bundle of evidence exported for audit or verification. (Do not use: *evidence bundle*, *export bundle*).
- **Evidence**: Individual facts, telemetry, or probe results used to build confidence. Evidence is *never* automatically trusted or treated as authorization.
- **Queue**: The ordered backlog of planned executions awaiting worker allocation.
- **Lease**: The active, time-bound reservation of a worker for a specific execution. (Do not confuse with *Queue*).
- **Degraded State**: An explicitly identified state where an execution or system component has failed, timed out, or fallen back to a lower-fidelity mode. Requires operator intervention. (Do not use: *fallback*, *failover*, *fail-safe*, *self-healing*).
- **Replay Receipt**: The immutable, deterministic record of an execution's lifecycle, lineage, and inputs. (Do not use: *replay log*).
- **Replay Inspector**: The diagnostic tool used to analyze replay receipts.
- **Authorization**: A binary policy decision to allow or deny an action. 
- **Trust**: A confidence gradient derived from evidence. Trust does not bypass authorization.
- **Reason Code**: An explicit, deterministic identifier for a policy outcome or degraded state (e.g., `policy_outcome`, `missing_replay_reason_code`).

## Execution Lifecycle States
The 10 canonical state-machine phases are:
1. `planned`
2. `queued`
3. `leased`
4. `executing`
5. `completed`
6. `failed`
7. `blocked`
8. `degraded`
9. `cancelled`
10. `expired`
