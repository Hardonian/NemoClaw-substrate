<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verification Topology

```mermaid
flowchart TD
  PR[PR / Branch] --> Core[verify:core]
  PR --> Chaos[verify:chaos]
  PR --> All[verify:all]
  PR --> Release[verify:release]
  PR --> Docs[docs:strict]

  Core --> Gate1{Fail-closed checkpoints pass?}
  Chaos --> Gate2{Degraded-state behavior truthful?}
  Docs --> Gate3{Documentation build integrity?}

  Gate1 --> RC[Release Candidate Ready]
  Gate2 --> RC
  Gate3 --> RC

  RC --> AntiTheatre[Anti-theatre governance review]
  AntiTheatre --> GoNoGo[Go/No-Go]
```
