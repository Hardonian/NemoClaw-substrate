<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Current-State Architecture (Repository Truth)

## Overview

This section describes repository truth as of this commit only. NemoClaw currently provides CLI and plugin-driven sandbox lifecycle management, onboarding, provider/model selection, policy preset application, and diagnostics. A control-plane library layer exists in `src/lib/control-plane/` and `src/lib/execution/` with policy engine, execution lifecycle, replay, worker trust, and device registry modules; these are tested library contracts not yet wired into the main CLI execution paths.

## Execution entrypoints

- Root CLI binaries: `nemoclaw` and `nemohermes` are declared in `package.json` and launched via `bin/nemoclaw.js` and `bin/nemohermes.js`.
- Oclif command entrypoints are defined under `src/commands/` and compile to `dist/commands`.
- Plugin runtime entrypoint is `nemoclaw/src/index.ts` with command handlers under `nemoclaw/src/commands/`.

## Model execution paths

- Onboarding and provider selection flow runs through `src/lib/onboard.ts` and provider catalog/helpers in `src/lib/onboard/providers.ts`.
- Inference provider integrations are implemented in `src/lib/inference/` (for example `local.ts`, `nim.ts`, `vllm.ts`).
- Provider normalization for installer/runtime values is in `src/lib/domain/installer/provider.ts`.

## Tool execution paths

- Host-side sandbox command paths are in `src/lib/commands/sandbox/` and `src/lib/actions/sandbox/`.
- Blueprint/plugin command handling exists under `nemoclaw/src/commands/`.
- Gateway token and service interactions are exposed by host-side helper modules such as `src/lib/gateway-token-command.ts` and `src/lib/services.ts`.

## State and memory surfaces

- Host registry/onboarding/sandbox state is maintained under `src/lib/state/`.
- Plugin blueprint state handling is in `nemoclaw/src/blueprint/state.ts`.
- Security filtering for memory writes and secret-like content is in `nemoclaw/src/security/secret-scanner.ts`.

## Logging, telemetry, and audit surfaces

- CLI diagnostics are in `src/lib/diagnostics/debug.ts` and command bindings (for example `src/commands/debug.ts`).
- Sandbox log retrieval paths are in `src/lib/actions/sandbox/logs.ts`.
- Shields audit path exists as append-only JSONL logic in `src/lib/shields/audit.ts`.
- Current observability is primarily CLI text output and targeted debug logs rather than a unified control-plane telemetry pipeline.

## Config and policy-like surfaces

- Blueprint and policy definitions are in `nemoclaw-blueprint/` and `nemoclaw-blueprint/policies/`.
- JSON schemas live in `schemas/` and are validated by `scripts/validate-configs.ts`.
- Onboard config read/write flows are in `nemoclaw/src/onboard/config.ts` and related CLI modules.

## Routing or scheduling behavior present today

- Onboarding and provider selection flow runs through `src/lib/onboard.ts` and provider catalog helpers.
- A deterministic scheduler library exists in `src/lib/control-plane/scheduler.ts` but is not wired into the CLI flow.
- Governed provider routing exists behind `NEMOCLAW_GOVERNED_ROUTING=1` in `src/lib/control-plane/governed-provider-routing.ts`.
- Heterogeneous routing exists behind `NEMOCLAW_HETEROGENEOUS_ROUTING=1` in `src/lib/control-plane/heterogeneous-routing.ts`.
- Remote execution adapter exists behind `NEMOCLAW_REMOTE_EXECUTION=1` in `src/lib/control-plane/remote-execution.ts`.

## Degraded/failure-state behavior present today

- Commands return explicit user-facing failures for missing state, gateway/token errors, and unsupported agent paths.
- Some health/status flows report degraded states (for example messaging bridge checks and dashboard link checks).
- Degraded-state semantics are not yet standardized into a shared taxonomy across runtime surfaces.

## Test and verification surfaces

- Root test command: `npm test` (Vitest).
- Hook/quality checks: `npm run check`, `npm run lint`, `npm run typecheck`, `npm run typecheck:cli`, `npm run validate:configs`.
- Build and docs checks: `npm run build:cli`, `npm run docs`, `npm run docs:strict`.
- Plugin project has separate tests/checks under `nemoclaw/`.

## Coupling hotspots

- Provider selection and inference behavior are spread across onboarding, runtime probing, and inventory/status reporting modules.
- Sandbox lifecycle logic is split between CLI command layers, host action helpers, and blueprint/plugin state.
- Degraded/failure messaging is distributed across command-specific output paths instead of contract-first shared types.

## Best insertion points for future work

- Control-plane contract types can be introduced alongside existing domain types under `src/lib/domain/`.
- Device registry scaffolding can begin near existing sandbox registry/state modules in `src/lib/state/`.
- Policy evaluation boundary can be layered near existing policy preset/config schema surfaces.
- Receipt/degraded-state primitives can start adjacent to diagnostics/audit modules and status/reporting paths.

## Known unknowns

- Runtime behavior that is implemented in external dependencies (OpenShell/OpenClaw internals) is not fully inspectable from this repo alone.
- Some command behavior may depend on environment-specific gateway/sandbox state that cannot be inferred statically.
