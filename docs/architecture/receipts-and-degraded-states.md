<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Receipts and degraded states

Implemented canonical receipt/degraded schemas with deterministic serialization.

Degraded taxonomy includes: healthy, constrained, degraded, unavailable, partial capability, approval blocked, stale, unreachable, unknown. Every degraded state carries reason code, timestamp, source component, subsystem, and operator explanation.

Receipts are append-friendly and replay-oriented but not yet fully wired to all runtime paths.

## Runtime receipt seam status (2026-05-09)

Execution receipt construction now includes policy rationale, tool metadata, fallback metadata, degraded states, and timing summary in a thin runtime seam adapter. Receipts are not emitted from every runtime path yet.
