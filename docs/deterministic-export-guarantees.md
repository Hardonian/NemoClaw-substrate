<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Deterministic Export Guarantees

## Overview

NemoClaw's evidence export system guarantees that the same input data always produces the same serialized output and hash values. This section documents the specific guarantees and their implementation.

## Serialization Determinism

### Key Sorting

All JSON serialization uses `deterministicSerialize()` from `serde.ts`:

```typescript
function deterministicSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, sortValue(obj[k])]));
  }
  return value;
}
```

Guarantees:

- Object keys are always sorted alphabetically
- Nested objects are recursively sorted
- Arrays preserve insertion order (elements are not re-ordered)
- Primitive values are unchanged

### Artifact Ordering

Evidence bundles sort artifacts by `artifactId`:

```typescript
const sorted = [...input.artifacts].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
```

Guarantees:

- Same set of artifacts → same ordering, regardless of insertion order
- Bundle ID is computed from sorted artifact IDs

### Reference Ordering

References are sorted by `referenceId`:

```typescript
references: [...input.references].sort((a, b) => a.referenceId.localeCompare(b.referenceId)),
```

Guarantees:

- Same set of references → same ordering

## Hash Stability

### Artifact IDs

Artifact IDs are computed from `kind`, `payload`, and `createdAt`:

```typescript
function stableArtifactId(kind: string, payload: unknown, createdAt: string): string {
  const serialized = deterministicSerialize({ kind, payload, createdAt });
  return `artifact-${createHash("sha256").update(serialized).digest("base64url").slice(0, 24)}`;
}
```

Guarantees:

- Same kind + same payload + same timestamp → same artifact ID
- Different payload (even with different key order) → different artifact ID

### Bundle IDs

Bundle IDs are computed from sorted artifact IDs and generation timestamp:

```typescript
function stableBundleId(artifacts: EvidenceArtifact[], generatedAt: string): string {
  const ids = artifacts.map((a) => a.artifactId).sort();
  return `bundle-${createHash("sha256").update(deterministicSerialize({ ids, generatedAt })).digest("base64url").slice(0, 24)}`;
}
```

Guarantees:

- Same artifacts (any order) + same timestamp → same bundle ID

### Manifest IDs

Manifest IDs are computed from bundle ID and generation timestamp:

```typescript
function stableManifestId(bundleId: string, generatedAt: string): string {
  return `manifest-${createHash("sha256").update(deterministicSerialize({ bundleId, generatedAt })).digest("base64url").slice(0, 24)}`;
}
```

### Digest Computation

All digests use SHA-256 over deterministic serialization:

```typescript
export function sha256Digest(value: unknown): EvidenceDigest {
  const serialized = deterministicSerialize(value);
  return {
    algorithm: "sha256",
    value: createHash("sha256").update(serialized).digest("hex"),
  };
}
```

## Timestamp Determinism

All timestamps are **explicit inputs**, never computed from `Date.now()`:

- `createdAt`: Provided by caller
- `generatedAt`: Provided by caller
- `occurredAt`: Provided by caller
- `exportedAt`: Provided by caller

Guarantees:

- Same timestamps → same serialization → same hashes
- No hidden time-dependent behavior

## Insertion Order Independence

The most critical guarantee: **insertion order does not affect output**.

```typescript
// These produce identical bundles:
const bundleA = buildEvidenceBundle({ artifacts: [a1, a2], generatedAt: T0, classification: "internal" });
const bundleB = buildEvidenceBundle({ artifacts: [a2, a1], generatedAt: T0, classification: "internal" });
// bundleA.bundleId === bundleB.bundleId
// bundleA.manifest.digest === bundleB.manifest.digest
```

## Verification

Integrity verification checks all guarantees:

```typescript
const result = runFullIntegrityCheck(bundle);
// Checks: canonical_ordering, deterministic_timestamps, manifest_valid,
//          bundle_verification, artifact_digests_consistent, bundle_hash_computable
```
