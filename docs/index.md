---
title:
  page: "NVIDIA NemoClaw Developer Guide"
  nav: "NemoClaw"
description:
  main: "NemoClaw is an alpha reference stack for running OpenClaw inside OpenShell sandboxes, with a forked control-plane review path for receipts, replay, degraded states, and evidence."
  agent: "Use for NemoClaw setup, architecture review, verification, and local substrate evidence walkthroughs."
keywords: ["nemoclaw", "openclaw", "openshell", "sandboxing", "verification"]
topics: ["ai_agents", "sandboxing"]
tags: ["openclaw", "openshell", "verification", "security"]
content:
  type: get_started
  difficulty: technical_beginner
  audience: ["developer", "engineer"]
status: published
---

<!--
  SPDX-FileCopyrightText: Copyright (c) 2025-2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
-->

# NVIDIA NemoClaw

NemoClaw is an alpha reference stack for running OpenClaw inside OpenShell sandboxes. This fork adds reviewable control-plane contracts around execution decisions, receipts, replay checks, degraded states, and proofpack-style evidence.

If you are reviewing the fork, start with the local proof path. If you are trying to run a sandbox, start with the quickstart.

## Review First

| Need | Start here |
|---|---|
| Ten-minute repo review | [10-minute review](review/10-minute-review.md) |
| Claims mapped to implementation and tests | [Evidence index](review/evidence-index.md) |
| Architecture at a glance | [Decision map](architecture/decision-map.md) |
| Engineering tradeoffs and current scars | [Tradeoffs](architecture/tradeoffs.md) |
| Local deterministic proof | [Local proof demo](demo/local-proof.md) |
| Verification commands | [How to verify](verification/how-to-verify.md) |

## Run NemoClaw

```bash
npm install
npm run build:cli
node ./bin/nemoclaw.js --help
```

For the full sandbox flow, continue to [Quickstart with OpenClaw](get-started/quickstart.md).

```{toctree}
:caption: Review Path
:hidden:

Reviewer Path <review/reviewer-path>
10-Minute Review <review/10-minute-review>
Evidence Index <review/evidence-index>
Naming Audit <review/naming-audit>
Known Non-Goals <review/known-non-goals>
Reviewer Start Here <review/reviewer-start-here>
Reviewer Navigation Map <review/reviewer-navigation-map>
Live Review Guide <review/live-review-guide>
Capability Tour <review/substrate-capability-tour>
```

```{toctree}
:caption: About NemoClaw
:hidden:

Overview <about/overview>
Architecture Overview <about/how-it-works>
Ecosystem <about/ecosystem>
Release Notes <about/release-notes>
Fork Rationale <fork-rationale>
Roadmap <roadmap>
Known Limitations <known-limitations>
```

```{toctree}
:caption: Get Started
:hidden:

Prerequisites <get-started/prerequisites>
Quickstart with OpenClaw <get-started/quickstart>
Quickstart with Hermes <get-started/quickstart-hermes>
```

```{toctree}
:caption: Architecture
:hidden:

Architecture Index <architecture/index>
Decision Map <architecture/decision-map>
Tradeoffs <architecture/tradeoffs>
Capability Matrix <architecture/capability-status-matrix>
Governance Invariants <architecture/governance-invariants>
Execution Lifecycle <architecture/execution-lifecycle-substrate>
Security Boundaries <architecture/security-boundaries>
ADR Index <adr/index>
```

```{toctree}
:caption: Verification
:hidden:

How to Verify <verification/how-to-verify>
Verification Index <verification/index>
Verification Matrix <verification/verification-matrix>
Release Checklist <verification/release-checklist>
Release Readiness <verification/release-readiness>
Security Verification Matrix <verification/security-verification-matrix>
```

```{toctree}
:caption: Demos
:hidden:

Local Proof <demo/local-proof>
Control-Plane Demo <demo/governed-substrate-demo>
Operator Walkthrough <demo/operator-walkthrough>
Replay Walkthrough <demo/replay-walkthrough>
Demo Index <demo/index>
```

```{toctree}
:caption: Operator Guide
:hidden:

Operator Index <operator/index>
Operator CLI <operator/operator-cli>
Local Bootstrap <contributing/local-bootstrap>
Troubleshooting <reference/troubleshooting>
```

```{toctree}
:caption: Inference
:hidden:

Inference Options <inference/inference-options>
Use Local Inference <inference/use-local-inference>
Switch Inference Providers <inference/switch-inference-providers>
Set Up Task-Specific Sub-Agents <inference/set-up-sub-agent>
```

```{toctree}
:caption: Manage Sandboxes
:hidden:

Manage Sandbox Lifecycle <manage-sandboxes/lifecycle>
Set Up Messaging Channels <manage-sandboxes/messaging-channels>
Workspace Files <manage-sandboxes/workspace-files>
Backup and Restore <manage-sandboxes/backup-restore>
```

```{toctree}
:caption: Network Policy
:hidden:

Approve or Deny Network Requests <network-policy/approve-network-requests>
Customize the Network Policy <network-policy/customize-network-policy>
Integration Policy Examples <network-policy/integration-policy-examples>
```

```{toctree}
:caption: Deployment
:hidden:

Deploy to a Remote GPU Instance <deployment/deploy-to-remote-gpu>
Brev Web UI <deployment/brev-web-ui>
Install OpenClaw Plugins <deployment/install-openclaw-plugins>
Sandbox Hardening <deployment/sandbox-hardening>
```

```{toctree}
:caption: Security
:hidden:

Security Best Practices <security/best-practices>
Credential Storage <security/credential-storage>
OpenClaw Controls <security/openclaw-controls>
Monitor Sandbox Activity <monitoring/monitor-sandbox-activity>
```

```{toctree}
:caption: Reference
:hidden:

CLI Commands Reference <reference/commands>
CLI Selection Guide <reference/cli-selection-guide>
Network Policies <reference/network-policies>
Reason Codes <reference/reason-codes>
```

```{toctree}
:caption: Resources
:hidden:

Agent Skills <resources/agent-skills>
resources/license
Report Vulnerabilities <https://github.com/NVIDIA/NemoClaw/blob/main/SECURITY.md>
```
