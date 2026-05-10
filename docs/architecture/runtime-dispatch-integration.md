<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime Dispatch Integration (Heterogeneous Bridge)

## Selected dispatch seam

The guarded seam is the provider dispatch boundary immediately before local provider invocation (`src/lib/control-plane/runtime-dispatch-integration.ts`).

## Why this seam is safest

- It is closest to runtime execution, so policy and scheduling decisions are enforced before any provider call.
- It preserves existing dispatch behavior with explicit pass-through when flags are disabled.
- It reuses existing bridge modules without reimplementing scheduling or remote transport internals.

## Default path (unchanged)

- `NEMOCLAW_HETEROGENEOUS_ROUTING` disabled: calls local dispatch unchanged.
- Heterogeneous enabled + governed disabled: still calls local dispatch unchanged.

## Guarded path

- Heterogeneous + governed enabled: wrapper builds a routing request and invokes `routeHeterogeneous`.
- Local candidate selected: local dispatch executes.
- Remote candidate selected: requires `NEMOCLAW_REMOTE_EXECUTION=1`; otherwise blocked explicitly.
- Policy `deny` or `approval_required`: blocked explicitly.
- No candidate: explicit degraded result with receipt/diagnostics.
- Receipt/events emit only on active governed heterogeneous path.

## Deferred seams

- Global command interception across non-provider actions.
- Autonomous/daemonized remote handoff.
- Dynamo orchestration and GPU-balancing policy beyond existing bridge primitives.
