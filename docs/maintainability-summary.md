<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Maintainability Summary

This document reports the dead-code removal stats, ownership documentation, and dependency hygiene for NemoClaw.

## Dead-Code Removal

### Detection Methods

Dead code is identified through the following methods:

| Method | Tool | Frequency |
|--------|------|-----------|
| Unused exports | TypeScript compiler (`tsc --noEmit`) | Every pre-push hook |
| Unused variables | Biome linter | Every pre-commit hook |
| Unreachable code | Biome linter | Every pre-commit hook |
| Unused dependencies | Manual review during dependency updates | Periodic |

### Current Status

| Area | Status | Notes |
|------|--------|-------|
| CLI source (`src/`) | Clean | No known dead code |
| Plugin source (`nemoclaw/src/`) | Clean | No known dead code |
| Scripts (`scripts/`) | Reviewed | Helper scripts are all active |
| Test files | Co-located with source | Tests match current implementation |

### Complexity Monitoring

- Function complexity is kept low to maintain readability.
- Existing complexity hotspots are tracked for refactoring.
- Biome linter enforces code quality standards.

## Ownership Documentation

### Code Ownership

| Path | Owner | Purpose |
|------|-------|---------|
| `bin/` | CLI team | CLI launcher and compatibility helpers |
| `src/lib/` | CLI team | Core CLI logic |
| `nemoclaw/` | Plugin team | OpenClaw plugin |
| `nemoclaw-blueprint/` | Blueprint team | Sandbox configuration and policies |
| `scripts/` | Infrastructure team | Install helpers and automation |
| `test/` | QA team | Integration and E2E tests |
| `docs/` | Documentation team | User-facing documentation |

### Contribution Guidelines

- All contributions follow the conventions in [CONTRIBUTING.md](CONTRIBUTING.md).
- Code changes require tests and lint checks.
- Doc changes require accurate and current content.
- PRs must follow the template in `.github/PULL_REQUEST_TEMPLATE.md`.

### Governance

- NemoClaw is in alpha status.
- Interfaces may change without notice.
- Breaking changes follow the [Upgrade Doctrine](upgrade-doctrine.md).
- Security changes require extra review.

## Dependency Hygiene

### Runtime Dependencies

| Dependency | Purpose | Update Policy |
|------------|---------|---------------|
| Node.js v22.16+ | Runtime | Track LTS releases |
| OpenShell | Sandbox runtime | Follow OpenShell releases |
| npm packages | CLI and plugin functionality | Update for security patches and features |
| uv / Python | Blueprint tooling | Follow uv releases |

### Development Dependencies

| Dependency | Purpose | Update Policy |
|------------|---------|---------------|
| Biome | Linting and formatting | Track stable releases |
| Vitest | Testing | Track stable releases |
| commitlint | Commit message validation | Track stable releases |
| prek | Git hooks | Track stable releases |
| TypeScript | Type checking | Track stable releases |

### Dependency Security Practices

- `package-lock.json` files are committed to lock dependency versions.
- Dependencies are updated for security patches as needed.
- No dependencies are fetched at runtime.
- All dependency updates are tested before merging.

### Dependency Update Process

1. Identify the updated dependency and its changelog.
2. Update the version in `package.json`.
3. Run `npm install` to update `package-lock.json`.
4. Run `make check` to verify lint and format compliance.
5. Run `npm test` to verify no regressions.
6. Run `npx prek run --all-files` to verify all hooks pass.
7. Open a PR with the update.

### Dead Dependency Prevention

- Add dependencies only when no standard library alternative exists.
- Prefer well-maintained dependencies with active communities.
- Remove dependencies when they are no longer needed.
- Audit dependencies periodically for security vulnerabilities.

## Code Quality Metrics

### Linting

- Biome enforces code style across JavaScript and TypeScript files.
- ShellCheck enforces shell script quality.
- shfmt formats shell scripts.
- All linters run on every pre-commit hook.

### Testing

- Root-level tests (`test/`) use ESM imports for integration testing.
- Plugin tests use TypeScript co-located with source for unit testing.
- E2E tests run on ephemeral Brev cloud instances.
- Coverage thresholds are tracked and enforced.

### Type Checking

- CLI type-checking via `tsconfig.cli.json`.
- Plugin type-checking via `nemoclaw/tsconfig.json`.
- Type checking runs on every pre-push hook.

## Next Steps

- See [Security Summary](security-summary.md) for security posture details.
- See [Contributing Guide](CONTRIBUTING.md) for full contribution guidelines.
- See [Operational Checklist](operational-checklist.md) for deployment readiness.
