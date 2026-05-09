<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Secret Redaction

Secret redaction is centralized through `src/lib/security/redact.ts` and the higher-level payload helpers in `src/lib/security/security-policy.ts`.
The policy redacts strings and structured payloads before diagnostics, receipts, events, telemetry metadata, or export preflight can persist them.

The redaction helpers cover:

- authorization and proxy authorization headers
- bearer tokens
- API keys and common provider token prefixes
- URL usernames and passwords
- environment-like key names such as `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, and `*_API_KEY`
- receipt payloads
- operational event payloads
- diagnostics payloads
- proofpack/export payloads

Operational memory redacts payloads at append time.
Diagnostics use the unified full redactor, which now strips URL credentials as well as token-shaped values.
Proofpack/export helpers return redacted payload previews, but the default export policy blocks secret-bearing exports instead of silently writing a sanitized substitute.
