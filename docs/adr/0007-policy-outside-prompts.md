<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR 0007: Policy Outside Prompts
- Status: Proposed
## Context
Prompt-only policy is difficult to inspect, test, and enforce consistently.
## Decision
Policy must be represented in inspectable code/config artifacts and evaluated by control-plane logic.
## Consequences
Governance remains transparent, versionable, and testable.
## Alternatives considered
Embed policy primarily in prompts/system instructions; rejected because it is not sufficient for auditable enforcement.
## Verification implications
Policy validation and decision tests must run from repository artifacts, not only prompt snapshots.
