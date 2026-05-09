<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Registry telemetry persistence policy

Registry telemetry updates preserve provenance and operate deterministically.

Policy:
- Observed telemetry may update matching fields.
- Unavailable telemetry does not erase previously observed fields.
- Stale telemetry is marked stale and retained.
- Conflicting sources are tagged as conflicts with source attribution.
- Telemetry is non-authoritative and does not auto-route by default.
