<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verification Topology

## Verification command map

- `verify:release`: release gate aggregate (`verify:changelog-hygiene`, `verify:core`, `typecheck`, `lint`, `verify:chaos`)
- `verify:all`: strict core verification
- `verify:core`: governed substrate core checks
- `verify:execution-lifecycle`: deterministic execution plan, queue, lease, replay, proofpack, diagnostics, and anti-theatre coverage
- `verify:chaos`: degraded-state chaos scenarios
- `docs:strict`: Sphinx build with warnings-as-errors

## CI / Release Gate topology

```mermaid
flowchart TD
  Change[Code/Docs change] --> Hygiene[verify:changelog-hygiene]
  Change --> Core[verify:core]
  Change --> Lifecycle[verify:execution-lifecycle]
  Change --> Chaos[verify:chaos]
  Change --> Strict[verify:all]
  Change --> Docs[docs:strict]

  Hygiene --> GateA[Release hygiene gate]
  Core --> GateB[Fail-closed gate]
  Lifecycle --> GateC[Lifecycle substrate gate]
  Chaos --> GateD[Degraded-state truth gate]
  Strict --> GateF[Replay + trust + telemetry integrity]
  Docs --> GateE[Docs integrity gate]

  GateA --> RC[RC decision]
  GateB --> RC
  GateC --> RC
  GateD --> RC
  GateF --> RC
  GateE --> RC
```
