<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# NemoClaw Fork: Local Operator-Grade AI Execution and Governance

This repository is a fork of NVIDIA NemoClaw. It preserves NemoClaw's existing sandbox orchestration base and focuses this fork on operator-grade local execution control, policy governance, and truthful operations reporting.

## Fork Purpose

This fork exists to make local AI operations safer and more governable when running across heterogeneous devices and model runtimes.

Core intent:

- **Local operator-grade execution and governance:** controls should be explicit, inspectable, and durable.
- **Heterogeneous device awareness:** device and runtime differences must be first-class inputs to execution decisions.
- **Deterministic control:** equivalent inputs and policy should produce equivalent routing/control decisions.
- **Truthful degraded-state reporting:** degraded behavior must be surfaced explicitly, never hidden behind "healthy" language.
- **Policy outside prompts:** policy must be enforced by code/config paths, not only natural-language prompts.
- **Supervised policy intelligence:** repeated operator decisions should become reviewable policy improvements, not silent behavioral drift.

## Current State (Grounded in Repo Today)

Current implemented baseline (inherited from upstream NemoClaw architecture in this repo):

- CLI launcher and command stack (`bin/`, `src/lib/`).
- NemoClaw plugin code and blueprint runtime logic (`nemoclaw/src/`).
- Blueprint and network-policy definitions (`nemoclaw-blueprint/`).
- Setup, automation, and validation scripts (`scripts/`).
- User/reference docs and contributor-facing docs (`docs/`).

This is an alpha codebase whose interfaces may change.

## Intended Roadmap (Not Yet Fully Implemented)

This fork is evolving toward:

- stronger deterministic control-plane semantics,
- heterogeneous device-aware scheduling and routing,
- structured execution receipts/provenance,
- explicit degraded-state contracts,
- supervised policy-promotion workflows based on repeated operator decisions.

See `docs/roadmap.md` for sequencing and workstreams.

## Operational Goals

1. Preserve least-astonishment operations for local operators.
2. Make routing/control behavior explicit and testable.
3. Expose degraded truth quickly and clearly.
4. Keep governance enforceable through repository-managed policy artifacts.
5. Increase auditability and replayability as control capabilities evolve.

## Non-Goals

- Claiming capabilities not present in the current codebase.
- Hiding degraded behavior behind optimistic UX or logs.
- Prompt-only governance with no enforceable policy path.
- Silent auto-tuning that changes control behavior without operator review.

## Roadmap Themes

- Documentation and contributor workflow foundation.
- Deterministic control-plane scaffolding.
- Device capability awareness and scheduling contracts.
- Policy evaluation/versioning and supervised promotion.
- Receipt/provenance and degraded-state semantics.
- Hardening, observability, and verification depth.

## Contribution Expectations

Contributors are expected to:

- Keep claims grounded in repository truth today.
- Clearly separate **current state** from **intended roadmap** in docs/PRs.
- Use branch naming, commit style, and PR structure conventions:
  - `docs/contributing/branch-strategy.md`
  - `docs/contributing/pr-template-guide.md`
- Include verification notes in every PR: commands run, outcomes, and known limitations.

## Additional Fork Docs

- Fork rationale: `docs/fork-rationale.md`
- Roadmap: `docs/roadmap.md`
- Branch strategy: `docs/contributing/branch-strategy.md`
- PR template guide: `docs/contributing/pr-template-guide.md`
- Changelog: `CHANGELOG.md`
