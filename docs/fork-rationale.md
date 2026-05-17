<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Fork Rationale

The fork exists to make NemoClaw easier to review as a control-plane project, not to claim a new autonomous runtime.

Upstream NemoClaw provides the CLI, OpenShell sandbox workflow, blueprint, and onboarding path. This fork adds evidence-oriented contracts around execution decisions: plans, queue records, leases, receipts, replay validation, degraded states, and proofpack/export helpers.

The review question is simple: when a decision happens, can a human trace the request, policy context, trust context, result, and failure reason without trusting prose?

## Current Shape

- Default local behavior remains the baseline.
- Governed routing and remote execution are opt-in.
- Operator demo output is fixture-backed.
- Verification relies on local tests and scripts.
- Future distributed execution remains a non-claim.

## Why This Is Worth Keeping

The fork makes later orchestration safer to review because it first defines how evidence is created, validated, rejected, and exported.
