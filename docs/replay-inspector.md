# Replay Inspector

## Overview

The replay inspector renders `ReplayEnvelope` objects and validates their integrity using the existing `validateReplayEnvelope()` function from the control-plane.

## Validation Rules

The replay validation checks:

1. **event_count_mismatch**: `eventCount` field does not match `events.length`
2. **sequence_mismatch**: Events are not 0-indexed sequential
3. **missing_replay_lineage**: Events missing `replayRef.lineage`
4. **missing_replay_reason_code**: Degraded/policy/degraded state events missing reason codes
5. **digest_mismatch**: Deterministic serialization digest does not match computed digest

## ReplayViewer Component

The `ReplayViewer` component displays:

- **Header**: Envelope version, export timestamp, event count, and validation status badge
- **Validation Failures**: Prominent red alert section listing all validation failure reasons
- **Digest**: The envelope digest displayed in a code block
- **Event List**: A table showing sequence number, event ID, category, timestamp, and source for each event

## Empty Envelopes

When an envelope contains no events, an explicit empty state is shown: "No events — This envelope contains no operational events."

## Usage

```tsx
import { ReplayViewer } from "./components/viewers/replay-viewer";
import { validReplayEnvelope } from "./data/fixtures";

<ReplayViewer envelope={validReplayEnvelope} />
```

## Testing

- `test/components/replay-viewer.test.tsx` — Tests valid, empty, and invalid envelope rendering
- `test/snapshots/` — Deterministic snapshot tests for envelope rendering
