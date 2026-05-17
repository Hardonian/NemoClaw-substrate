<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local probes

NemoClaw local probes are explicit/manual diagnostics helpers. They do not run in background daemons and do not enable remote execution.

- Supported safe probes: provider metadata, command availability, and explicit local HTTP health/version endpoints (Ollama, vLLM, llama.cpp, NIM).
- Non-local URLs are rejected.
- Probe output is deterministic and reports explicit degraded/unavailable states.

## 2026-05-09 telemetry truth update

- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.
