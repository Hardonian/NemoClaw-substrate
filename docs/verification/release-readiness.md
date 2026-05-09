<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Release readiness

## 2026-05-09 telemetry event taxonomy audit
- Flags/defaults: no routing default changes; telemetry remains evidence-only.
- Policy gates: no auto-mutation, no auto-routing, no background polling.
- Receipt/event coverage: explicit telemetry probe/parse/update outcomes emitted with replay references.
- Diagnostics/observability: telemetry counts, confidence bands, and source summaries are aggregated.
- Replayability: lineage/reason codes preserved for telemetry events.
- Security: event payloads avoid auth tokens and secret material.
- Environment/bootstrap risks: command/tool availability can yield `telemetry_unavailable` and must remain non-fatal.
- Known non-goals: no orchestration, no Dynamo/GPU balancing, no autonomous policy actions.

- Registry telemetry persistence is verified for applied/skipped/conflict/stale event emission with deterministic ordering and replay-safe payloads.

## 2026-05-09 degraded-state chaos gate
- Deterministic chaos coverage is required before orchestration expansion.
- Required fixture classes: stale registry, telemetry unavailable/malformed, remote timeout, policy deny/approval_required, no eligible candidate, failed fallback, replay mismatch, diagnostics empty state.
- Release evidence includes explicit reason-code assertions in receipts/events/diagnostics.
