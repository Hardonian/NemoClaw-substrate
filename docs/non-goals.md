<!--
  SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# Remaining Non-Goals

This document lists items that are deliberately out of scope for the current phase of NemoClaw. These are conscious exclusions, not oversights.

## Orchestration and Scaling

| Item | Rationale |
|------|-----------|
| Multi-host sandbox orchestration | NemoClaw manages a single sandbox per host. Orchestration across hosts is handled by external tools. |
| Auto-scaling sandboxes | Sandbox scaling is not a concern for the alpha phase. Single-instance operation is the focus. |
| Load balancing | Not applicable to single-sandbox operation. |
| Kubernetes integration | NemoClaw is designed for operator-grade local execution, not cluster orchestration. |

## Enterprise Features

| Item | Rationale |
|------|-----------|
| SSO / SAML integration | Authentication is handled by the host system and inference providers. |
| Role-based access control | Access control is at the host level. NemoClaw does not implement its own RBAC system. |
| Audit logging to external systems | Logs are stored locally. External log aggregation is an operator responsibility. |
| Multi-tenant isolation | NemoClaw runs a single sandbox per installation. Multi-tenancy is not supported. |
| SLA monitoring dashboards | Monitoring is CLI-based. Dashboard integration is an operator concern, not a NemoClaw concern. |

## Inference Provider Features

| Item | Rationale |
|------|-----------|
| Built-in model hosting | NemoClaw routes to external inference providers. It does not host models. |
| Model fine-tuning | Model training and fine-tuning are outside the scope of sandbox orchestration. |
| Inference caching | Caching is the responsibility of the inference provider, not NemoClaw. |
| Custom model formats | NemoClaw uses standard inference provider APIs. |

## Security Features Beyond Scope

| Item | Rationale |
|------|-----------|
| Hardware security module (HSM) integration | Credential storage depends on the host system. HSM integration is an operator concern. |
| Certificate management | TLS is handled by inference providers and Docker. NemoClaw does not manage certificates. |
| Vulnerability scanning of dependencies | Dependency security is maintained through version pinning and updates. Automated scanning is an operator concern. |
| Penetration testing | Security testing is performed by the project team. Ongoing pen testing is an operator responsibility. |

## User Interface Features

| Item | Rationale |
|------|-----------|
| Graphical user interface | NemoClaw is a CLI tool. A GUI is not planned for this phase. |
| Mobile app | Mobile management is out of scope. |
| Web dashboard | Web-based monitoring is out of scope. CLI diagnostics are sufficient for alpha. |
| Chat-based management | Managing NemoClaw through chat interfaces is not a priority. |

## Data and Analytics Features

| Item | Rationale |
|------|-----------|
| Telemetry collection | NemoClaw does not collect usage telemetry. |
| Usage analytics | Analytics are not part of the sandbox orchestration concern. |
| Data export to BI tools | Sandbox data export is limited to snapshots and diagnostics. BI integration is out of scope. |
| Conversation archiving | Agent conversation history is managed within the sandbox, not by NemoClaw. |

## Platform Support

| Item | Rationale |
|------|-----------|
| macOS official support | Not tested or documented. May work but is not supported. |
| AMD GPU support | OpenShell is designed for NVIDIA GPUs. |
| Windows official support | Partial support with preparation guide. Full support is deferred. |
| Container runtime alternatives to Docker | OpenShell requires Docker. Podman or other runtimes are not supported. |

## Development Tooling

| Item | Rationale |
|------|-----------|
| IDE plugin | NemoClaw is managed through the CLI. IDE integration is out of scope. |
| CI/CD pipeline templates | Pipeline setup is an operator concern. NemoClaw provides the tools, not the pipelines. |
| Automated release tooling | Releases are managed manually following the release doctrine. |
| Dependency update automation | Dependency updates are performed manually following the hygiene process. |

## Documentation and Skills

| Item | Rationale |
|------|-----------|
| Automatically generated user skills from third-party docs | User skills are generated only from NemoClaw docs. External doc ingestion is out of scope. |
| Translation to other languages | Documentation is in English only. |
| Video tutorials | Written documentation is the primary format. Video content is out of scope. |

## Principles for Non-Goal Decisions

These items are excluded to:

1. Keep the scope focused on local operator-grade AI execution.
2. Avoid building features that existing tools already solve well.
3. Maintain a clear trust boundary between NemoClaw and operator infrastructure.
4. Preserve development velocity for the alpha phase.

Items may be reconsidered in future phases as the project matures.

## Next Steps

- See [Known Limitations](known-limitations.md) for accepted limitations in the current implementation.
- See [Roadmap](roadmap.md) for planned improvements and future directions.
- See [Fork Rationale](fork-rationale.md) for the guiding principles behind this project.
