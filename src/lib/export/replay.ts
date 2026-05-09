import { verifyManifestIntegrity } from './integrity';
import type { ReplayEnvelope } from './types';

export interface ReplayValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a replay envelope to ensure it has not been tampered with
 * and contains all necessary lineage and plan evidence to be safely executed.
 */
export function validateReplayEnvelope(envelope: ReplayEnvelope): ReplayValidationResult {
  const errors: string[] = [];
  
  if (!verifyManifestIntegrity(envelope.manifest)) {
    errors.push('Manifest integrity verification failed. Merkle root or entry hashes mismatch.');
  }
  
  const hasLineage = envelope.manifest.entries.some(e => e.kind === 'approval-lineage');
  const hasPlan = envelope.manifest.entries.some(e => e.kind === 'execution-plan');
  
  if (!hasLineage) {
    errors.push('Missing approval lineage. Cannot replay without authorization evidence.');
  }
  if (!hasPlan) {
    errors.push('Missing execution plan. Cannot replay without plan evidence.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
