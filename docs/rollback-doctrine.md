<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Rollback Doctrine

This document defines the rollback procedures for NemoClaw. It covers versioned snapshots, automated revert scripts, and validation steps for returning to a known-good state.

## Versioned Snapshots

### Snapshot Types

NemoClaw maintains snapshots at three levels:

| Level | Content | Format | Trigger |
|-------|---------|--------|---------|
| Configuration | `~/.nemoclaw/` contents, network policies, inference config | YAML/JSON archive | Before any `nemoclaw onboard` or policy change |
| Sandbox state | OpenShell container state, workspace files, agent skills | Container image or filesystem archive | Before launch or significant state mutation |
| Blueprint | `nemoclaw-blueprint/` YAML manifests, policy presets | Git tag or archive | Before any blueprint modification |

### Snapshot Naming

Snapshots use the following naming convention:

```
nemoclaw-snapshot-<type>-<timestamp>
```

Where `<type>` is `config`, `sandbox`, or `blueprint`, and `<timestamp>` is ISO 8601 compact format (e.g., `20260315T143022Z`).

### Snapshot Storage

- Configuration snapshots are stored locally under `~/.nemoclaw/snapshots/`.
- Sandbox state snapshots are stored as Docker images or tar archives in the workspace directory.
- Blueprint snapshots are stored via git tags in the repository.

## Automated Revert Scripts

### Configuration Revert

The `nemoclaw config-restore` command restores a previous configuration snapshot:

```console
$ nemoclaw config-restore --snapshot nemoclaw-snapshot-config-20260315T143022Z
```

This performs the following steps:

1. Validates the snapshot archive integrity.
2. Stops the running sandbox if active.
3. Replaces the current `~/.nemoclaw/` contents with the snapshot.
4. Restarts the sandbox if it was running.

### Sandbox State Revert

Sandbox state is reverted by restoring from a Docker image or filesystem archive:

```console
$ nemoclaw sandbox-restore --snapshot nemoclaw-snapshot-sandbox-20260315T143022Z
```

This destroys the current sandbox and recreates it from the snapshot state.

### Blueprint Revert

Blueprint changes are reverted via git:

```console
$ git checkout <previous-tag-or-commit> -- nemoclaw-blueprint/
$ cd nemoclaw && npm run build
```

### Emergency Full Rollback

To roll back all components to a specific point in time:

```console
$ nemoclaw rollback --target <snapshot-id-or-timestamp>
```

This orchestrates configuration, sandbox, and blueprint reverts in the correct order.

## Validation Steps

### Post-Rollback Verification

After any rollback, run the following checks:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Config integrity | `nemoclaw config-validate` | Zero validation errors |
| Sandbox health | `nemoclaw status` | Sandbox reports healthy |
| Network policy | `nemoclaw policy list` | Policies match the rolled-back state |
| Inference test | Send a test prompt | Response received successfully |
| Blueprint build | `cd nemoclaw && npm run build` | Build succeeds |

### Rollback Integrity Checks

- Verify snapshot checksums match the recorded values at capture time.
- Confirm no data loss in workspace files not covered by the snapshot.
- Review rollback audit log in `~/.nemoclaw/rollback.log`.

### When Rollback Fails

If a rollback does not succeed:

1. Check `~/.nemoclaw/rollback.log` for the failure point.
2. Attempt component-level rollback (config, sandbox, or blueprint individually).
3. If component rollback fails, perform a clean reinstall from the target version.
4. Report the rollback failure through the escalation path defined in the [Supportability Doctrine](supportability-doctrine.md).

## Rollback Decision Criteria

Initiate a rollback when:

- A deployment introduces a regression that affects sandbox stability.
- A security vulnerability is discovered in the current version.
- Configuration changes cause unrecoverable sandbox state.
- Network policy changes block required egress or allow unauthorized access.

Do not initiate a rollback for transient errors that resolve on sandbox restart.

## Next Steps

- See [Operational Checklist](operational-checklist.md) for pre-flight and launch checks.
- See [Upgrade Doctrine](upgrade-doctrine.md) for version progression procedures.
