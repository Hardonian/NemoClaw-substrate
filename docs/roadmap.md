<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Roadmap

The near-term roadmap is intentionally small. The repo needs fewer claims and stronger proof before it needs more orchestration.

## Next Useful Work

| Work | Why it matters | Constraint |
|---|---|---|
| Persist lifecycle records | In-process proof is not enough for crash recovery. | Preserve deterministic replay validation. |
| Add policy linting | Misconfigured policy is the most likely operator error. | Lint must fail closed and avoid hidden mutation. |
| Improve fixture generation | Review demos should be concrete and easy to refresh. | Fixtures must remain deterministic. |
| Wire one real opt-in remote worker proof | The guarded adapter needs one end-to-end live proof eventually. | No background workers, no hidden retries, no default remote execution. |
| Narrow old docs | Reviewers should not have to read overlapping doctrine pages. | Preserve important evidence links and historical context. |

## Deferred

- distributed execution fabric;
- GPU balancing;
- Dynamo integration;
- automatic policy learning;
- autonomous recovery daemons;
- cryptographic attestation chain.

Each deferred item needs a specific ADR and verification plan before implementation.
