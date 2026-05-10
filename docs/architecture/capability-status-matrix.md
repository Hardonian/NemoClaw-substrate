<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

| Capability | Status | Verification | Runtime Areas | ADRs | Residual Risk | Future Dependency |
|---|---|---|---|---|---|---|
| Governed dispatch + deterministic routing | implemented | `verify:core`, `verify:all` | `src/lib/control-plane/runtime-dispatch-integration.ts`, `governed-provider-routing.ts` | 0002, 0003 | policy misconfiguration | stricter policy lint rules |
| Replay + receipts + degraded-state truth | implemented | `verify:core`, `verify:chaos` | `replay.ts`, `execution/receipts.ts` | 0005 | retention drift | archival policy automation |
| Policy engine + supervised promotion | implemented | `verify:core` | `policy-engine.ts`, `policy-promotion.ts` | 0004, 0007 | operator error in promotion | richer approval workflows |
| Worker trust + capability attestation | scaffolded | targeted unit tests | `worker-trust.ts`, `device-registry.ts`, `worker-probes.ts` | 0006 | attestation depth limited | formal attest provider integration |
| Heterogeneous routing (local/remote) | implemented | `verify:core` | `heterogeneous-routing.ts`, `remote-execution.ts` | 0003 | provider parity gaps | broader provider matrices |
| Queue + lease governance | implemented | unit tests in `src/lib/execution/*.test.ts` | `execution/queue.ts`, `execution/lease.ts` | 0002 | queue starvation edge cases | adaptive queue sizing |
| Autonomous orchestration loops | intentionally-not-implemented | n/a | n/a | 0001 | expectation mismatch | none (by design) |
| Distributed execution fabric | planned (bounded) | n/a | adapters only | 0002 | implied-claim confusion | governance-defined scope |
| GPU balancing/scheduling | scaffolded | probe and scheduler tests | `scheduler.ts`, `gpu-telemetry.md` docs | 0006 | fairness assumptions | registry-backed constraints |
| Dynamo integration | planned | n/a | none in runtime | none | roadmap ambiguity | explicit ADR before implementation |
| Self-healing daemons/retries | intentionally-not-implemented | degraded-state tests prove explicit failures | degraded-state path | 0005 | operator assumptions | explicit docs guardrails |
| Policy learning | intentionally-not-implemented | n/a | none | 0007 | AI-theatre interpretation | keep policy declarative |
| Cryptographic attestation chain | opt-in (partial) | security verification matrix | trust/capability docs + worker trust modules | 0006 | incomplete ecosystem wiring | formal signer/integrity stack |
