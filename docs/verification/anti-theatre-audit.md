<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Anti-Theatre Audit

## Findings

1. Avoid phrasing that implies autonomous orchestration or hidden remediation.
2. Avoid language implying distributed execution as current default.
3. Avoid "autonomous recovery" wording unless explicitly bounded and operator-visible.
4. Keep degraded-state semantics explicit (not silently masked as success).
5. Execution lifecycle proofpacks must reject hidden fallback or automatic retry payloads.
6. Diagnostics must report unavailable or not implemented facts directly instead of substituting inferred success.

## Wording corrections

- Replace **"auto-orchestrates"** with **"executes operator-invoked workflows under policy controls"**.
- Replace **"self-heals"** with **"surfaces degraded states and requires operator action"**.
- Replace **"distributed substrate"** with **"single-sandbox governed substrate with bounded remote adapters"**.
- Replace **"AI policy learning"** with **"declarative policy evaluation and supervised promotion"**.

## Execution lifecycle constraints

Implemented lifecycle functions are pure and caller-invoked. They do not:

- start queue workers
- poll for expired leases in the background
- reschedule failed work
- renew leases automatically
- execute fallback paths silently
- enable remote execution
- infer operator approval

`verify:execution-lifecycle` covers hidden fallback detection, hidden retry detection, unavailable diagnostics, split-brain lease rejection, stale-owner rejection, replay drift rejection, and proofpack tamper rejection.
