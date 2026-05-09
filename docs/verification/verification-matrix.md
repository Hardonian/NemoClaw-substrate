<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Verification Matrix

## Current commands discovered in repository
- Existing: `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm run typecheck:cli`, `npm run validate:configs`, `npm run build:cli`, `npm run docs`, `npm run docs:strict`, `cd nemoclaw && npm test`.
- Existing references: `make check`, `make docs`, `make docs-live` (documented in AGENTS instructions).
- Proposed future commands are labeled as **Proposed** below.

## Documentation verification
- What must be verified: docs distinguish current truth vs target architecture.
- Suggested commands: `npm run docs:strict`.
- Required tests: link and build validation.
- Failure examples: target-state language presented as implemented behavior.
- Exit criteria: strict docs build passes and reviewer spot-check passes.

## Type/contract verification
- What must be verified: control-plane contract schemas/types compile.
- Suggested commands: existing `npm run typecheck`, `npm run typecheck:cli`; **Proposed:** `npm run typecheck:control-plane`.
- Required tests: compile + contract unit tests.
- Failure examples: non-deterministic contract fields, incompatible schema changes.
- Exit criteria: type checks and contract tests pass.

## Device registry verification
- What must be verified: device/capability snapshots validate and persist correctly.
- Suggested commands: existing `npm run validate:configs`; **Proposed:** `npm run test:device-registry`.
- Required tests: schema validation and merge/update tests.
- Failure examples: missing device identity, stale snapshot accepted as healthy.
- Exit criteria: registry tests pass and invalid snapshots rejected.

## Scheduler verification
- What must be verified: deterministic ordering and explainable candidate rejection.
- Suggested commands: **Proposed:** `npm run test:scheduler`.
- Required tests: deterministic replay/property tests.
- Failure examples: equal input yields different output ordering.
- Exit criteria: deterministic tests pass across repeated runs.

## Policy verification
- What must be verified: policy verdicts are inspectable/versioned and approval-gated.
- Suggested commands: existing `npm run validate:configs`; **Proposed:** `npm run test:policy-engine`.
- Required tests: policy golden tests, promotion/rollback tests.
- Failure examples: unapproved policy becomes active.
- Exit criteria: policy tests pass; promotion requires explicit approval artifact.

## Receipt verification
- What must be verified: material decisions emit valid execution receipts.
- Suggested commands: **Proposed:** `npm run test:receipts`.
- Required tests: receipt schema and integration assertions.
- Failure examples: decision path executes without receipt.
- Exit criteria: 100% receipt emission coverage for governed paths.

## Degraded-state verification
- What must be verified: degraded-state taxonomy is explicit and consistent.
- Suggested commands: existing `npm test`; **Proposed:** `npm run test:degraded-states`.
- Required tests: reason-code coverage and message mapping tests.
- Failure examples: hidden fallback reported as healthy.
- Exit criteria: degraded states are explicit and machine-readable.

## Operational memory verification
- What must be verified: memory is append-only and does not auto-mutate active policy.
- Suggested commands: **Proposed:** `npm run test:operational-memory`.
- Required tests: append-only invariants and recommendation traceability tests.
- Failure examples: memory event silently modifies policy.
- Exit criteria: promotion path remains supervised.

## Observability verification
- What must be verified: event correlation with receipts and device registry context.
- Suggested commands: **Proposed:** `npm run test:observability-contracts`.
- Required tests: correlation and completeness tests.
- Failure examples: missing trace/receipt identifiers.
- Exit criteria: end-to-end event chain completeness.

## Security/hardening verification
- What must be verified: fail-closed behavior on sensitive control paths.
- Suggested commands: existing `npm run check`, `npm run lint`.
- Required tests: negative tests for unauthorized/invalid decisions.
- Failure examples: permissive fallback after policy validation error.
- Exit criteria: sensitive flows fail closed and are audited.

## Replayability verification
- What must be verified: historical decisions can be replayed deterministically.
- Suggested commands: **Proposed:** `npm run test:replay`.
- Required tests: replay consistency using stored receipts.
- Failure examples: replay outcome diverges from recorded decision.
- Exit criteria: replay tests pass for representative scenarios.

## Release-readiness verification
- What must be verified: docs, types, tests, and governance checks pass together.
- Suggested commands: existing `npm run check`, `npm test`, `npm run docs:strict`.
- Required tests: CI-equivalent aggregate pass.
- Failure examples: docs claim features without tests/contracts.
- Exit criteria: release candidate passes all required checks and includes truthful release notes.

## Control-plane foundation verification
- Deterministic serialization/order tests for control-plane contracts and registry added.
- Remaining validation: runtime-path receipt coverage once integration PR lands.


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.

- Added verification coverage for runtime action descriptors, policy allow/deny/approval-required handling, receipt policy rationale, and diagnostics empty-state summaries.

- Added verification targets: operational event ordering, deterministic IDs, replay integrity, policy-candidate grouping, no auto-promotion behavior, and diagnostics empty-state summaries.
