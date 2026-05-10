# Fixture Generation Doctrine

## Overview

Fixture generators produce deterministic, reproducible test data for NemoClaw's evidence export and verification systems. All fixtures are pure functions of their input parameters — same inputs always produce identical outputs.

## Fixture Types

### Seeded Fixtures

Generate a set of operational events with deterministic content from a seed string.

```typescript
import { generateSeededFixture } from "./fixture-generators";

const fixture = generateSeededFixture({
  seed: "my-test-seed",
  baseTimestamp: "2026-05-09T12:00:00Z",
  count: 10,
});
```

Returns:
- `events`: Array of `OperationalEvent`
- `envelope`: `ReplayEnvelope` wrapping the events
- `manifestHash`: SHA-256 hash of the fixture manifest

### Replay Fixtures

Generate a mix of event categories including governance, diagnostics, degraded states, approvals, and fallback events.

```typescript
import { generateReplayFixture } from "./fixture-generators";

const fixture = generateReplayFixture({
  eventCount: 50,
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeGovernance: true,
  includeDiagnostics: true,
  includeDegraded: true,
  includeApprovals: true,
  includeFallback: true,
});
```

### Degraded-State Fixtures

Generate degraded states across all categories and severities.

```typescript
import { generateDegradedFixture } from "./fixture-generators";

const fixture = generateDegradedFixture({
  count: 10,
  baseTimestamp: "2026-05-09T12:00:00Z",
  severityMix: true,
});
```

Degraded categories covered:
- `constrained` (node_missing)
- `degraded` (heartbeat_stale)
- `unavailable` (transport_unreachable)
- `partial_capability` (capability_missing)
- `approval_blocked` (approval_required)
- `stale` (unknown_error)
- `unreachable` (transport_unreachable)
- `unknown` (unknown_error)

### Queue/Lease Fixtures

Generate queue items and leases in various states.

```typescript
import { generateQueueLeaseFixture } from "./fixture-generators";

const fixture = generateQueueLeaseFixture({
  itemCount: 10,
  leaseCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeCompleted: true,
  includeFailed: true,
  includeCancelled: true,
  includeExpiredLeases: true,
  includeReleasedLeases: true,
});
```

Queue statuses: `pending`, `running`, `completed`, `failed`, `cancelled`, `queued`, `blocked`
Lease statuses: `active`, `expired`, `released`, `stale`

### Trust Conflict Fixtures

Generate events representing worker trust conflicts.

```typescript
import { generateTrustConflictFixture } from "./fixture-generators";

const fixture = generateTrustConflictFixture({
  conflictCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
});
```

Conflict types: `attestation_conflict`, `trust_denied`, `trust_revoked`, `attestation_expired`

### Policy Deny Fixtures

Generate paired authorization-denied and plan-rejected events.

```typescript
import { generatePolicyDenyFixture } from "./fixture-generators";

const fixture = generatePolicyDenyFixture({
  denyCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
});
```

Deny reasons: `policy_denied`, `approval_required`, `insufficient_trust`, `attestation_conflict`, `execution_intent_mismatch`

## Determinism Guarantees

All fixtures use `seededRandom(seed, index)` which computes SHA-256 of `{seed}:{index}` and returns a value in [0, 1). This ensures:

1. **Same seed + same parameters → identical output**
2. **Different seeds → different output**
3. **No dependence on system time** (all timestamps are computed from `baseTimestamp`)
4. **Reproducible category selection** (category choice is a function of seed + index)
5. **Reproducible payload generation** (payload content is a function of seed + index)

## When to Use

| Fixture Type | Use Case |
|---|---|
| Seeded | General-purpose event generation |
| Replay | Testing replay envelope handling |
| Degraded | Testing degraded state detection and reporting |
| Queue/Lease | Testing queue management and lease lifecycle |
| Trust Conflict | Testing worker trust verification |
| Policy Deny | Testing authorization denial handling |
