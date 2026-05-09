<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Control Plane
## Purpose
Define deterministic decision contracts that govern execution-plane actions.
## Current repo status
Planned as a dedicated layer. Current repository has execution commands and policy/config surfaces, but not a standalone control-plane module.
## Target behavior
Introduce explicit pre-execution decision flow: request normalization, policy evaluation, approval gates, scheduling, and receipt emission.
## Key contracts/types expected
Canonical request envelope; decision result; policy verdict; approval result; execution receipt reference.
## Failure/degraded behavior
Fail closed for missing policy-critical inputs. Emit explicit degraded-state reason codes for non-critical data gaps.
## Verification expectations
Contract tests for deterministic outputs under fixed inputs; integration tests proving execution actions require control-plane decision artifacts.
## Dependencies
Policy engine, device registry, receipt primitives.
## Non-goals
Not a UI dashboard layer; not autonomous policy mutation.
## Open questions
Where contracts should live (`src/lib/domain/*` vs new control-plane package) and how to version decision schemas.
