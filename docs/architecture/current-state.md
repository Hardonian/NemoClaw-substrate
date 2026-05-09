<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Current-State Architecture (Repository Truth)

## Execution entrypoints

- Root package exposes CLI binaries via `bin.nemoclaw` and `bin.nemohermes` in `package.json`.
- `bin/nemoclaw.js` is the top-level launcher.
- Global command dispatch is implemented through `src/nemoclaw.ts` and Oclif command modules under `src/commands/`.

## Model execution paths

- Provider selection and onboarding flow live in `src/lib/onboard.ts` and `src/lib/onboard/providers.ts`.
- Provider-specific implementations exist under `src/lib/inference/` (for example `local.ts`, `nim.ts`, `vllm.ts`, `provider-models.ts`).
- Routed-provider normalization includes `routed` in `src/lib/domain/installer/provider.ts`.

## Tool execution paths

- Sandbox command adapters and runtime actions live under `src/lib/commands/sandbox/` and `src/lib/actions/sandbox/`.
- Agent/plugin command execution from inside sandbox surfaces through `nemoclaw/src/commands/` and `nemoclaw/src/index.ts`.

## State and memory surfaces

- Host state registry/session files are managed in `src/lib/state/` (`registry.ts`, `onboard-session.ts`, `sandbox-session.ts`, `sandbox.ts`).
- Plugin state for runtime context and shields state is persisted in `nemoclaw/src/blueprint/state.ts`.
- Secret scanner explicitly protects memory-write paths in `nemoclaw/src/security/secret-scanner.ts`.

## Logging and telemetry surfaces

- CLI debug/reporting paths: `src/lib/diagnostics/debug.ts`, `src/lib/commands/debug.ts`, and sandbox logs command paths under `src/lib/actions/sandbox/logs.ts`.
- Shields append-only JSONL audit path exists in `src/lib/shields/audit.ts`.
- Service/status text output surfaces are in `src/lib/services.ts` and status command adapters.

## Scheduling/routing logic present today

- Inference provider/model routing is primarily onboarding-time/provider-driven in `src/lib/onboard.ts` + `src/lib/inference/*`.
- Experimental routed provider support is represented in provider normalization and router references (for example `nemoclaw/src/blueprint/runner.ts`).
- No dedicated deterministic multi-device scheduler module currently exists.

## Config surfaces

- Blueprint and policy config in `nemoclaw-blueprint/`.
- Onboard config and plugin config readers in `nemoclaw/src/onboard/config.ts`.
- CLI/provider normalization and installer plan configs under `src/lib/domain/installer/` and `scripts/validate-configs.ts`.
