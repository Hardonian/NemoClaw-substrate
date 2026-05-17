<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Placeholder

Implemented adapter seam and scheduler dry-run diagnostics only. Live routing is unchanged, remote execution is disabled by default, Dynamo/GPU telemetry adapters are planned.

## 2026-05-09 governed routing update

Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.
