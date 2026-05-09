# Audit Export

The Audit Export tooling generates a canonical, cryptographically stable representation of a sandbox's session or specific operational cycle.

## Manifest Structure

Audit bundles contain a `Manifest` with a `merkleRoot`.
The Merkle root is derived by sorting all entry hashes deterministically and hashing the combined sequence. This prevents ordering discrepancies from corrupting the bundle identity.

## Verifying Integrity

To verify an Audit Export bundle:
1. Ensure the `merkleRoot` matches the combined hashes of all entries sorted lexicographically.
2. Ensure every individual entry's `hash` corresponds exactly to its `data` payload using `computeStableHash`.

Any mutation to an entry's data payload will break its local hash. Any attempt to modify the local hash will break the manifest's merkle root.

## Usage

```typescript
import { createExportEntry, createManifest, verifyManifestIntegrity } from '../src/lib/export';

const entries = [
  createExportEntry('receipt', receiptData),
  createExportEntry('diagnostic', diagnosticData)
];

const manifest = createManifest('audit', entries);

if (!verifyManifestIntegrity(manifest)) {
  throw new Error("Audit log is corrupted.");
}
```
