<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Proofpack Review Checks

This document defines the automated checks performed on Proofpack and Evidence Export bundles.

## Automated Checks

Located in `scripts/review/check-proofpack.mjs`.

Currently, Proofpack support in the repository is partial. The review script verifies that basic validation exists at the fixture level and that this documentation is present.

Future updates will include:
- Manifest hash checker
- Redaction checker
- Replay linkage checker
