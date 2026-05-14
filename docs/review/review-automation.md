<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Review Automation

These scripts are reviewer guardrails. They do not prove the architecture is correct, but they catch common ways the repository can drift into unsupported claims, broken links, unredacted fixtures, or misleading status language.

## Available Scripts

Located in `scripts/review/`:

- `check-claims.mjs`: Rejects unsupported assurance claims in `README.md`, `CHANGELOG.md`, and `docs/`.
- `check-doc-links.mjs`: Checks for broken internal links in markdown files.
- `check-status-matrix.mjs`: Validates explicitly marked status matrices against canonical labels.
- `check-no-theatre.mjs`: Rejects wording that implies unverified assurance or invisible behavior.
- `check-fixtures-redacted.mjs`: Validates that fixtures do not contain unredacted secrets.
- `check-spdx-docs.mjs`: Checks for SPDX headers in documentation files (where required).
- `check-proofpack.mjs`: Reviews evidence export and proofpack bundles.
- `check-doc-index.mjs`: Verifies that documentation index files exist.

## Usage

You can run all review checks using the aggregate NPM script:

```bash
npm run review:all
```

The status checker intentionally requires a marker before it validates a table:

```markdown
<!-- status-matrix: canonical -->
```

That keeps ordinary tables with a `Status` column from being treated as capability claims.
