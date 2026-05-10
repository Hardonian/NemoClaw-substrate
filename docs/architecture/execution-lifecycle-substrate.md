---
title: Execution Lifecycle Substrate
---

# Execution lifecycle substrate

This page documents the implemented deterministic execution lifecycle substrate in `src/lib/control-plane/execution-lifecycle.ts`.

## Implemented

- Canonical execution lifecycle state contracts (`planned`, `queued`, `leased`, `executing`, `completed`, `failed`, `blocked`, `degraded`, `cancelled`, `expired`).
- Canonical queue and lease records with ownership and replay lineage hashing.
- Explicit fail-closed replay consistency checks for lineage drift, metadata loss, degraded-state omissions, and queue-plan mismatch.
- Explicit split-brain and stale-owner lease conflict detection.
- Deterministic legal transition matrix with hard rejection for illegal state transitions.

## Intentionally not implemented

- autonomous orchestration
- daemon schedulers
- hidden retries
- speculative execution
- automatic fanout planning

## Verification

- `src/lib/control-plane/execution-lifecycle.test.ts` validates transition legality, replay drift detection, governance metadata loss handling, and lease conflict/staleness semantics.
