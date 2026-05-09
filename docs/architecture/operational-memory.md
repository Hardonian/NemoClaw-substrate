<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Operational memory

## Status (2026-05-09)
Implemented scaffold in `src/lib/control-plane/operational-memory.ts`.

Operational memory is append-only, supervised, inspectable, and deterministic. It records receipts, policy outcomes, fallback events, degraded-state events, scheduler outcomes, operator overrides, runtime action descriptors, diagnostics snapshots, and replay metadata.

## Guardrails

- No autonomous learning.
- No automatic policy mutation.
- No hidden routing bias.
- No conversational/chat memory semantics.
