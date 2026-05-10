<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Evidence Topology

## Proofpack / Evidence Chain

```mermaid
flowchart LR
  Runtime[Runtime Artifacts] --> Receipts[Receipts]
  Receipts --> Proofpack[Proofpack Assembly]
  Proofpack --> Integrity[Checksum / Integrity]
  Integrity --> Audit[Audit Review]
  Audit --> Export[Support-safe Export]
```
