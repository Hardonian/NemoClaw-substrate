# Evidence Export Formats

## Overview

NemoClaw provides deterministic evidence export in multiple formats. All exports are built on the core `evidence-export.ts` system and guarantee:

- **Deterministic serialization**: JSON keys are sorted recursively via `serde.ts`
- **Stable SHA-256 hashes**: Computed over deterministic serialization
- **Canonical ordering**: Artifacts sorted by artifactId, references sorted by referenceId
- **Secret redaction**: All exports pass through `security-policy.ts` redaction before serialization

## Export Formats

### JSON (Canonical)

```typescript
import { exportBundleAsJson, exportReplayPackageAsJson } from "./evidence-formats";

const jsonString = exportBundleAsJson(bundle);
const packageJsonString = exportReplayPackageAsJson(pkg);
```

- Single JSON document with all keys sorted
- Deterministic: identical input always produces identical output
- Suitable for hash computation and integrity verification

### NDJSON (Newline-Delimited JSON)

```typescript
import { exportBundleAsNdjson, exportReplayPackageAsNdjson } from "./evidence-formats";

const ndjsonString = exportBundleAsNdjson(bundle);
```

- One JSON object per line
- Structure: `{type, data}` for each record type
- Line types: `manifest`, `artifact`, `reference`, `package_header`, `replay_envelope`, `governance_event`, `diagnostics_snapshot`, `degraded_state`, `fallback_evidence`, `approval_lineage`
- Suitable for streaming consumption and large datasets

### Markdown Summary

```typescript
import { exportBundleAsMarkdown, exportReplayPackageAsMarkdown } from "./evidence-formats";

const markdown = exportBundleAsMarkdown(bundle, {
  title: "Evidence Bundle",
  includeArtifactDetails: true,
  includeReferences: true,
  includeDigests: true,
  redactedSummary: true,
});
```

Options:
- `title`: Document title
- `includeArtifactDetails`: Include per-artifact sections with payload keys
- `includeReferences`: Include references table
- `includeDigests`: Include SHA-256 digest values (truncated)
- `redactedSummary`: Only show payload keys, not values

### ZIP/Tarball Bundles

Export format identifiers `"zip"` and `"tarball"` produce JSON content suitable for archival. The actual archive creation is left to the consumer:

```typescript
import { exportBundle } from "./evidence-formats";

const result = exportBundle(bundle, "zip");
// result.content contains JSON suitable for zipping
// result.manifest contains export metadata
```

## Export Manifest

Every export produces an `ExportManifest`:

```typescript
interface ExportManifest {
  version: "1";
  exportId: string;
  generatedAt: string;
  format: ExportFormat;
  classification: EvidenceClassification;
  artifactCount: number;
  totalBytes: number;
  contentHash: string;
  metadata: Record<string, string>;
}
```

## Export Result

```typescript
interface ExportResult {
  manifest: ExportManifest;
  content: string | Buffer;
}
```

## Deterministic Guarantees

1. **Serialization**: `deterministicSerialize()` sorts all object keys recursively
2. **Artifact ordering**: Artifacts sorted by `artifactId` (lexicographic)
3. **Reference ordering**: References sorted by `referenceId` (lexicographic)
4. **Hash stability**: Same input → same hash, regardless of insertion order
5. **Timestamp determinism**: All timestamps are explicit inputs, never `Date.now()`
