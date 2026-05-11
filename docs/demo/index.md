<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Demos & Walkthroughs

These walkthroughs provide concrete examples of how the NemoClaw substrate handles governed execution scenarios.

## Core Demos

- **[Governed Dispatch Walkthrough](governed-dispatch-walkthrough.md):** From request to sandboxed execution.
- **[Replay Investigation](replay-investigation.md):** Using `nemoclaw substrate replay` to audit a task.
- **[Policy Promotion Flow](policy-promotion-flow.md):** Proposing and approving a new network rule.

## Verification Demos

- **[Fail-Closed Simulation](fail-closed-simulation.md):** Seeing the substrate kill a process on policy violation.
- **[Degraded State Truth](degraded-state-truth.md):** How the system reports a partial failure without "faking" recovery.

## Benchmarks

- **[Throughput & Latency](benchmarks.md):** Performance of the governed control plane.
- **[Substrate Overhead](overhead-analysis.md):** The cost of governance.

## Fixtures

All demos use deterministic fixtures found in the `fixtures/` directory.
