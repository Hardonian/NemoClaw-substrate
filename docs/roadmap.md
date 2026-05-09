<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Fork Roadmap

## Workstreams

1. **docs/foundation**
   - codify fork mission, architecture, and contribution protocols
2. **control-plane scaffolding**
   - canonical control interfaces and decision envelopes
3. **device registry**
   - host/device/GPU capability inventory and health model
4. **deterministic scheduler**
   - stable routing decisions from explicit inputs + policies
5. **policy engine**
   - policy evaluation, versioning, supervised promotion
6. **receipts/degraded states**
   - execution receipts and explicit degraded-state semantics
7. **operational memory**
   - durable operator decision memory and replayable context
8. **observability**
   - control-plane telemetry, traces, and operator diagnostics
9. **hardening**
   - attack-surface reduction and fail-closed behavior on sensitive paths

## Sequence

- Start with docs/foundation and control-plane scaffolding.
- In parallel, establish device registry contracts.
- Build deterministic scheduler after registry contracts are stable.
- Add policy engine and receipts/degraded states before broad rollout.
- Layer operational memory + observability for safe iteration.
- Continuously run hardening in parallel with implementation.
