<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Go-Live Checklist

- [ ] `verify:release` passes on candidate commit.
- [ ] `verify:all` passes for strict core semantics.
- [ ] `verify:chaos` confirms degraded-state truth and no hidden retries.
- [ ] replay validation confirms deterministic replayability.
- [ ] trust validation confirms worker identity and policy gates.
- [ ] telemetry validation confirms explicit degraded/healthy states.
- [ ] proofpack validation confirms evidence export integrity.
- [ ] queue validation confirms deterministic lease/queue behavior.
- [ ] docs gate (`docs:strict`) passes for reviewer-facing artifacts.
- [ ] anti-theatre audit reviewed and signed off.
