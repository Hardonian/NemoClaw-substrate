<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local Governed Proof (Deterministic)

Run a real local governed execution proof path:

```bash
npm run demo:local-proof
```

Artifacts are written to `.artifacts/local-governed-proof/` and include:

- `manifest.json` (node registration, probe, intent, plan, queue, lease, execution, receipt, replay)
- `proofpack.json` (stable proofpack hash and replay linkage)
- `replay-envelope.json`, `receipts.ndjson`, `events.ndjson`
- `diagnostics.json`, `queue.json`, `lease.json`, `plan.json`, `intent.json`, `node.json`, `probe.json`
- `operator/*.json` (operator inspection topics)

Verification and cleanup:

```bash
npm run demo:local-proof:verify
npm run demo:local-proof:clean
```

Inspect with operator CLI:

```bash
nemoclaw operator status --source .artifacts/local-governed-proof
nemoclaw operator diagnostics --source .artifacts/local-governed-proof
nemoclaw operator proofpack --source .artifacts/local-governed-proof --json
```

Limitations:

- Local-only deterministic path (no distributed execution).
- No external network or remote workers required.
- GPU telemetry explicitly reports unavailable when `nvidia-smi` is unavailable.
