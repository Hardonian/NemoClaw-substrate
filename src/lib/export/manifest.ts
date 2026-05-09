import { randomUUID } from 'node:crypto';
import { computeStableHash } from './hash';
import type { ExportManifest, ExportEntry } from './types';

/**
 * Creates a deterministic bundle manifest from a set of entries.
 * The entries are sorted by their stable hashes to ensure order independence.
 */
export function createManifest(type: ExportManifest['type'], entries: ExportEntry[]): ExportManifest {
  // Compute merkle root based on entry hashes (deterministic ordering)
  const sortedEntries = [...entries].sort((a, b) => a.hash.localeCompare(b.hash));
  const rootHash = computeStableHash(sortedEntries.map(e => e.hash));

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    type,
    bundleId: randomUUID(),
    entries: sortedEntries,
    merkleRoot: rootHash
  };
}
