import { describe, it, expect } from 'vitest';
import {
  computeStableHash,
  stableStringify,
  createExportEntry,
  appendEntry,
  createManifest,
  verifyEntryIntegrity,
  verifyManifestIntegrity,
  validateReplayEnvelope
} from '../src/lib/export';

describe('Export Tooling', () => {
  describe('Hashing and Stringify', () => {
    it('should stable stringify objects ignoring key order', () => {
      const obj1 = { a: 1, b: 2, c: { z: 9, y: 8 } };
      const obj2 = { c: { y: 8, z: 9 }, b: 2, a: 1 };
      expect(stableStringify(obj1)).toBe(stableStringify(obj2));
    });

    it('should generate consistent hashes for identical payloads', () => {
      const obj1 = { foo: 'bar', baz: [1, 2, 3] };
      const obj2 = { baz: [1, 2, 3], foo: 'bar' };
      expect(computeStableHash(obj1)).toBe(computeStableHash(obj2));
    });
  });

  describe('Export Entries', () => {
    it('should create an immutable entry with valid hash', () => {
      const data = { action: 'approve', user: 'admin' };
      const entry = createExportEntry('approval-lineage', data);
      
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.kind).toBe('approval-lineage');
      expect(entry.data).toEqual(data);
      expect(verifyEntryIntegrity(entry)).toBe(true);
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('should append entries immutably', () => {
      const ledger = [];
      const entry1 = createExportEntry('execution-plan', { planId: '123' });
      const entry2 = createExportEntry('receipt', { status: 'ok' });
      
      const newLedger = appendEntry(ledger, entry1);
      expect(newLedger).toHaveLength(1);
      expect(newLedger[0]).toBe(entry1);
      
      const finalLedger = appendEntry(newLedger, entry2);
      expect(finalLedger).toHaveLength(2);
      expect(finalLedger[1]).toBe(entry2);
      expect(ledger).toHaveLength(0); // Original unmutated
    });
  });

  describe('Manifests and Integrity', () => {
    it('should create deterministic manifest', () => {
      const entries = [
        createExportEntry('receipt', { a: 1 }),
        createExportEntry('diagnostic', { b: 2 })
      ];
      
      const manifest = createManifest('audit', entries);
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.type).toBe('audit');
      expect(manifest.bundleId).toBeDefined();
      expect(manifest.entries).toHaveLength(2);
      expect(verifyManifestIntegrity(manifest)).toBe(true);
    });

    it('should fail integrity if an entry is mutated', () => {
      const entries = [createExportEntry('receipt', { val: 'test' })];
      const manifest = createManifest('audit', entries);
      
      // Mutate the entry hash maliciously
      const badManifest = JSON.parse(JSON.stringify(manifest));
      badManifest.entries[0].hash = 'badhash';
      
      expect(verifyManifestIntegrity(badManifest)).toBe(false);
    });
  });

  describe('Replay Validation', () => {
    it('should validate a correct replay envelope', () => {
      const entries = [
        createExportEntry('approval-lineage', { user: 'admin', approved: true }),
        createExportEntry('execution-plan', { cmd: 'run' })
      ];
      const manifest = createManifest('replay', entries);
      
      const result = validateReplayEnvelope({ manifest });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail replay validation if missing lineage', () => {
      const entries = [
        createExportEntry('execution-plan', { cmd: 'run' })
      ];
      const manifest = createManifest('replay', entries);
      
      const result = validateReplayEnvelope({ manifest });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing approval lineage. Cannot replay without authorization evidence.');
    });

    it('should fail replay validation if missing plan', () => {
      const entries = [
        createExportEntry('approval-lineage', { user: 'admin', approved: true })
      ];
      const manifest = createManifest('replay', entries);
      
      const result = validateReplayEnvelope({ manifest });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing execution plan. Cannot replay without plan evidence.');
    });
  });
});
