<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Security Summary

This document reports the audit results, redaction status, and transport and artifact integrity guarantees for NemoClaw.

## Audit Results

### Security Architecture Review

| Area | Status | Notes |
|------|--------|-------|
| Sandbox isolation | Verified | OpenShell containers with capability drops |
| Network policy enforcement | Verified | Egress control with operator approval |
| Credential storage | Verified | Host-dependent, no baked-in secrets |
| SSRF protection | Verified | Blueprint-level validation |
| Process limits | Verified | Container-level enforcement |

### Code Security Practices

| Practice | Status | Enforcement |
|----------|--------|-------------|
| SPDX license headers | Enforced | Pre-commit hook auto-inserts |
| Conventional Commits | Enforced | commitlint via prek hook |
| Pre-commit hooks | Active | prek manages all hooks |
| TypeScript type checking | Active | `npm run typecheck:cli` |
| Test coverage thresholds | Tracked | `ci/coverage-threshold-*.json` |

### Secret Management

- No secrets are hardcoded in source code.
- Credentials are stored on the host system and accessed at runtime.
- All log output passes through the redaction layer.
- All exports pass through secret pattern detection.

## Redaction Status

### Redaction Coverage

All of the following outputs are validated for secret removal:

| Output Type | Validation Function | Status |
|-------------|---------------------|--------|
| Payload exports | `redactPayloadForExport()` | Active |
| Export safety | `isExportSafe()` | Active |
| Artifact redaction | `validateArtifactRedaction()` | Active |
| Bundle redaction | `validateBundleRedaction()` | Active |
| Replay package | `validateReplayPackageRedaction()` | Active |
| Receipt exports | `validateReceiptRedaction()` | Active |

### Secret Pattern Detection

The following patterns are detected and redacted:

| Pattern Type | Examples |
|--------------|----------|
| NVIDIA tokens | `nvapi-`, `nvcf-` |
| GitHub tokens | `ghp_`, `github_pat_` |
| OpenAI tokens | `sk-proj-`, `sk-ant-`, `sk-` |
| Slack tokens | `xoxb-`, `xoxp-`, `xoxa-`, `xoxs-`, `xapp-` |
| AWS keys | `AKIA`, `ASIA` |
| HuggingFace tokens | `hf_` |
| GitLab tokens | `glpat-` |
| Groq tokens | `gsk_` |
| PyPI tokens | `pypi-` |
| Bearer tokens | `Bearer <token>` |
| Environment-like patterns | `KEY=value`, `SECRET=value`, `TOKEN=value` |

See [Redaction Guarantees](redaction-guarantees.md) for complete details.

## Transport Integrity

### Communication Channels

| Channel | Protection | Notes |
|---------|------------|-------|
| Inference provider calls | HTTPS | Standard TLS encryption |
| Docker API | Local socket or TLS | Depends on Docker configuration |
| Policy updates | HTTPS | Pulled from trusted sources |
| Dependency install | HTTPS + checksums | npm registry with lock file verification |

### Container Security

| Control | Implementation |
|---------|----------------|
| Capability drops | All non-essential capabilities removed |
| Process limits | Configured via OpenShell container settings |
| Network isolation | Policy-based egress control |
| File system isolation | Separate workspace per sandbox |
| No privileged mode | Containers run without elevated privileges |

## Artifact Integrity Guarantees

### Build Artifacts

- CLI distribution (`dist/`) is built from source via `npm run build`.
- Plugin distribution (`nemoclaw/dist/`) is built from source via `cd nemoclaw && npm run build`.
- Build outputs are deterministic from the same source and toolchain version.

### Package Verification

- `package-lock.json` files are committed and verified at install time.
- `npm ci` produces deterministic installs from lock files.
- No dependencies are fetched at runtime.

### Git Integrity

- All commits follow Conventional Commits format.
- Release commits are tagged with git tags.
- Release branches track stable versions.

### Snapshot Integrity

- Configuration snapshots include integrity checksums.
- Snapshots are validated before restore.
- Rollback procedures verify snapshot integrity before applying.

## Security Vulnerability Reporting

- Report vulnerabilities through the [SECURITY.md](https://github.com/NVIDIA/NemoClaw/blob/main/SECURITY.md) process.
- Security-sensitive code paths require extra test coverage.
- Security fixes are released as patch releases.

## Next Steps

- See [Redaction Guarantees](redaction-guarantees.md) for detailed redaction mechanisms.
- See [Supportability Doctrine](supportability-doctrine.md) for escalation paths.
- See [Known Limitations](known-limitations.md) for security-related limitations.
