<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Known Limitations

This document catalogs the known limitations in NemoClaw. It covers feature gaps, performance caps, and supported platforms.

## Feature Gaps

### Alpha Stage Limitations

NemoClaw is in alpha status. The following features are incomplete or under development:

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-agent manifests | Partial | OpenClaw and Hermes have separate wrappers; shared multi-agent manifests are not yet supported |
| Supervised policy promotion | Planned | Repeated operator decisions can inform policy evolution, but only through visible reviewable promotion paths |
| Blue-green upgrades | Documented only | Procedure is defined in [Operational Doctrine](operational-doctrine.md) but not fully automated |
| Offline mode | Partial | Some features require network access for inference providers and dependency installation |
| Hermes agent support | Partial | Hermes env parsing and config construction are under development |

### CLI Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| CLI launcher uses CommonJS | May conflict with ESM-only toolchains | Use Node.js 22.16+ which supports mixed module systems |
| No built-in config diff tool | Harder to audit config changes | Manually compare config files or use external diff tools |
| Limited config export | Cannot easily share configurations across hosts | Copy `~/.nemoclaw/` directory manually |

### Blueprint Limitations

| Limitation | Impact | Notes |
|------------|--------|-------|
| YAML schema may change | Blueprint manifests may require updates between versions | Schema changes are documented in upgrade procedures |
| Policy presets are static | Cannot dynamically adjust policies based on runtime conditions | Custom policies can be added manually |
| Model compatibility registry requires manual updates | New model/provider combinations need manual manifest entries | Add entries under `nemoclaw-blueprint/model-specific-setup/` |

## Performance Caps

### Resource Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Sandbox memory | Controlled by OpenShell | NemoClaw adds minimal overhead beyond OpenShell container |
| CPU during sandbox operations | No explicit cap | Short-lived CLI commands have negligible impact |
| Disk for snapshots | Unbounded by default | Operators should implement snapshot retention policies |
| Network egress | Controlled by network policies | Policy evaluation adds minimal latency |

### Scalability

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Concurrent sandboxes | One per host | NemoClaw manages a single sandbox instance |
| Multi-host orchestration | Not included | Use external orchestration tools for multi-host deployments |
| High availability | Not supported | Alpha release focuses on single-instance operation |

## Supported Platforms

### Operating Systems

| Platform | Support Level | Notes |
|----------|---------------|-------|
| Linux (x86_64) | Primary | Full support, tested on Ubuntu and compatible distributions |
| Linux (ARM64) | Supported | Tested on NVIDIA GPU instances with ARM64 |
| Windows (x86_64) | Partial | Windows preparation guide available; some features may differ |
| macOS | Not officially supported | May work but is not tested or documented |

### Runtimes

| Runtime | Minimum Version | Notes |
|---------|-----------------|-------|
| Node.js | v22.16 | Required for CLI and plugin |
| npm | Compatible with Node.js 22.16+ | Required for package management |
| Docker | Latest stable | Required for OpenShell sandbox |
| uv | Latest | Required for blueprint tooling (Python) |
| OpenShell | Latest available | Required for sandbox runtime |

### GPU Support

| GPU Platform | Support Level | Notes |
|--------------|---------------|-------|
| NVIDIA GPUs | Primary | Designed for NVIDIA GPU acceleration |
| AMD GPUs | Not supported | OpenShell is designed for NVIDIA |
| CPU-only | Limited | Some features may work but inference performance will be degraded |

## Security Limitations

| Limitation | Risk | Mitigation |
|------------|------|------------|
| Alpha status means interfaces may change | Config and policy compatibility not assured across versions | Use snapshots before upgrades |
| Network policies are allow-list based | Misconfiguration may block required egress | Test policies before applying in production |
| Credential storage depends on host system | Credentials stored on host are subject to host security | Follow host security best practices |

## Next Steps

- See [Operational Doctrine](operational-doctrine.md) for monitoring, escalation, and upgrade procedures.
- See [Non-Goals](non-goals.md) for items deliberately out of scope.
- See [Roadmap](roadmap.md) for planned improvements.
