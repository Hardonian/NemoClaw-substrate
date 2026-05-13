<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Operational Doctrine

**Last reviewed:** 2026-05-13
**Code:** `src/lib/` (CLI logic), `src/lib/control-plane/` (lifecycle, execution, memory)
**Tests:** `src/lib/control-plane/operational-memory.test.ts`, `src/lib/control-plane/remote-execution.test.ts`, `src/lib/control-plane/remote-execution-proof.test.ts`

This document unifies the operational lifecycle expectations for NemoClaw: logging, SLA metrics, escalation paths, upgrade procedures, and rollback operations. It replaces the former Supportability Doctrine, Upgrade Doctrine, and Rollback Doctrine.

## Part 1 — Observability and Support

### Log Levels

| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | A failure that prevents sandbox operation | Sandbox failed to start, inference provider unreachable |
| WARN | A condition that may affect operation but does not prevent it | Network policy denied egress, deprecated config key |
| INFO | Normal operational events | Sandbox launched, policy applied, snapshot created |
| DEBUG | Detailed information for troubleshooting | Request/response payloads, internal state transitions |

### Log Output

- Machine-readable logs go to standard error.
- Human-readable status output goes to standard output.
- File logs are stored under `~/.nemoclaw/logs/` when enabled.

### Log Format

Each entry contains: ISO 8601 timestamp, log level, component name, and structured message.

### Redaction in Logs

All log output passes through the redaction layer before writing. Secrets are never included in logs. See [Redaction Guarantees](redaction-guarantees.md) for details.

### SLA Metrics

| Component | Target | Measurement |
|-----------|--------|-------------|
| CLI responsiveness | Sub-second for status commands | Command execution time |
| Sandbox startup | Under 30 seconds | Time from `nemoclaw start` to healthy status |
| Inference routing | Provider-dependent, no added latency | Round-trip time to inference provider |
| Policy enforcement | Immediate | Time from policy change to enforcement |

### Monitoring Indicators

| Indicator | Healthy State | Degraded State |
|-----------|---------------|----------------|
| `nemoclaw status` exit code | 0 | Non-zero |
| Sandbox container state | Running | Stopped, restarting, or errored |
| Inference provider reachability | Responsive | Timeout or error response |
| Network policy enforcement | Active | Policy load failure |
| Disk space available | Sufficient for operation | Low disk warning |

### Escalation Paths

**Tier 1 — Self-Service:** Run `nemoclaw diagnostics`, review [troubleshooting.md](reference/troubleshooting.md), check [known-limitations.md](known-limitations.md), and review the [Operational Checklist](operational-checklist.md).

**Tier 2 — Community:** Search [GitHub issues](https://github.com/NVIDIA/NemoClaw), open a new issue with diagnostics output, or join the Discord community.

**Tier 3 — NVIDIA Support:** Report security vulnerabilities via [SECURITY.md](https://github.com/NVIDIA/NemoClaw/blob/main/SECURITY.md). For enterprise support, contact NVIDIA Agent Toolkit support.

**Escalate immediately** when: a security vulnerability is suspected, data loss has occurred or is imminent, or the sandbox is unrecoverable and rollback has failed.

### Diagnostic Commands

| Command | Purpose |
|---------|---------|
| `nemoclaw status` | Check sandbox health |
| `nemoclaw diagnostics` | Capture full system state |
| `nemoclaw config-validate` | Validate configuration |
| `nemoclaw policy list` | List active network policies |
| `nemoclaw policy lint` | Lint policy files against schema (Phase 2) |
| `make check` | Run all linters |
| `npm test` | Run all tests |

## Part 2 — Version Lifecycle

### Upgrade Strategies

**In-Place Upgrade** (minor/patch releases):

1. `nemoclaw config-snapshot --pre-upgrade`
2. `npm install`
3. `npm run build:cli`
4. `npm test`
5. Verify sandbox health with `nemoclaw status`

**Blue-Green Upgrade** (major versions or schema changes):

1. Deploy new version alongside current (zero-downtime)
2. Route traffic incrementally
3. Validate against [compatibility gates](#compatibility-gates)
4. Decommission old version after verification
5. Rollback path: restore snapshot per [Rollback Procedures](#rollback-procedures)

### Data Migration

| Layer | Tool | Notes |
|-------|------|-------|
| Configuration | `nemoclaw onboard --migrate` | Preserves existing values |
| Blueprint | YAML validation against schema | See `schemas/` directory |
| Workspace | Export/import via `nemoclaw backup-all` | Preserves workspace state |

### Compatibility Gates

**Pre-upgrade checks:** Node.js v22.16+, OpenShell latest compatible, blueprint schema v1 passes, `npm test` green, `npx tsc --noEmit` clean.

**Post-upgrade checks:** `nemoclaw status` returns healthy, sandbox responds, policy enforcement active, no regression in test suite.

### Version Compatibility Matrix

| Component | Alpha Current |
|-----------|---------------|
| Node.js | v22.16+ |
| OpenShell | latest |
| Blueprint Schema | v1 |

### Upgrade Decision Matrix

| Change Type | Risk | Strategy |
|-------------|------|----------|
| Patch | Low | In-place |
| Minor | Low-Medium | In-place with snapshot |
| Major | High | Blue-green |
| Schema breaking | High | Blue-green with migration |

## Part 3 — Rollback Procedures

### Snapshot Types

| Type | Content | Format | Trigger |
|------|---------|--------|---------|
| Configuration | NemoClaw config files | YAML/JSON | Before upgrade, manual |
| Sandbox state | Container state, policies | Blueprint YAML | Before policy mutation |
| Blueprint | Full blueprint definition | YAML | Before schema migration |
| Operational memory | JSONL lifecycle records | JSONL | Explicit compaction (Phase 1) |

### Snapshot Naming Convention

`nemoclaw-snapshot-<type>-<timestamp>` (e.g., `nemoclaw-snapshot-config-20260513T120000Z`)

### Snapshot Storage

- Configuration snapshots: `~/.nemoclaw/snapshots/`
- Blueprint snapshots: versioned in git
- Docker images: tagged with version
- Operational memory: JSONL file with explicit compaction

### Automated Revert

| Script | Purpose |
|--------|---------|
| `nemoclaw config-restore --snapshot <name>` | Restore configuration |
| `nemoclaw backup-restore` | Restore sandbox from backup |
| `git checkout <tag>` | Revert blueprint to previous version |
| `nemoclaw rollback --target <version>` | Emergency full rollback |

### Post-Rollback Verification

| Check | Method |
|-------|--------|
| Configuration integrity | `nemoclaw config-validate` |
| Sandbox health | `nemoclaw status` |
| Policy enforcement | `nemoclaw policy list` |
| Operational memory | Verify JSONL replay succeeds |

### Rollback Decision Criteria

Roll back when: a regression is detected, a security vulnerability is discovered, configuration becomes unrecoverable, or a policy mutation causes operational failure. Report rollback failures through the escalation path in [Part 1 — Observability and Support](#part-1--observability-and-support).

## Cross-References

- [Operational Checklist](operational-checklist.md) — pre-flight and launch checks
- [Known Limitations](known-limitations.md) — feature gaps and platform constraints
- [Security Summary](security-summary.md) — security posture details
- [Packaging Summary](packaging-summary.md) — release packaging details
