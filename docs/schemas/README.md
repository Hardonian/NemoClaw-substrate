<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Schema Snapshot Tooling

This directory contains schemas and schema snapshots for NemoClaw data structures. These schemas ensure machine-readability, auditability, and deterministic validation of the substrate's core primitives.

## Target Schemas

| Schema | Purpose | Link |
|--------|---------|------|
| **Receipt** | Immutable record of discrete events. | [receipt.schema.json](../../schemas/receipt.schema.json) |
| **Replay Envelope** | Container for replay validation results. | [replay-envelope.schema.json](../../schemas/replay-envelope.schema.json) |
| **Diagnostics** | System health and component status snapshot. | [diagnostics.schema.json](../../schemas/diagnostics.schema.json) |
| **Telemetry** | Performance metrics and operational data. | [telemetry.schema.json](../../schemas/telemetry.schema.json) |
| **Authorization** | Attestation and policy evaluation records. | [trust-decision.schema.json](../../schemas/trust-decision.schema.json) |
| **Proofpack** | Content-addressed bundle manifest with hash integrity. | [proofpack.schema.json](../../schemas/proofpack.schema.json) |
| **Queue Lease** | Task queue lease and concurrency records. | [queue-lease.schema.json](../../schemas/queue-lease.schema.json) |
| **Execution Plan** | Declarative orchestration plan snapshots. | [execution-plan.schema.json](../../schemas/execution-plan.schema.json) |
| **Operator CLI** | Standardized output format for CLI tools. | [operator-cli-output.schema.json](../../schemas/operator-cli-output.schema.json) |

## Operational Rules

1. **Determinism First**: Schemas must support deterministic sorting and hashing.
2. **No Theatre**: Avoid unsupported or misleading fields. Mark experimental fields explicitly.
3. **Derivation**: Derived from current implementation structures to prevent drift.
4. **Redaction**: Support `redacted` flags to indicate sanitization of sensitive data.

## Validation

Schemas can be validated using the internal check tools:

- `npm run check-fixtures` — Validates generated fixtures against these schemas.
- `scripts/review/check-fixtures-redacted.mjs` — Ensures redaction invariants are met.
