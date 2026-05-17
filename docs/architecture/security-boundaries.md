<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Boundaries

```mermaid
flowchart TD
  Operator[Operator CLI] --> Policy[Policy Engine Boundary]
  Policy --> Sandbox[OpenShell Sandbox Boundary]
  Sandbox --> Agent[Agent Runtime Boundary]
  Agent --> Egress[Network Policy Boundary]
  Sandbox --> Secrets[Credential Sanitization Boundary]
  Agent --> Evidence[Receipt/Evidence Boundary]
```

Security posture is fail-closed at policy, trust, and network checkpoints.
