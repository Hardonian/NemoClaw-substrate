<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Verification Matrix

## Canonical verification commands

- `npm run verify:changelog-hygiene`
- `npm run verify:control-plane`
- `npm run verify:local-probes`
- `npm run verify:remote-probes`
- `npm run verify:governed-routing`
- `npm run verify:core`
- `npm run verify:release`
- `npm run verify:all` (strict `verify:core` variant)

## CI baseline

The `verify` GitHub Actions workflow runs:

1. `npm ci`
2. changelog hygiene
3. `npm run typecheck`
4. `npm run typecheck:cli`
5. `npm run lint`
6. targeted control-plane/probe/governed routing verification
7. `git diff --check`

CI is authoritative for release readiness because it runs with full dependency installation.

## Local restricted-environment baseline

When dependency bootstrap is constrained, run:

```bash
node scripts/verify-core.js
```

This preserves deterministic ordering while marking missing dependency/toolchain conditions as `WARN` instead of misreporting a repository failure.

Use strict mode for fail-fast release parity:

```bash
node scripts/verify-core.js --strict
```

## Scope notes

- Remote HTTP probe verification is seam-level and mock-driven.
- SSH probe remains a placeholder seam and is verified as explicit not-implemented behavior.
- No claims of distributed execution, autonomous GPU orchestration, or Dynamo integration are made by this verification matrix.

- verify remote execution adapter seam: opt-in gating, policy/approval blocking, degraded path truth, receipt/event emission, diagnostics exposure.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- Probe execution is explicit/manual with no background polling; remote execution and automated routing remain planned future work.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

- Runtime dispatch integration wrapper verification added (flag gating, policy block behavior, governed receipts/diagnostics).


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.

- Remote parser adapters (Ollama/vLLM/llama.cpp/NIM/generic) validated with mocked fixtures only.
- Registry telemetry update policy validated for observed/partial/unavailable/stale/conflict states.

## 2026-05-09 telemetry taxonomy verification additions
- `npx vitest run src/lib/control-plane/local-runtime-probes.test.ts src/lib/control-plane/worker-probes.test.ts src/lib/control-plane/operational-intelligence.test.ts`
- verify dedicated telemetry event categories, mapping coverage, replay-safe ordering assumptions, and observability aggregation output.

- `npx vitest run test/changelog-hygiene.test.ts src/lib/control-plane/worker-probes.test.ts src/lib/control-plane/operational-intelligence.test.ts`
- Verifies duplicate bullet rejection in `CHANGELOG.md`, deterministic registry telemetry applied/skipped/conflict/stale emission, observability aggregation coverage, and replay reason-code preservation.

- `npx vitest run src/lib/control-plane/degraded-state-chaos.test.ts`
- Verifies deterministic failure-injection coverage across policy deny/approval gating, no-candidate/no-hidden-fallback routing behavior, remote timeout degradation, telemetry non-erasure guarantees, replay digest mismatch detection, and diagnostics empty-state reason reporting.

## Worker trust and attestation constraints (2026-05-09)
- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.

## Residual closure additions (2026-05-09)
- Replay guardrails: explicit rejection tests cover policy drift, trust drift, candidate eligibility mismatch, and fallback mismatch when governance reason codes are absent.
- Remote execution guardrails: transport is not invoked when disabled, denied, approval-gated, trust-denied, or stale/unhealthy under active routing context.
- Observability guardrails: telemetry aggregates include emitted telemetry kinds only; reserved scaffold kinds are validated as non-emitted/non-aggregated for telemetry rollups.
