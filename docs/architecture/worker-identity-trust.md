<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Worker identity and trust

- Worker identity is an explicit record (`workerId`, safe label, endpoint/provider).
- Self-reported capability claims are evidence only and are **not** automatic trust.
- Probe-observed telemetry improves confidence but is **not** authorization.
- Operator approval is explicit and policy-gated before remote eligibility.
- Revoked, expired, or conflicted attestations are blocked/degraded for remote execution.
- Remote execution remains opt-in and disabled by default.
- Cryptographic attestation and distributed orchestration are future work, not implemented in this phase.
