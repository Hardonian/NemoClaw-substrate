<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Receipts and degraded states

Implemented canonical receipt/degraded schemas with deterministic serialization.

Degraded taxonomy includes: healthy, constrained, degraded, unavailable, partial capability, approval blocked, stale, unreachable, unknown. Every degraded state carries reason code, timestamp, source component, subsystem, and operator explanation.

Receipts are append-friendly and replay-oriented but not yet fully wired to all runtime paths.
