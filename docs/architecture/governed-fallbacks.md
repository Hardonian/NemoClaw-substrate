<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governed Fallback Semantics

Status: **Implemented (planning data model)**.

Fallback behavior is represented explicitly as operator-visible planning records and is not silently executed.
Each fallback record includes origin candidate, fallback target, reason, policy/degraded status, and operator explanation.
