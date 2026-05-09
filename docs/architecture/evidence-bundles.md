<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Evidence bundles

## Status
Implemented as a pure export primitive in `src/lib/control-plane/evidence-bundles.ts`.

Evidence bundles package existing governed-substrate records into deterministic proof artifacts. The exporter does not execute work, schedule work, mutate policy, mutate trust, or change runtime behavior.

## Bundle contract
An `EvidenceBundle` contains:
- `EvidenceManifest`: bundle metadata, artifact count, artifact hashes, deterministic ordering declaration, export formats, and bundle hash.
- `EvidenceArtifact[]`: individually hashed payloads with kind, source, timestamp, lineage, and redacted payload.

Supported artifact kinds:
- execution plans
- approval lineage
- receipts
- replay envelopes
- operational events
- telemetry evidence
- trust and attestation evidence
- degraded-state evidence
- diagnostics snapshots

## Determinism
Artifacts are materialized with full secret redaction before hashing, then sorted by kind, timestamp, source, and artifact id. The manifest hash is computed from the ordered artifact hash table and export metadata.

The stable hash boundary is intentionally the exported evidence, not mutable runtime state. Re-exporting the same evidence with the same export options produces the same bundle hash, even when callers provide input arrays in a different order.

## Validation
`verifyEvidenceBundle` rejects malformed bundles, artifact hash mismatches, manifest hash mismatches, unsupported artifact kinds, missing lineage, malformed approval lineage, execution snapshot hash drift, receipt lineage gaps, and replay envelope integrity failures.

Missing lineage is a validation failure because evidence that cannot be traced back to an execution, approval, receipt, replay reference, diagnostic snapshot, telemetry source, or trust record is not audit-grade.

## Non-goals
- No runtime orchestration.
- No policy promotion or policy mutation.
- No trust elevation or trust mutation.
- No background collection loop.
- No package dependency changes.
