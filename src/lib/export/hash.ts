import { createHash } from 'node:crypto';

/**
 * Deterministic JSON stringify with object key sorting
 * Ensures that identical objects produce identical strings regardless of key insertion order.
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(item => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${stableStringify(value)}`;
  });
  return `{${pairs.join(',')}}`;
}

/**
 * Computes a stable SHA-256 hash for any JSON-serializable object.
 */
export function computeStableHash(obj: unknown): string {
  const json = stableStringify(obj);
  return createHash('sha256').update(json).digest('hex');
}
