import { computeStableHash } from './hash';
import type { ExportEntry, ExportManifest } from './types';

/**
 * Verifies that the hash of an entry matches its contents deterministically.
 */
export function verifyEntryIntegrity(entry: ExportEntry): boolean {
  return entry.hash === computeStableHash(entry.data);
}

/**
 * Verifies the full integrity of a manifest bundle.
 * Ensures the Merkle root is valid and that every individual entry is uncorrupted.
 */
export function verifyManifestIntegrity(manifest: ExportManifest): boolean {
  const sortedEntries = [...manifest.entries].sort((a, b) => a.hash.localeCompare(b.hash));
  const rootHash = computeStableHash(sortedEntries.map(e => e.hash));
  
  if (manifest.merkleRoot !== rootHash) {
    return false;
  }
  
  return sortedEntries.every(verifyEntryIntegrity);
}
