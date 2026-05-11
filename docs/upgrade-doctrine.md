<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Upgrade Doctrine

This document defines the upgrade procedures for NemoClaw. It covers in-place and blue-green upgrade strategies, data migration steps, and compatibility gates.

## Upgrade Strategies

### In-Place Upgrade

An in-place upgrade updates the NemoClaw installation on the running host without provisioning new infrastructure.

Use an in-place upgrade when:

- The change is a minor version or patch release.
- No breaking schema or API changes are introduced.
- Downtime of one to two minutes is acceptable.

Procedure:

```console
$ nemoclaw config-snapshot --pre-upgrade
$ npm install
$ cd nemoclaw && npm run build && cd ..
$ make check
$ npm test
$ nemoclaw status
```

The `nemoclaw config-snapshot --pre-upgrade` command creates a configuration snapshot before the upgrade for rollback safety.

### Blue-Green Upgrade

A blue-green upgrade provisions a parallel NemoClaw installation and switches traffic after validation.

Use a blue-green upgrade when:

- The change is a major version release.
- Breaking schema or API changes are introduced.
- Zero-downtime upgrade is required.

Procedure:

1. Provision a new NemoClaw installation in a parallel environment.
2. Apply the same configuration and network policies to the new installation.
3. Run `nemoclaw diagnostics` on the new installation and compare with the running installation.
4. Switch sandbox orchestration to the new installation.
5. Validate sandbox health on the new installation.
6. Decommission the old installation after a stabilization period.

## Data Migration Steps

### Configuration Migration

Configuration migrations are handled automatically when the schema version changes. The `nemoclaw onboard` command detects outdated configuration and applies migrations:

```console
$ nemoclaw onboard --migrate
```

### Blueprint Migration

Blueprint YAML may require updates when the schema changes. Run the blueprint validation to identify required changes:

```console
$ cd nemoclaw-blueprint
$ uv sync
$ # Run blueprint validation
$ cd ..
```

### Workspace Migration

Workspace files in the sandbox are preserved across in-place upgrades. For blue-green upgrades, copy workspace files from the old sandbox to the new one:

```console
$ nemoclaw workspace-export --target <workspace-dir>
$ # On new installation
$ nemoclaw workspace-import --source <workspace-dir>
```

## Compatibility Gates

### Pre-Upgrade Compatibility Checks

Before performing any upgrade, verify compatibility:

| Check | Command | Purpose |
|-------|---------|---------|
| Node.js version | `node --version` | Ensure runtime compatibility |
| OpenShell version | `openshell --version` | Ensure sandbox runtime compatibility |
| Plugin compatibility | `cd nemoclaw && npm run build` | Ensure plugin compiles with new deps |
| Test suite | `npm test` | Ensure no regressions |
| Type check | `npm run typecheck:cli` | Ensure TypeScript compatibility |

### Post-Upgrade Compatibility Checks

After an upgrade, verify all components operate correctly:

| Check | Command | Purpose |
|-------|---------|---------|
| Sandbox launch | `nemoclaw start` | Verify sandbox starts |
| Inference provider | Send test prompt | Verify inference routing works |
| Network policy | `nemoclaw policy list` | Verify policies applied |
| Diagnostics | `nemoclaw diagnostics` | Verify system health |

### Version Compatibility Matrix

| NemoClaw Version | Minimum Node.js | Minimum OpenShell | Blueprint Schema Version |
|------------------|-----------------|-------------------|--------------------------|
| Alpha (current) | v22.16 | Latest available | v1 |

## Rollback After Failed Upgrade

If an upgrade fails or produces regressions:

1. Consult the [Rollback Doctrine](rollback-doctrine.md) for revert procedures.
2. Use the pre-upgrade snapshot created before the upgrade.
3. Report the failure through the escalation path in the [Supportability Doctrine](supportability-doctrine.md).

## Upgrade Decision Matrix

| Change Type | Strategy | Downtime | Risk Level |
|-------------|----------|----------|------------|
| Patch release | In-place | 1-2 minutes | Low |
| Minor release | In-place | 1-2 minutes | Medium |
| Major release | Blue-green | Near zero | High |
| Schema change | Blue-green with migration | Near zero | High |

## Next Steps

- See [Rollback Doctrine](rollback-doctrine.md) for revert procedures.
- See [Operational Checklist](operational-checklist.md) for verification steps.
- See [Packaging Summary](packaging-summary.md) for deployment bundle details.
