<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime Integration (Safe Seams)

This document tracks low-risk runtime seams where governed execution primitives are integrated without changing default provider routing.

## Safe seams integrated now

- Control-plane runtime wrapper for action descriptors and policy evaluation (`src/lib/control-plane/runtime-seams.ts`).
- Explicit deny and approval-required blocking behavior for governed test actions.
- Receipt construction for provider/tool-like runtime events.
- Operator-readable diagnostics summary from latest receipt.

## Unsafe seams intentionally deferred

- Global interception of every command path.
- Automatic routed-provider remapping or scheduler handoff.
- Remote execution auto-enable.

## Receipt emission candidates

- Provider invocation wrappers.
- Sandbox tool/action dispatch wrappers.
- Diagnostic and dry-run execution paths.

## Policy enforcement candidates

- Sandbox command action descriptors.
- Tool/action execution wrappers.
- Test harness governed actions.

## Behavior preservation notes

- Default behavior remains pass-through unless policy explicitly returns deny or approval_required.
- Denials and approval requirements are surfaced as explicit operator-facing errors.
- Scheduler primitives remain scaffolded and are not yet altering runtime routing decisions.

- Runtime diagnostics summary now reports operational event counts from receipt-derived append-only events.
- Routing behavior remains unchanged; scheduler routing handoff is still planned.
