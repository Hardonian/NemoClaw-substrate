<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Supportability Doctrine

This document defines the supportability expectations for NemoClaw. It covers logging expectations, SLA metrics, and escalation paths.

## Logging Expectations

### Log Levels

NemoClaw uses the following log levels:

| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | A failure that prevents sandbox operation | Sandbox failed to start, inference provider unreachable |
| WARN | A condition that may affect operation but does not prevent it | Network policy denied egress, deprecated config key |
| INFO | Normal operational events | Sandbox launched, policy applied, snapshot created |
| DEBUG | Detailed information for troubleshooting | Request/response payloads, internal state transitions |

### Log Output

- CLI output goes to standard error for machine-readable logs.
- Human-readable status output goes to standard output.
- Log files are stored under `~/.nemoclaw/logs/` when file logging is enabled.

### Log Format

Each log entry contains:

- Timestamp in ISO 8601 format.
- Log level.
- Component name (e.g., `runner`, `blueprint`, `onboard`).
- Message with structured context fields.

### Redaction in Logs

All log output passes through the redaction layer before writing. Secrets are never included in logs. See [Redaction Guarantees](redaction-guarantees.md) for details.

## SLA Metrics

### Availability Targets

| Component | Target | Measurement |
|-----------|--------|-------------|
| CLI responsiveness | Sub-second for status commands | Command execution time |
| Sandbox startup | Under 30 seconds | Time from `nemoclaw start` to healthy status |
| Inference routing | Provider-dependent, no added latency | Round-trip time to inference provider |
| Policy enforcement | Immediate | Time from policy change to enforcement |

### Performance Caps

| Metric | Limit | Notes |
|--------|-------|-------|
| Memory footprint | Depends on OpenShell container | NemoClaw CLI adds minimal overhead |
| CPU overhead | Minimal outside of sandbox operations | CLI commands are short-lived |
| Disk usage | `~/.nemoclaw/` directory and snapshot storage | Controlled by snapshot retention policy |

### Monitoring Indicators

The following indicators signal operational health:

| Indicator | Healthy State | Degraded State |
|-----------|---------------|----------------|
| `nemoclaw status` exit code | 0 | Non-zero |
| Sandbox container state | Running | Stopped, restarting, or errored |
| Inference provider reachability | Responsive | Timeout or error response |
| Network policy enforcement | Active | Policy load failure |
| Disk space available | Sufficient for operation | Low disk warning |

## Escalation Paths

### Tier 1: Self-Service

Users should attempt self-service resolution before escalating:

1. Run `nemoclaw diagnostics` to capture system state.
2. Review the troubleshooting guide in `docs/reference/troubleshooting.md`.
3. Check known limitations in [Known Limitations](known-limitations.md).
4. Review the [Operational Checklist](operational-checklist.md) for common misconfigurations.

### Tier 2: Community Support

If self-service does not resolve the issue:

1. Search open and closed issues on the [NemoClaw repository](https://github.com/NVIDIA/NemoClaw).
2. Open a new issue with the output of `nemoclaw diagnostics` attached.
3. Join the [Discord community](https://discord.gg/XFpfPv9Uvx) for community support.

### Tier 3: NVIDIA Support

For issues requiring NVIDIA involvement:

1. Report security vulnerabilities through the [SECURITY.md](https://github.com/NVIDIA/NemoClaw/blob/main/SECURITY.md) process.
2. For enterprise support, contact NVIDIA Agent Toolkit support through official channels.

### Escalation Triggers

Escalate immediately when:

- A security vulnerability is suspected (credential exposure, sandbox escape).
- Data loss has occurred or is imminent.
- The sandbox is in an unrecoverable state and rollback has failed.

## Diagnostic Commands

The following commands are used for support investigations:

| Command | Purpose |
|---------|---------|
| `nemoclaw status` | Check sandbox health |
| `nemoclaw diagnostics` | Capture full system state |
| `nemoclaw config-validate` | Validate configuration |
| `nemoclaw policy list` | List active network policies |
| `make check` | Run all linters |
| `npm test` | Run all tests |

## Next Steps

- See [Operational Checklist](operational-checklist.md) for pre-flight and launch checks.
- See [Known Limitations](known-limitations.md) for feature gaps and platform constraints.
- See [Security Summary](security-summary.md) for security posture details.
