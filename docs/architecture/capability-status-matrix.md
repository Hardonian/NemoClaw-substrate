<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

Use this table for status. Use the [evidence index](../review/evidence-index.md) for claim-level proof links.

| Capability | Status | Primary verification | Limitation |
|---|---|---|---|
| Execution lifecycle records | Implemented | `npm run verify:execution-lifecycle` | In-process records only |
| Replay drift rejection | Implemented | `npm run verify:chaos` | Local validation, not distributed consensus |
| Proofpack and evidence export helpers | Implemented | `npm run verify:proofpack`, `npm run verify:export` | No hardware-backed signing |
| Secret redaction | Implemented | `npm run verify:core` | Pattern-based, not full DLP |
| Governed provider routing | Opt-in implementation | `npm run verify:governed-routing` | Not a distributed scheduler |
| Remote execution adapter | Opt-in guarded boundary | `npm run verify:remote-probes`, `npm run verify:chaos` | No worker fleet |
| Worker trust and attestation model | Structural implementation | `npm run verify:remote-probes` | No cryptographic attestation chain |
| Operator inspection CLI | Fixture-backed implementation | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` | Not live telemetry |
| Durable queue storage | Deferred | n/a | Persistence adapter required |
| GPU balancing | Deferred | n/a | Requires registry-backed scheduling ADR |
| Dynamo integration | Deferred | n/a | Requires dedicated ADR and proof plan |
| Autonomous orchestration or recovery loops | Not implemented by design | n/a | Out of scope |
| Automatic policy learning | Not implemented by design | n/a | Policy changes stay explicit |
