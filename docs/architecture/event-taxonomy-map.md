<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Event Taxonomy Map

This document defines the structured event categories used across the substrate for telemetry, governance, and diagnostics.

## Event Categories

| Category | Prefix | Purpose | Non-Telemetry Reserved |
|---|---|---|---|
| **Governance** | `gov.*` | Control-plane decisions (allow, deny, gate). | Yes (Policy decisions) |
| **Telemetry** | `tel.*` | Probe outcomes, resource snapshots, and availability. | No |
| **Replay** | `rep.*` | Replay validation results and drift detection. | Yes (Replay-only) |
| **Trust** | `trust.*` | Attestation results and operator approval changes. | Yes (Auth decisions) |
| **Degraded** | `diag.*` | Error codes, chaos signals, and diagnostics summaries. | Yes (Diagnostics-only) |
| **System** | `sys.*` | Lifecycle events (onboard, start, stop). | No |

## Detailed Taxonomy

### 1. Governance Events (`gov.*`)

- `gov.decision.allow`: Decision to proceed with execution.
- `gov.decision.deny`: Decision to block execution.
- `gov.decision.approval_required`: Decision deferred to operator gate.
- `gov.policy.promotion`: Supervised policy update.

### 2. Telemetry Events (`tel.*`)

- `tel.probe.success`: Successful evidence collection.
- `tel.probe.failure`: Failed evidence collection.
- `tel.registry.update`: Change in device/candidate capabilities.
- `tel.staleness.warning`: Observed data is beyond trust threshold.

### 3. Replay Events (`rep.*`)

- `rep.validation.pass`: Successful deterministic reproduction.
- `rep.validation.drift`: Non-deterministic outcome detected.
- `rep.validation.error`: Replay failed due to missing envelope data.

### 4. Trust Events (`trust.*`)

- `trust.attestation.pass`: Cryptographic verification successful.
- `trust.attestation.fail`: Cryptographic verification failed.
- `trust.approval.grant`: Operator manually elevated trust.
- `trust.approval.revoke`: Operator manually reduced trust.

### 5. Diagnostics Events (`diag.*`)

- `diag.chaos.triggered`: Explicit chaos injection event.
- `diag.state.degraded`: System operating with reduced capabilities.
- `diag.error.fail_closed`: Control-plane fallback to safe state.

## Reserved and Special Categories

### Replay-Only Categories

Events with the `rep.*` prefix are never emitted during live execution; they are reserved for the Replay Engine and validation suites to prevent noise in the primary telemetry stream.

### Diagnostics-Only Categories

Events with the `diag.*` prefix are intended for operator troubleshooting and automated verification suites. They carry high-fidelity failure context that is omitted from standard governance receipts.

### Non-Telemetry Reserved

Governance and Trust decisions are "Reserved" categories—meaning they are derived from internal control logic and are not simply "observed" telemetry. They represent the authoritative state of the substrate.
