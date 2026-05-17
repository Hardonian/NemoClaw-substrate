<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Review Automation

This document outlines the review check tooling used in the NemoClaw repository. These tools verify documentation, fixtures, and other assets to ensure they meet project standards without altering runtime semantics.

## Available Scripts

Located in `scripts/review/`:

- `check-claims.mjs`: Verifies that unsupported claims (e.g., "100%", "reliable") are absent or properly qualified.
- `check-doc-links.mjs`: Checks for broken internal links in markdown files.
- `check-status-matrix.mjs`: Ensures the status matrix in documentation uses only allowed status labels.
- `check-no-theatre.mjs`: Ensures no security theatre words (e.g., "military-grade") are used.
- `check-fixtures-redacted.mjs`: Validates that fixtures do not contain unredacted secrets.
- `check-spdx-docs.mjs`: Checks for SPDX headers in documentation files (where required).
- `check-proofpack.mjs`: Reviews evidence export and proofpack bundles.
- `check-doc-index.mjs`: Verifies that documentation index files exist.

## Usage

You can run all review checks using the aggregate NPM script:

```bash
npm run review:all
```
