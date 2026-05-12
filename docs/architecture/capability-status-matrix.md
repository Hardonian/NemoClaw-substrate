<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Capability Status Matrix

| Capability | Status | Verification | Runtime Areas | ADRs | Residual Risk | Future Dependency |
|---|---|---|---|---|---|---|
| CLI sandbox lifecycle | implemented | `npm test`, `verify:core` | `src/commands/sandbox/`, `src/lib/actions/sandbox/` | 0001 | operator misuse | none |
| Onboarding wizard | implemented | `npm test`, onboard tests | `src/lib/onboard.ts` | 0001 | provider API changes | none |
| Inference provider integration | implemented | `npm test`, inference tests | `src/lib/inference/` | 0001 | provider API drift | none |
| Network policy presets | implemented | `npm test`, `validate:configs` | `nemoclaw-blueprint/policies/` | 0007 | policy misconfiguration | stricter policy lint |
| Plugin runtime context | implemented | plugin tests | `nemoclaw/src/runtime-context.ts` | 0005 | cache eviction edge cases | none |
| Secret scanning | implemented | plugin secret-scanner tests | `nemoclaw/src/security/secret-scanner.ts` | 0007 | false negatives | expanded pattern set |
| SSRF validation | implemented | plugin ssrf tests | `nemoclaw/src/blueprint/ssrf.ts` | 0007 | DNS rebinding | continuous blocklist updates |
| Governed dispatch + deterministic routing | library-implemented | `verify:governed-routing`, unit tests | `src/lib/control-plane/governed-provider-routing.ts` | 0002, 0003 | not wired into CLI main path | CLI integration (Phase 4) |
| Replay + receipts + degraded-state truth | library-implemented | `verify:execution-lifecycle`, `verify:chaos` | `src/lib/control-plane/replay.ts`, `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/execution/` | 0005 | durable storage is caller-owned | persistence adapter |
| Policy engine + supervised promotion | library-implemented | `verify:core`, policy-engine tests | `src/lib/control-plane/policy-engine.ts`, `src/lib/control-plane/policy-promotion.ts` | 0004, 0007 | not wired into CLI routing | CLI integration (Phase 4) |
| Worker trust + capability attestation | library-implemented | targeted unit tests | `src/lib/control-plane/worker-trust.ts`, `src/lib/control-plane/device-registry.ts` | 0006 | no cryptographic implementation | formal attest provider |
| Heterogeneous routing (local/remote) | library-implemented | unit tests | `src/lib/control-plane/heterogeneous-routing.ts` | 0003 | behind feature flag | CLI integration (Phase 4) |
| Execution lifecycle substrate | library-implemented | `verify:execution-lifecycle`, `verify:chaos` | `src/lib/control-plane/execution-lifecycle.ts`, `src/lib/execution/` | 0002, 0005 | in-memory only | persistence adapter |
| Queue + lease governance | library-implemented | unit tests in `src/lib/execution/*.test.ts` | `src/lib/execution/queue.ts`, `src/lib/execution/lease.ts` | 0002 | queue starvation edge cases | adaptive queue sizing |
| Operational memory | library-implemented | unit tests | `src/lib/control-plane/operational-memory.ts` | 0005 | in-memory only | persistence adapter |
| Local runtime probes | library-implemented | `verify:local-probes` | `src/lib/control-plane/local-runtime-probes.ts` | 0002 | local-only URL guardrails | none |
| Telemetry adapters | library-implemented | `verify:local-probes`, `verify:remote-probes` | `src/lib/control-plane/local-runtime-probes.ts` | 0002 | `nvidia-smi` dependency | GPU telemetry expansion |
| Autonomous orchestration loops | intentionally-not-implemented | n/a | n/a | 0001 | expectation mismatch | none (by design) |
| Distributed execution fabric | planned (bounded) | n/a | adapters only | 0002 | implied-claim confusion | governance-defined scope |
| GPU balancing/scheduling | scaffolded | probe and scheduler tests | `src/lib/scheduler/` | 0006 | fairness assumptions | registry-backed constraints |
| Dynamo integration | planned | n/a | none in runtime | none | roadmap ambiguity | explicit ADR before implementation |
| Autonomous recovery daemons/retries | intentionally-not-implemented | degraded-state tests prove explicit failures | degraded-state path | 0005 | operator assumptions | explicit docs guardrails |
| Policy learning | intentionally-not-implemented | n/a | none | 0007 | AI-theatre interpretation | keep policy declarative |
| Cryptographic attestation chain | scaffolded | security verification matrix | trust/capability docs + worker trust modules | 0006 | structural separation only; no crypto | formal signer/integrity stack |
