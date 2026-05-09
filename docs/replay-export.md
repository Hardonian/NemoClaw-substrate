# Replay Export Validation

Replay exports provide the governed substrate with enough contextual evidence to deterministically replay an event or execution plan.

## Requirements for Replay

A `ReplayEnvelope` cannot be executed unless it passes strict validation criteria.
At a minimum, it must contain:

1. **Approval Lineage**: Cryptographic or documented evidence that the operation was authorized by a competent operator.
2. **Execution Plan**: The deterministic plan that the sandbox is expected to execute.

If either of these are missing, the validation fails and the substrate will reject the replay attempt.

## Validating an Envelope

```typescript
import { validateReplayEnvelope } from '../src/lib/export';

const result = validateReplayEnvelope(envelope);

if (!result.valid) {
  console.error("Replay rejected:", result.errors);
} else {
  console.log("Envelope is valid for replay execution.");
}
```

This ensures that the substrate only executes known, proven operations without deviating from defined orchestration rules or introducing unexpected side effects.
