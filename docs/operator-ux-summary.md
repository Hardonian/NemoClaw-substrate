<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Operator UX Summary

This document describes the CLI commands, diagnostic flows, and usability improvements for NemoClaw operators.

## CLI Commands

### Core Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `nemoclaw --help` | Show all available commands | Command reference |
| `nemoclaw onboard` | Initialize configuration | Interactive setup wizard |
| `nemoclaw start` | Launch sandbox | Sandbox status |
| `nemoclaw stop` | Stop sandbox | Confirmation |
| `nemoclaw status` | Check sandbox health | Health report |
| `nemoclaw restart` | Restart sandbox | Sandbox status |

### Diagnostic Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `nemoclaw diagnostics` | Capture full system state | Diagnostics snapshot |
| `nemoclaw config-validate` | Validate configuration | Validation report |
| `nemoclaw policy list` | List active network policies | Policy listing |
| `nemoclaw config-snapshot` | Create configuration snapshot | Snapshot confirmation |
| `nemoclaw config-restore` | Restore configuration snapshot | Restoration status |

### Lifecycle Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `nemoclaw sandbox-restore` | Restore sandbox from snapshot | Restoration status |
| `nemoclaw rollback` | Full rollback to a target state | Rollback status |
| `nemoclaw workspace-export` | Export workspace files | Archive file |
| `nemoclaw workspace-import` | Import workspace files | Import status |

### Policy Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `nemoclaw policy list` | List active network policies | Policy listing |
| Policy approval flow | Operator reviews and approves egress requests | Approval confirmation |

## Diagnostic Flows

### Health Check Flow

The standard diagnostic flow for investigating sandbox issues:

1. Run `nemoclaw status` to check basic health.
2. Run `nemoclaw diagnostics` to capture detailed system state.
3. Review the diagnostics output for error indicators.
4. Check `~/.nemoclaw/logs/` for historical log entries.
5. Consult [Troubleshooting Guide](reference/troubleshooting.md) for common issues.

### Configuration Audit Flow

To audit configuration changes:

1. List available snapshots: `ls ~/.nemoclaw/snapshots/`.
2. Compare current config with a snapshot using external diff tools.
3. Restore a snapshot if needed: `nemoclaw config-restore --snapshot <id>`.

### Network Policy Audit Flow

To audit network policy enforcement:

1. List active policies: `nemoclaw policy list`.
2. Review egress approval logs.
3. Test policy enforcement with a network request.

## Usability Improvements

### Onboarding

- The `nemoclaw onboard` command provides an interactive setup wizard.
- Inference provider selection guides the user through available options.
- Configuration validation runs automatically after setup.

### Error Messages

- Error messages include actionable guidance.
- Exit codes indicate success (0) or failure (non-zero).
- CLI output separates machine-readable logs (stderr) from human-readable status (stdout).

### Status Reporting

- `nemoclaw status` provides a concise health report.
- `nemoclaw diagnostics` provides detailed system state for investigations.
- Sandbox state is always visible through the status command.

### Configuration Management

- Configuration snapshots provide a safety net before changes.
- Rollback commands support targeted or full rollbacks.
- Configuration validation catches errors before they affect operation.

## Operator Workflows

### Daily Operations

1. Check sandbox health: `nemoclaw status`.
2. Review logs if issues are suspected.
3. Apply policy updates if needed.
4. Create snapshots before configuration changes.

### Incident Response

1. Capture diagnostics: `nemoclaw diagnostics`.
2. Check known limitations and troubleshooting guide.
3. Attempt rollback if needed.
4. Escalate per the [Operational Doctrine](operational-doctrine.md).

### Upgrade Operations

1. Create pre-upgrade snapshot: `nemoclaw config-snapshot --pre-upgrade`.
2. Perform upgrade per [Operational Doctrine](operational-doctrine.md).
3. Validate post-upgrade: `nemoclaw diagnostics`.
4. Rollback if validation fails.

## Next Steps

- See [Operational Checklist](operational-checklist.md) for pre-flight and launch checks.
- See [Operational Doctrine](operational-doctrine.md) for monitoring, escalation, and upgrade procedures.
- See [Packaging Summary](packaging-summary.md) for deployment bundle details.
