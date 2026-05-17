<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Deterministic Fixture Generation

This repository contains tools to generate deterministic, redacted JSON fixtures representing typical NemoClaw data structures. These fixtures are used for testing, validation, documentation, and operator CLI smoke checks.

## Generator Script

Located at `scripts/fixtures/generate-fixtures.mjs`.

### Usage

```bash
# Generate fixtures to default output directory
node scripts/fixtures/generate-fixtures.mjs

# Generate fixtures to a specific directory
node scripts/fixtures/generate-fixtures.mjs --output /path/to/output
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output` | Directory to write generated fixtures | `./fixtures/generated` |

### Determinism

All fixtures use a fixed seed (`42`) and cryptographic hashing for IDs. Running the generator twice with the same seed produces byte-identical output.

### Redaction

No secrets, credentials, or sensitive values are included. Fields that would normally contain sensitive data are marked `[REDACTED]` or omitted entirely.

## Generated Fixtures

| File | Description |
|------|-------------|
| `receipt.json` | Orchestration receipt with execution step record |
| `replay-envelope.json` | Replay envelope for session verification and drift analysis |
| `diagnostics.json` | System diagnostics snapshot (health, components, resource usage) |
| `telemetry.json` | Telemetry metrics (request count, error rate, latency percentiles) |
| `trust-attestation.json` | Trust/attestation decision record from policy engine |
| `degraded-state.json` | Degraded state records (ok, unavailable, degraded paths) |
| `proofpack.json` | Proofpack/evidence bundle with receipt and trust decision links |
| `queue-lease.json` | Queue and lease records for step scheduling |
| `execution-plan.json` | Multi-step execution plan with policy configuration |

## Schema Validation

Generated fixtures validate against the JSON schemas defined in `schemas/`:

- `receipt.json` → `schemas/receipt.schema.json`
- `replay-envelope.json` → `schemas/replay-envelope.schema.json`
- `trust-attestation.json` → `schemas/trust-decision.schema.json`

## Requirements

- Fixtures are deterministic (stable output based on a fixed seed)
- Fixtures are fully redacted (no secrets)
- Fixtures validate against the defined schemas
- No live network required
- No GPU required
