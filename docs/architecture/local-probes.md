<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local probes

NemoClaw local probes are explicit/manual diagnostics helpers. They do not run in background daemons and do not enable remote execution.

- Supported safe probes: provider metadata, command availability, and explicit local HTTP health/version endpoints (Ollama, vLLM, llama.cpp, NIM).
- Non-local URLs are rejected.
- Probe output is deterministic and reports explicit degraded/unavailable states.
