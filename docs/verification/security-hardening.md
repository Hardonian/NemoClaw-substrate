<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Hardening Verification

Security hardening coverage is deterministic and seam-level.
The tests prove policy behavior without adding remote execution, background polling, orchestration, queues, retries, GPU balancing, or Dynamo integration.

Targeted command:

```bash
npx vitest run src/lib/security/security-policy.test.ts src/lib/control-plane/remote-runtime-probes.test.ts src/lib/control-plane/remote-execution.test.ts src/lib/control-plane/local-runtime-probes.test.ts
```

Coverage includes:

- URL credential stripping
- unsupported scheme rejection
- local-only URL rejection
- private, public, LAN, and Tailscale/CGNAT classification
- timeout ceiling enforcement
- auth header redaction
- bearer and API key redaction
- receipt/event redaction
- diagnostics-shaped payload redaction
- command shell rejection
- command allowlist denial
- transport block before fetch/remote transport
- proofpack/export redaction preflight

Release verification remains:

```bash
npm run verify:release
```

For core release parity, also run:

```bash
npm run verify:core
npm run typecheck
npm run lint
npm run verify:changelog-hygiene
git diff --check
```
