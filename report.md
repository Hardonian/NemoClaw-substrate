# NemoClaw Fork Review & Status Report

## 1. Repository Overview & Rationale
This repository is a fork of upstream NemoClaw. The goal is to provide **local operator-grade AI execution and governance** via an execution substrate with explicit release-truth boundaries. While the upstream provides an alpha reference stack for OpenClaw in OpenShell sandboxes, this fork addresses the need for deterministic, inspectable, and governable behavior.

**Key Principles:**
- Heterogeneous device awareness must be an explicit input for control decisions.
- Deterministic control (equivalent state + policy + request = equivalent outcomes).
- Truthful degraded-state reporting (explicit fallbacks instead of opaque autonomy).
- Policies must exist as enforceable code/config artifacts, not just prompt instructions.
- Operator decisions should become supervised policy intelligence via a defined promotion path.

## 2. Current Status Snapshot
Based on `docs/architecture/status-matrix.md` and recent updates, the project's current state is as follows:

| Capability Area | Status |
|-----------------|--------|
| CLI/plugin onboarding and sandbox orchestration | **Implemented** (Current NemoClaw flows are present and tested) |
| Control-plane contracts and governance primitives | **Implemented** (Deterministic policy/classification/scheduler primitives exist) |
| Runtime governed provider routing | **Opt-in** (Behind `NEMOCLAW_GOVERNED_ROUTING=1`) |
| Heterogeneous routing bridge | **Opt-in** (Behind explicit feature flags) |
| Remote execution adapters | **Scaffolded** (Guarded seams and policy/approval gating exist) |
| Telemetry adapters and diagnostics | **Scaffolded** (Evidence-oriented telemetry available) |

## 3. Unfinished Work & Roadmap Items
These features represent the target-state but are explicitly **Not Implemented** or remain as **Planned** future work:
- **Canonical request envelope:** Unifying operator intent, workload constraints, and trace info.
- **Device registry:** Explicit capability snapshots for heterogeneous devices.
- **Deterministic scheduler:** A standalone module for evaluating candidates with explainable tie-breaking.
- **Policy engine & Approval gates:** Full decision-time policy evaluation and workflow.
- **Execution receipts:** Emitting unified receipts for control decisions and degraded states.
- **Operational memory:** Append-only memory of operator decisions to inform supervised recommendations.
- **Observability:** Unified control-plane observability and deterministic replay/audit paths.
- **Distributed execution:** Handoff mechanisms across runtimes.
- **GPU balancing:** Automatic device balancing.
- **Dynamo integration:** External orchestration adapter integrations.
- **Autonomous behaviour:** Daemon orchestration or self-healing loops.

## 4. To-Do Checklist (Roadmap Workstreams)
The following checklist maps the unfinished components from `docs/roadmap.md` and `docs/architecture/target-state.md` into actionable workstreams:

- [ ] **Canonical Request Envelope:** Implement stable envelope type/contract.
- [ ] **Device Registry:** Implement dedicated local registry for tracking capability snapshots.
- [ ] **Receipts & Degraded States:** Build cross-cutting receipt contract for control decisions.
- [ ] **Policy Engine & Approvals:** Create decision-time policy engine and explicit approval workflow gates.
- [ ] **Deterministic Scheduler:** Build scheduler module to evaluate requests against registry and policy.
- [ ] **Operational Memory:** Scaffold append-only tracking of operator decisions for supervised promotion.
- [ ] **Observability:** Consolidate structured events to unify diagnostics and evidence trails.
- [ ] **Hardening & Replayability:** Implement replay tooling and ensure sensitive paths fail-closed.
- [ ] **Dynamo/GPU Orchestrator Adapter Seam:** Scaffold adapter contracts for external orchestrators (Future).
