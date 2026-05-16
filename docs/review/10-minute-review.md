<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# 10-Minute Substrate Review

This walkthrough validates the **NemoClaw Execution Substrate** using canonical primitives, deterministic state transitions, and local proofpacks. It requires no external network access, GPUs, or live sandboxes.

## 1. Environment Baseline

Ensure the repository is in a verified, clean state.

```bash
npm run verify:core
```

**Expected:** All core substrate tests pass. This confirms that the `ExecutionPlan`, `OrchestrationReceipt`, and `GovernancePolicy` primitives are correctly implemented and type-safe.

## 2. Canonical Local Proof Execution

Run the deterministic local-governed proof demo. This script exercises the entire orchestration lifecycle: planning, queueing, lease acquisition, execution, and receipt emission.

```bash
npm run demo:local-proof
```

**Key Transitions Observed:**
- `PLAN_CREATED`: Manifest hash generated and registered.
- `LEASE_ACQUIRED`: Execution lock obtained for the local run.
- `STEP_COMPLETED`: Safe action executed; receipt emitted with cryptographic lineage.
- `PROOFPACK_EXPORTED`: Artifact bundle produced in `.artifacts/local-governed-proof`.

## 3. Authoritative Operator Inspection

Use the NemoClaw CLI to inspect the artifacts produced by the previous run. This simulates an operator auditing a detached execution.

```bash
# Verify the exported proofpack and run status
node ./bin/nemoclaw.js operator status --source .artifacts/local-governed-proof

# Inspect the receipt audit trail
node ./bin/nemoclaw.js operator receipts --source .artifacts/local-governed-proof --json
```

**Expected:** The CLI displays the actual data from the run, including the `manifestHash`, `runId`, and the chronological sequence of receipts.

## 4. Replay and Integrity Verification

Validate that the generated proofpack is tamper-proof and consistent with the original execution.

```bash
npm run demo:local-proof:verify
```

**Expected:** The replayer successfully walks the receipt lineage and confirms `REPLAY_CONSISTENT`. Any tampering with the `.artifacts/` files would trigger `REPLAY_DRIFT_DETECTED`.

## 5. Governance and Policy Audit

Review the substrate's enforcement logic for policy gates and degraded states.

```bash
npm run verify:chaos
```

**Expected:** Chaos tests confirm that the substrate correctly rejects illegal state transitions and enforces lease boundaries even under high entropy (e.g., simulated daemon crashes).

---

## Technical Proof Points

- **Determinism:** `src/lib/control-plane/execution-lifecycle.ts`
- **Auditability:** `src/lib/orchestration/orchestrator.ts`
- **Integrity:** `src/lib/control-plane/operational-memory.ts`
- **Replayability:** `src/lib/orchestration/replay.ts` (verified via `test/replay/`)

## Operational Constraints

- **No Magic:** All retries and recovery flows are explicit and logged.
- **No Silent Failures:** All exceptions produce an `INTERNAL_ERROR` receipt.
- **No Identity Drift:** Every run is anchored to a unique `correlationId`.
