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
## 2026-05-09 telemetry operational taxonomy hardening
- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

- Registry updates emit `telemetry_registry_update_applied` when observed/partial telemetry is persisted.
- Registry updates emit `telemetry_registry_update_skipped` when unavailable telemetry preserves prior observed values.
- Conflicting source/provenance emits `telemetry_conflict_detected`; stale telemetry emits `telemetry_stale`.
- Event payloads include node id, telemetry source, confidence, reason code, and replay reference metadata.
