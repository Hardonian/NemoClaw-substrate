<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

This matrix provides a truthful inventory of the substrate's capabilities, distinguishing between implemented reality and planned work.

| Capability | Implemented | Scaffolded | Planned | Intentionally Not Implemented | Guarded by Flag | Verification Coverage | Runtime Default |
|---|:---:|:---:|:---:|:---:|:---:|---|---|
| **Deterministic Routing** | ✅ | - | - | - | `NEMOCLAW_GOVERNED_ROUTING` | High | Disabled |
| **Heterogeneous Routing** | ✅ | - | - | - | `NEMOCLAW_HETEROGENEOUS_ROUTING` | High | Disabled |
| **Remote Execution Gate** | ✅ | - | - | - | `NEMOCLAW_REMOTE_EXECUTION` | High | Blocked |
| **Device Registry** | ✅ | - | - | - | - | Medium-High | Enabled |
| **Receipt Generation** | ✅ | - | - | - | - | High | Enabled |
| **Degraded States** | ✅ | - | - | - | - | High | Enabled |
| **Local Probes** | ✅ | - | - | - | - | Medium | Manual |
| **Remote Probes** | - | ✅ | ✅ | - | - | Low | Disabled |
| **Policy Engine** | ✅ | - | - | - | - | High | Enabled |
| **Operational Memory** | - | ✅ | ✅ | - | - | Medium | Passive |
| **Orchestration** | - | - | ✅ | - | - | N/A | N/A |
| **Distributed Queues** | - | - | - | ✅ | - | N/A | N/A |
| **Retries** | - | - | - | ✅ | - | N/A | N/A |
| **GPU Balancing** | - | - | - | ✅ | - | N/A | N/A |
| **Dynamo Integration** | - | - | - | ✅ | - | N/A | N/A |
| **Autonomous Loops** | - | - | - | ✅ | - | N/A | N/A |
| **Self-Healing** | - | - | - | ✅ | - | N/A | N/A |
| **Policy Learning** | - | - | - | ✅ | - | N/A | N/A |
| **Crypto Attestation** | - | - | ✅ | - | - | N/A | N/A |

## Explicit Classifications

### Non-Orchestrated Core
NemoClaw is a **governance substrate**, not an orchestrator. It does not implement distributed queues, retries, or GPU balancing. These are intentionally deferred to external orchestration adapters to maintain a minimal and deterministic core.

### Deterministic State vs. Autonomy
There are **no autonomous loops** or self-healing behaviors. Every control decision is a deterministic reaction to explicit inputs (registry, policy, request).

### Supervised Evolution
Policy learning is **intentionally not implemented**. Behavioral evolution is achieved through supervised policy promotion from operational memory recommendations.

### Trust Boundaries
Cryptographic attestation is planned but currently represented by probe-observed evidence and explicit operator approval gates.
