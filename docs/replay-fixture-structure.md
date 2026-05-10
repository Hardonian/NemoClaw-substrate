# Replay Fixture Structure

## Replay Envelope

Every replay fixture contains a `ReplayEnvelope`:

```typescript
interface ReplayEnvelope {
  version: "1";
  exportedAt: string;
  eventCount: number;
  events: OperationalEvent[];
  digest: string;
}
```

- `version`: Always `"1"`
- `exportedAt`: Deterministic timestamp from `baseTimestamp`
- `eventCount`: Must equal `events.length`
- `events`: Sorted by sequence number
- `digest`: Base64URL-encoded SHA-256 of deterministically serialized events

## OperationalEvent Structure

```typescript
interface OperationalEvent {
  eventId: string;
  occurredAt: string;
  sequence: number;
  category: OperationalEventCategory;
  source: string;
  provenance: { requestId?: string; receiptId?: string; sandboxName?: string; actor?: string };
  replayRef?: { lineage: string[]; replayVersion: string };
  payload: Record<string, unknown>;
}
```

### Key Invariants

1. **Sequence monotonicity**: `events[i].sequence < events[i+1].sequence`
2. **Unique event IDs**: No two events share the same `eventId`
3. **Replay lineage**: Every event has `replayRef.lineage.length > 0`
4. **Timestamp ordering**: `events[i].occurredAt <= events[i+1].occurredAt`
5. **Valid category**: Every event has a valid `OperationalEventCategory`

## Replay Validation

The `validateReplayEnvelope()` function checks:

1. Event count matches actual event list length
2. All sequences are consecutive (0, 1, 2, ...)
3. All events have replay lineage
4. All degraded/fallback/policy events have reason codes
5. Digest matches recomputed digest

## Replay Evidence Package

A replay fixture can be packaged as a `ReplayEvidencePackage`:

```typescript
interface ReplayEvidencePackage {
  version: "1";
  packageId: string;
  generatedAt: string;
  replayEnvelope: ReplayEnvelope;
  evidenceBundle: EvidenceBundle;
  governanceEvents: OperationalEvent[];
  diagnosticsSnapshots: OperationalEvent[];
  degradedStates: DegradedState[];
  fallbackEvidence: OperationalEvent[];
  approvalLineage: OperationalEvent[];
  digest: EvidenceDigest;
}
```

The package:
- Embeds a replay envelope for event replay
- Embeds an evidence bundle for artifact-level integrity
- Categorizes events by type for easy access
- Has a package-level digest for integrity verification
