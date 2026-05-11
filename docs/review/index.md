<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Reviewer Guide

This guide is for security reviewers, infrastructure leads, and auditors evaluating the NemoClaw substrate.

## High-Level Assessment

- **[Project Identity](../README.md):** The core mission and anti-theatre doctrine.
- **[Governance Invariants](../architecture/governance-invariants.md):** The non-negotiable rules of the substrate.
- **[Capability Truth Matrix](../architecture/capability-status-matrix.md):** What is actually implemented vs what is planned.

## Security Review

- **[Security Threat Model](../architecture/security-threat-model.md):** Our assessment of risks and mitigations.
- **[Trust Boundaries](../architecture/security-policy.md):** Where we draw the line between high-trust and untrusted code.
- **[Redaction Doctrine](../architecture/secret-redaction-doctrine.md):** How we prevent credential leakage in telemetry.
- **[Command Safety](../architecture/command-execution-safety.md):** How we govern tool execution.

## Audit & Verification

- **[Evidence Topology](../architecture/evidence-topology.md):** How execution receipts and proofpacks are structured.
- **[Verification Topology](../verification/verification-topology.md):** The suites we use to ensure the system behaves as claimed.
- **[Anti-Theatre Audit](../verification/anti-theatre-audit.md):** Our methodology for ensuring claims match implementation.

## Compliance

- **[License](../LICENSE):** Apache 2.0.
- **[SPDX Hygiene](spdx-hygiene.md):** Our commitment to license tracking in every file.
