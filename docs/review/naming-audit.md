<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Naming Audit

This audit separates low-risk cleanup from names that should remain stable until the API surface is intentionally versioned.

## Findings Fixed In This Pass

| Area | Problem | Fix |
|---|---|---|
| README and review docs | Repeated broad phrases such as "operator truth", "governed substrate", and long non-goal lists | Replaced with direct claims, evidence links, and one canonical non-claims section |
| Demo pages | Placeholder filenames as page titles | Replaced with task-oriented titles and commands |
| ADR index | Titles did not match several ADR files | Updated index and ADR titles to the actual decisions |
| Changelog | Machine-like bullet pile and duplicate `Unreleased` heading | Rewritten into normal release-note groups |

## Names To Keep For Now

| Name | Keep because | Risk if renamed casually |
|---|---|---|
| `ExecutionPlan` | It is already the root lifecycle record in tests and docs. | Broad rename would churn contracts without changing behavior. |
| `ExecutionReceipt` | It names the evidence artifact clearly enough and is used across replay/proofpack paths. | Renaming would break review links and serialized examples. |
| `OperationalMemoryLog` | Imperfect, but it accurately signals in-process append-only evidence rather than durable storage. | A softer name could hide the in-memory limitation. |
| `governed-provider-routing` | Verbose, but it marks the opt-in policy boundary. | Shorter names such as `router` would overstate ownership. |
| `proofpack` | Project vocabulary already uses it for evidence bundles. | Replacing it with a generic artifact name would make docs less searchable. |

## Rename Candidates For Later

| Current name | Suggested direction | Reason to defer |
|---|---|---|
| `substrate` in broad prose | Prefer `control-plane contracts`, `lifecycle records`, or the exact subsystem | The term is still embedded in filenames and tests. |
| `governed` in repeated prose | Use only when a feature flag or policy check is actually involved | Broad wording can make normal helpers sound larger than they are. |
| `anti-theatre` | Keep in historical docs; prefer `claim-to-proof` in reviewer docs | Renaming files would cause link churn. |
| `PolicyPromotionProposal` | `PolicyChangeProposal` may be clearer | Only worth changing when promotion flow is implemented beyond recommendations. |

## Rule Going Forward

Use the smallest name that tells a reviewer where the authority lives. If the authority is a fixture, say fixture. If it is a test helper, say test helper. If it is a future design, say planned.
