<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verification Guide

This guide describes how to verify the correctness, security, and stability of the NemoClaw substrate.

## Core Verification

- **[Verification Matrix](verification-matrix.md):** The primary checklist for repository readiness.
- **[Verification Topology](verification-topology.md):** Unified map of all verification suites.
- **[Release Checklist](release-checklist.md):** Mandatory steps before cutting a release.

## Targeted Testing

- **[Security Hardening](security-hardening.md):** Verifying security controls and boundaries.
- **[Policy Verification](policy-verification.md):** Ensuring routing and network policies are enforced.
- **[Degraded State Chaos](degraded-state-chaos.md):** Verifying fail-closed behavior under failure conditions.

## Reports & Compliance

- **[Release Readiness Report](release-readiness.md):** Current status of the release candidate.
- **[Anti-Theatre Audit](anti-theatre-audit.md):** Verification that claims match implementation.
- **[Security Verification Matrix](security-verification-matrix.md):** Detailed security control pass/fail status.

## Commands

### Core Stability

```bash
npm run verify:core
```

### Release Readiness

```bash
npm run verify:release
```

### Changelog & Hygiene

```bash
npm run verify:changelog-hygiene
```
