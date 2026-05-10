<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime Topology

## Replay Topology

```mermaid
flowchart TD
  Event[Runtime Event] --> Receipt[Receipt Writer]
  Receipt --> Store[Operational Memory]
  Store --> Replay[Replay Engine]
  Replay --> Validation[Replay Integrity Validation]
  Validation --> Export[Evidence Export]
```

## Telemetry Lifecycle Topology

```mermaid
flowchart LR
  Adapters[Telemetry Adapters] --> Parsers[Runtime Telemetry Parsers]
  Parsers --> Normalize[Normalization]
  Normalize --> Policy[Policy/Health Gates]
  Policy --> Dashboard[Operator-facing State]
  Dashboard --> Archive[Evidence + Retention]
```
