<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Operational Readiness Report

This document provides a template for Operational Readiness Reports (ORR) for NemoClaw. Complete each section before declaring a release ready for deployment.

## Report Metadata

| Field | Value |
|-------|-------|
| Release version | |
| Report date | |
| Prepared by | |
| Reviewed by | |
| Target deployment | |

## Release Summary

Brief description of the release contents and objectives.

## Hardened Subsystems

### CLI and Plugin

| Check | Status | Evidence |
|-------|--------|----------|
| Build passes | [ ] Pass [ ] Fail | `npm run build` output |
| Tests pass | [ ] Pass [ ] Fail | `npm test` output |
| Linters pass | [ ] Pass [ ] Fail | `make check` output |
| Type check passes | [ ] Pass [ ] Fail | `npm run typecheck:cli` output |
| Git hooks pass | [ ] Pass [ ] Fail | `npx prek run --all-files` output |
| Coverage thresholds met | [ ] Pass [ ] Fail | Coverage report |

### Sandbox Orchestration

| Check | Status | Evidence |
|-------|--------|----------|
| OpenShell container starts | [ ] Pass [ ] Fail | Sandbox launch log |
| Sandbox health check passes | [ ] Pass [ ] Fail | `nemoclaw status` output |
| Workspace files preserved | [ ] Pass [ ] Fail | File integrity check |
| Lifecycle commands work | [ ] Pass [ ] Fail | start/stop/status/restart |

### Network Policy

| Check | Status | Evidence |
|-------|--------|----------|
| Policy presets load | [ ] Pass [ ] Fail | `nemoclaw policy list` output |
| Egress control enforced | [ ] Pass [ ] Fail | Policy test results |
| SSRF validation active | [ ] Pass [ ] Fail | SSRF test results |
| Custom policies apply | [ ] Pass [ ] Fail | Custom policy test |

### Inference Routing

| Check | Status | Evidence |
|-------|--------|----------|
| Provider connectivity | [ ] Pass [ ] Fail | Test prompt response |
| Credential redaction | [ ] Pass [ ] Fail | Redaction validation |
| Sub-agent routing | [ ] Pass [ ] Fail | Sub-agent test |
| Provider failover | [ ] Pass [ ] Fail | Failover test |

### Security Controls

| Check | Status | Evidence |
|-------|--------|----------|
| No hardcoded secrets | [ ] Pass [ ] Fail | Secret scan results |
| Docker capability drops | [ ] Pass [ ] Fail | Container inspect output |
| Process limits enforced | [ ] Pass [ ] Fail | Container limits |
| Redaction layer validated | [ ] Pass [ ] Fail | `isExportSafe` test |

### Blueprint and Policies

| Check | Status | Evidence |
|-------|--------|----------|
| Blueprint YAML valid | [ ] Pass [ ] Fail | Blueprint validation |
| Policy presets current | [ ] Pass [ ] Fail | Preset review |
| Model compatibility registry | [ ] Pass [ ] Fail | Registry validation |

## Known Issues

List any known issues accepted for this release:

| Issue | Severity | Workaround | Target Fix Version |
|-------|----------|------------|--------------------|
| | | | |

## Rollback Readiness

| Check | Status |
|-------|--------|
| Rollback scripts tested | [ ] Pass [ ] Fail |
| Pre-upgrade snapshots functional | [ ] Pass [ ] Fail |
| Rollback documentation current | [ ] Pass [ ] Fail |

## Deployment Readiness

| Check | Status |
|-------|--------|
| Packaging complete | [ ] Pass [ ] Fail |
| Installation instructions verified | [ ] Pass [ ] Fail |
| Compatibility matrix current | [ ] Pass [ ] Fail |
| Support team notified | [ ] Pass [ ] Fail |

## Sign-Off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Release Manager | | | [ ] Approve [ ] Reject |
| Security Reviewer | | | [ ] Approve [ ] Reject |
| Operations Lead | | | [ ] Approve [ ] Reject |

## Next Steps

- See [Operational Checklist](operational-checklist.md) for deployment verification steps.
- See [Release Maturity Summary](release-maturity-summary.md) for versioning and reproducibility evidence.
