<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

Use this table for status. Use the [evidence index](../review/evidence-index.md) for claim-level proof links.

<!-- status-matrix: canonical -->

| Capability | Status | Primary verification | Limitation |
|---|---|---|---|
| Execution lifecycle records | implemented | `npm run verify:execution-lifecycle` | In-process records only |
| Replay drift rejection | implemented | `npm run verify:chaos` | Local validation, not distributed consensus |
| Proofpack and evidence export helpers | implemented | `npm run verify:proofpack`, `npm run verify:export` | No hardware-backed signing |
| Secret redaction | implemented | `npm run verify:core` | Pattern-based, not full DLP |
| Governed provider routing | opt-in | `npm run verify:governed-routing` | Not a distributed scheduler |
| Remote execution adapter | opt-in | `npm run verify:remote-probes`, `npm run verify:chaos` | No worker fleet |
| Worker trust and attestation model | structural | `npm run verify:remote-probes` | No cryptographic attestation chain |
| Operator inspection CLI | fixture-backed | `npm run build:cli && node ./bin/nemoclaw.js operator status --json` | Not live telemetry |
| Durable queue storage | deferred | n/a | Persistence adapter required |
| GPU balancing | deferred | n/a | Requires registry-backed scheduling ADR |
| Dynamo integration | deferred | n/a | Requires dedicated ADR and proof plan |
| Autonomous orchestration or recovery loops | not-implemented | n/a | Out of scope |
| Automatic policy learning | not-implemented | n/a | Policy changes stay explicit |
