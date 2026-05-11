<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# NemoClaw: Governed Execution Substrate

NemoClaw is a production-grade execution substrate for local operator-grade AI agents. It provides a governed environment that prioritizes deterministic control, auditable evidence, and fail-closed security over opaque autonomy.

NemoClaw is not a "feature factory"—it is **decision infrastructure**.

---

## 🛡️ Anti-Theatre Doctrine

We reject "AI magic" and architecture theatre. NemoClaw operates under a strict truth-boundary model:

- **No Hidden Retries:** Failures are reported as first-class events.
- **No Silent Fanout:** All concurrent execution is governed and accounted for.
- **No Implicit Autonomy:** The substrate never promotes policy without explicit operator review.
- **Evidence-Based:** Claims of "trust" or "attestation" map to verifiable code and structural separation, not marketing descriptors.

---

## 🏗️ Architecture Overview

NemoClaw decomposes agent orchestration into a governed substrate:

1. **Control Plane:** Governed routing, deterministic dispatch, and policy engine.
2. **Execution Plane:** Lifecycle management, queue/lease governance, and sandbox isolation.
3. **Observability Plane:** Telemetry lifecycle, correlation-aware tracing, and proofpack generation.
4. **Governance Layer:** Attestation, replay validation, and supervised policy promotion.

### Trust Boundary Model

NemoClaw enforces a strict boundary between the **Operator** (High Trust), the **Control Plane** (Governed), and the **Execution Sandbox** (Untrusted). All cross-boundary communication is validated and redacted.

---

## 📊 Capability Truth Matrix

| Domain | Implemented | Status | Evidence Reference |
|---|---|---|---|
| **Governed Routing** | Yes | Deterministic | `src/lib/control-plane/governed-provider-routing.ts` |
| **Execution Lifecycle** | Yes | Substrate-Ready | `src/lib/control-plane/execution-lifecycle.ts` |
| **Replay & Receipts** | Yes | Truth-Grounded | `src/lib/control-plane/replay.ts` |
| **Telemetry** | Yes | Correlation-Aware | `src/lib/observability/execution-trace.ts` |
| **Heterogeneous Scheduling** | Yes | Local/Remote | `src/lib/control-plane/heterogeneous-routing.ts` |
| **GPU-Aware Scheduling** | Scaffolded | Experimental | `src/lib/control-plane/scheduler.ts` |
| **Worker Attestation** | Scaffolded | Structural | `src/lib/control-plane/worker-trust.ts` |
| **Distributed Fabric** | Planned | Bounded | ADR-0002 |
| **Autonomous Recovery** | Intentionally-Not-Implemented | n/a | Governance Doctrine |

*For the full matrix, see [docs/architecture/capability-status-matrix.md](docs/architecture/capability-status-matrix.md).*

---

## 🚀 Quickstart: Operator Mode

### 1. Requirements

- Node.js 22.16+ (LTS)
- Docker Desktop or Linux Docker
- NVIDIA GPU (Optional, recommended for local inference)

### 2. Local Setup

```bash
git clone https://github.com/NVIDIA/NemoClaw-substrate
cd NemoClaw-substrate
npm install
npm run build:cli
```

### 3. Verify Core Stability

```bash
npm run verify:core
```

---

## 🔦 Reviewer & Operator Maps

### Reviewer Start-Here

If you are reviewing this repository for security, procurement, or infra-safety:

1. **Governance Invariants:** [docs/architecture/governance-invariants.md](docs/architecture/governance-invariants.md)
2. **Trust Boundaries:** [docs/architecture/security-policy.md](docs/architecture/security-policy.md)
3. **Audit Readiness:** [docs/architecture/evidence-topology.md](docs/architecture/evidence-topology.md)
4. **Verification Topology:** [docs/verification/verification-matrix.md](docs/verification/verification-matrix.md)

### Operator CLI

NemoClaw provides a deterministic operator CLI for managing the substrate:

- `nemoclaw substrate status`: Inspect control-plane health.
- `nemoclaw substrate replay <receipt-id>`: Replay execution with truth-grounded evidence.
- `nemoclaw substrate policy review`: Supervised review of pending policy changes.

---

## 🔐 Security Posture

- **Fail-Closed:** Any violation of governance policy or telemetry failure terminates the execution lifecycle.
- **Redaction-by-Default:** All telemetry is passed through `src/lib/security/redact.ts` before export.
- **SSRF Validation:** All outgoing network requests are validated against governed policy maps.

---

## 🗺️ Roadmap & Non-Goals

### High-Priority Roadmap

- [ ] Formal Cryptographic Attestation Chain
- [ ] Persistence Adapters for Dynamo/S3
- [ ] Advanced GPU Topology-Aware Scheduling

### Non-Goals

- Autonomous Degraded State recovery without operator oversight.
- Implicit automatic policy promotion.
- Opaque "AI-driven" control-plane decisions.

---

## 🤝 Contribution Discipline

NemoClaw follows a strict **Minimal Diff Discipline**. Every PR must:

- Pass `npm run verify:release`.
- Include verification evidence in the description.
- Update the Capability Status Matrix if modifying implementation state.

---

## 📄 License

SPDX-License-Identifier: Apache-2.0
Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
