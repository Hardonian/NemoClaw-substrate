<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Runtime capability model

Implemented `CapabilitySnapshot`, `ModelCapability`, `GpuCapability`, and `RuntimeCapabilityFlags` to support future deterministic scheduler scoring and policy eligibility checks.

Current phase defines contracts only; it does not change inference routing behavior.
