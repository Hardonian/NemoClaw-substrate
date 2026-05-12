<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Architecture Index

Start with the concise map, then open the deeper pages only when a review question needs them.

## First Pass

- [Decision map](decision-map.md): decisions, implementation files, tests, and ADR links.
- [Tradeoffs](tradeoffs.md): why the repo delays orchestration and keeps proof paths explicit.
- [Capability status matrix](capability-status-matrix.md): implemented, deferred, and non-claim areas.
- [Execution lifecycle](execution-lifecycle-substrate.md): plan, queue, lease, receipt, replay, proofpack, and diagnostics records.

## Security And Trust

- [Security boundaries](security-boundaries.md)
- [Security policy](security-policy.md)
- [Command safety](command-safety.md)
- [Secret redaction](secret-redaction.md)
- [Remote probe security](remote-probe-security.md)
- [Worker identity and trust](worker-identity-trust.md)

## Runtime And Evidence

- [Runtime dispatch integration](runtime-dispatch-integration.md)
- [Heterogeneous routing](heterogeneous-routing.md)
- [Replayability](replayability.md)
- [Receipts and degraded states](receipts-and-degraded-states.md)
- [Evidence topology](evidence-topology.md)
- [Diagnostics](diagnostics.md)

## Historical Detail

The older cartography, governance, and glossary pages remain useful for background, but they are no longer the fastest review path. Prefer the decision map and evidence index when checking current implementation truth.
