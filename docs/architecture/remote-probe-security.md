<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Remote probe and execution security

Remote probe and remote execution seams are deny-by-default and policy-governed.

For remote execution specifically:

- disabled unless `NEMOCLAW_REMOTE_EXECUTION=1`
- auth metadata is redacted in diagnostics/receipts/events
- non-2xx, timeout, malformed response, auth rejection, and network-unavailable paths are explicit degraded truths
- no silent fallback and no trust escalation from probe-only data
