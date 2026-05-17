<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Operational Checklist

This document defines the operational verification steps for NemoClaw go-live readiness. It covers pre-flight checks, launch verification, and post-launch monitoring.

## Pre-Flight Verification

### Environment Prerequisites

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Node.js version | `node --version` | v22.16+ |
| npm version | `npm --version` | Compatible with project |
| Docker available | `docker --version` | Docker daemon running |
| OpenShell installed | `openshell --version` | OpenShell runtime available |
| Disk space | `df -h` | At least 5 GB free |
| Network access | `curl -I https://build.nvidia.com` | 200 OK |

### Build Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Install dependencies | `npm install` | Completes without errors |
| Build CLI | `npm run build` (in `nemoclaw/`) | `dist/` output generated |
| Run linters | `make check` | Zero violations |
| Run tests | `npm test` | All pass |
| Type check CLI | `npm run typecheck:cli` | Zero errors |
| Verify hooks | `npx prek run --all-files` | All hooks pass |

### Configuration Readiness

- `~/.nemoclaw/` config directory exists or is created by `nemoclaw onboard`.
- Inference provider credentials are configured.
- Network policy presets match the target deployment environment.
- Agent-scoped model/provider compatibility registry is current.

### Security Pre-Flight

- No hardcoded secrets in source or config files.
- Docker capability drops and process limits are active.
- SSRF validation is enabled (`nemoclaw/src/blueprint/ssrf.ts`).
- Credential sanitization is active.

## Launch Verification

### Sandbox Initialization

| Step | Command | Verification |
|------|---------|--------------|
| Onboard | `nemoclaw onboard` | Config written to `~/.nemoclaw/` |
| Launch | `nemoclaw start` (or equivalent) | OpenShell container starts |
| Health check | `nemoclaw status` | Sandbox reports healthy |
| Network policy | `nemoclaw policy list` | Policies applied correctly |
| Inference test | Send a test prompt | Response received without credential leaks |

### Diagnostic Flows

- Run `nemoclaw diagnostics` to capture system state.
- Verify log output at the expected verbosity level.
- Confirm snapshot capture works for rollback readiness.

## Post-Launch Verification

### Operational Monitoring

| Check | Method | Frequency |
|-------|--------|-----------|
| Sandbox health | `nemoclaw status` | Continuous or on-demand |
| Resource utilization | Host metrics (CPU, memory, disk) | Every 5 minutes |
| Network egress | Policy audit logs | Every 15 minutes |
| Error rate | Application logs | Continuous |
| Credential exposure | Redaction validation | Every export or snapshot |

### Incident Response Readiness

- Rollback scripts are accessible and tested.
- Support escalation contacts are documented.
- Known limitations are reviewed by the operating team.
- Recovery procedures are understood by on-call personnel.

### Validation Checklist

- [ ] All pre-flight checks passed.
- [ ] Sandbox launched and responding.
- [ ] Network policies enforced.
- [ ] Inference provider functional.
- [ ] Logging at correct verbosity.
- [ ] Redaction validation passing.
- [ ] Monitoring dashboards active.
- [ ] Rollback path verified.

## Next Steps

- See [Operational Doctrine](operational-doctrine.md) for rollback, upgrade, monitoring, and escalation procedures.
