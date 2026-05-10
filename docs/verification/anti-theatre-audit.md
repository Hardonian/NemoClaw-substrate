<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Audit

## Findings

1. Avoid phrasing that implies autonomous orchestration or hidden remediation.
2. Avoid language implying distributed execution as current default.
3. Avoid "self-healing" wording unless explicitly bounded and operator-visible.
4. Keep degraded-state semantics explicit (not silently masked as success).

## Wording corrections

- Replace **"auto-orchestrates"** with **"executes operator-invoked workflows under policy controls"**.
- Replace **"self-heals"** with **"surfaces degraded states and requires operator action"**.
- Replace **"distributed substrate"** with **"single-sandbox governed substrate with bounded remote adapters"**.
- Replace **"AI policy learning"** with **"declarative policy evaluation and supervised promotion"**.
