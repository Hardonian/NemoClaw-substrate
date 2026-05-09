<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Audit exports

## Purpose
Audit exports provide deterministic JSON and NDJSON representations of governed-substrate evidence for review, replay validation, and release verification.

The primary helper is `exportReplayEvidencePackage`, which returns:
- an `EvidenceBundle`
- canonical JSON
- NDJSON with a manifest record followed by ordered artifact records

## Included evidence
Audit export packages can include execution plans, approvals, receipts, replay envelopes, operational events, telemetry evidence, trust and attestation evidence, degraded-state evidence, and diagnostics snapshots.

Telemetry and trust operational events are preserved as operational events and also classified into their evidence-specific artifact kinds. Degraded events attached to receipts or operational memory are exported as degraded-state evidence.

## Integrity model
Each artifact has a content hash over its redacted payload. The manifest records every artifact hash and lineage hash, then signs the ordered artifact table with a bundle hash.

Validation recomputes artifact hashes, manifest artifact hashes, and the bundle hash. Replay envelopes are revalidated with the replay validator so event-count, sequence, lineage, and digest drift are rejected.

## Secret handling
Exports redact sensitive keys and known secret-bearing string patterns before hashing or serialization. This keeps the exported hash tied to the reviewable evidence package rather than to raw credentials.

## Operational boundary
Audit exports are offline packaging helpers. They do not invoke transport adapters, alter routing decisions, promote policy, update trust, or write to package locks.
