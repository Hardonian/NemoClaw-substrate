import { randomUUID } from 'node:crypto';
import { computeStableHash } from './hash';
import type { ExportEntry } from './types';

/**
 * Creates a deterministic, immutable export entry for any arbitrary payload.
 */
export function createExportEntry(kind: ExportEntry['kind'], data: unknown): ExportEntry {
  // Ensure data is isolated to prevent mutation after creation
  const frozenData = JSON.parse(JSON.stringify(data));
  const hash = computeStableHash(frozenData);
  
  const entry: ExportEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    kind,
    data: frozenData,
    hash
  };
  
  return Object.freeze(entry);
}

/**
 * Append-only helper for adding a new entry to an existing ledger/array.
 * Returns a new array.
 */
export function appendEntry(entries: ExportEntry[], entry: ExportEntry): ExportEntry[] {
  return Object.freeze([...entries, Object.freeze(entry)]) as ExportEntry[];
}

/**
 * Serializes entries into deterministically ordered NDJSON.
 */
export function serializeNDJSON(entries: ExportEntry[]): string {
  // NDJSON must be deterministic in its individual lines
  // We do not sort here because the consumer may want temporal append ordering.
  return entries.map(e => JSON.stringify(e)).join('\n') + '\n';
}
