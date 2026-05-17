<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governed Degraded State Semantics

Status: **Implemented (planning data model)**.

Degraded State behavior is represented explicitly as operator-visible planning records and is not silently executed.
Each degraded state record includes origin candidate, degraded state target, reason, policy/degraded status, and operator explanation.
