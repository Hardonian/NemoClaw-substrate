<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance Glossary

This glossary defines the canonical terminology for the NemoClaw governed execution substrate. Use these terms consistently across code, documentation, and issues to prevent semantic drift and anti-theatre violations.

## Core Concepts

<!-- markdownlint-disable anti-theatre-terms -->
- **Proofpack**: A cryptographic, tamper-evident bundle of evidence exported for audit or verification. (Do not use: *evidence bundle*, *export bundle*).
- **Evidence**: Individual facts, telemetry, or probe results used to build confidence. Evidence is *never* automatically trusted or treated as authorization.
- **Queue**: The ordered backlog of planned executions awaiting worker allocation.
- **Lease**: The active, time-bound reservation of a worker for a specific execution. (Do not confuse with *Queue*).
- **Degraded State**: An explicitly identified state where an execution or system component has failed, timed out, or fallen back to a lower-fidelity mode. Requires operator intervention. (Do not use: *fallback*, *failover*, *fail-safe*, *self-healing*).
- **Replay Receipt**: The immutable, deterministic record of an execution's lifecycle, lineage, and inputs. (Do not use: *replay log*).
- **Replay Inspector**: The diagnostic tool used to analyze replay receipts.
- **Authorization**: A binary policy decision to allow or deny an action.
- **Trust**: A confidence gradient derived from evidence. Trust does not bypass authorization.
<!-- markdownlint-enable anti-theatre-terms -->
- **Reason Code**: An explicit, deterministic identifier for a policy outcome or degraded state (e.g., `policy_outcome`, `missing_replay_reason_code`).
- **Execution Lineage**: The chain of plan, approval, authorization, policy snapshot, and trust snapshot IDs that trace an execution decision.
- **Operational Memory**: The append-only event store for governance events within a process lifetime. Not durable across restarts.
- **Replay Envelope**: The container format for exported replay data (`ReplayEnvelope` in code).
- **Replay Digest**: SHA-256 hash of deterministically serialized replay events, encoded as Base64URL. Used for tamper detection.
- **Deterministic Serialization**: Recursive key-sorted JSON serialization via `deterministicSerialize()` in `serde.ts`. Guarantees identical output regardless of property insertion order.
- **Policy Bundle**: The set of rules evaluated synchronously within a request path to produce allow/deny/approval-required decisions.
- **Worker Probe**: An explicit, operator-invoked diagnostic action against a remote worker. Not an autonomous polling loop.
- **Device Registry**: The local registry of known worker nodes, their trust levels, attestation status, and health. Populated by probes, not by automatic discovery.
- **Attestation**: A claim about a worker's capabilities or identity. Currently structural only (string-based classification); cryptographic attestation is scaffolded.

## Code-to-Documentation Term Mapping

| Documentation Term | Code Type/Function | Source File |
|---|---|---|
| Proofpack | `EvidenceBundle`, `buildEvidenceBundle()` | `evidence-export.ts` |
| Replay Envelope | `ReplayEnvelope` | `replay.ts` |
| Replay Digest | `digest` field in `ReplayEnvelope` | `replay.ts` |
| Degraded State | `DegradedStateRecord` | `types.ts` |
| Execution Receipt | `ExecutionReceipt` | `types.ts` |
| Execution Lineage | `executionLineageFromPlan()` | `execution-plans.ts` |
| Operational Memory | `OperationalMemoryLog` | `operational-memory.ts` |
| Policy Bundle | `PolicyBundle` | `governance.ts` |
| Worker Trust | `TrustLevel`, `AttestationStatus` | `types.ts` |
| Device Registry | `DeviceRegistry` | `device-registry.ts` |
| Deterministic Serialization | `deterministicSerialize()` | `serde.ts` |
| Security Policy | `SecurityPolicy`, `DEFAULT_SECURITY_POLICY` | `security-policy.ts` |

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
