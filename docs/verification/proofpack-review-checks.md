<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Proofpack Review Checks

This document defines the automated checks performed on Proofpack and Evidence Export bundles.

## Automated Checks

Located in `scripts/review/check-proofpack.mjs`.

### Proofpack Fixture Validation

The review script performs the following checks on proofpack fixtures:

1. **Fixture discovery** — Scans `fixtures/`, `fixtures/demo/`, and `fixtures/generated/` for `proofpack.json`
2. **Manifest hash presence** — Verifies `manifestHash` is a non-empty hex string
3. **Redaction check** — Scans all string values for secret patterns (NVIDIA API keys, OpenAI keys, GitHub tokens)
4. **State explicitness** — Verifies `unavailable`/`degraded` states have matching boolean flags
5. **Replay linkage** — Logs cross-references to linked receipts and trust decisions
6. **ID format validation** — Checks that `runId`/`planId` fields are non-empty strings
7. **Generated fixture integrity** — Validates generated proofpack fixtures have:
   - `redacted: true` marker
   - Valid `manifestHash` matching computed content hash
   - Non-empty `receipts` array
   - Standard receipt/trust decision ID formats

### Documentation Requirement

The script also verifies that `docs/verification/proofpack-review-checks.md` exists.

## Status

Proofpack support in the repository is **partial**. The review script validates fixture-level structure and redaction. Full runtime proofpack export/manifest generation is not yet implemented.

Planned future enhancements:
- Full manifest hash generation during proofpack export
- Complete replay linkage validation (receipt-to-proofpack chain)
- Cross-proofpack consistency checks
