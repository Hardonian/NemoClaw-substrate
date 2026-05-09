# Operator Console

## Overview

The NemoClaw Operator Console is a **read-only**, **deterministic** observability and governance interface for the governed control-plane substrate. It renders operational state as static snapshots — no live telemetry, no polling, no websockets.

## Design Principles

- **Read-only**: No mutations, no form submissions that change state
- **Deterministic**: No random values, no live clocks, no polling loops
- **Text-first**: Tables, lists, and structured text over visual charts
- **Accessibility-safe**: ARIA labels, roles, semantic HTML, keyboard navigable
- **No cyberpunk theatre**: Clean, professional, understated design
- **Explicit degraded states**: Shows "degraded", "unavailable", "unknown" clearly
- **Explicit unknown/unavailable**: Never hides missing data; always shows "Unavailable" or "Unknown"
- **No fake live telemetry**: Only shows data provided as a snapshot
- **No fabricated charts**: Uses tables, lists, text summaries
- **No polling/websockets**: Pure static snapshot rendering

## Architecture

```
operator-console/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Nav, Shell
│   │   ├── primitives/      # Reusable UI primitives
│   │   ├── viewers/         # Specialized viewer components
│   │   └── panels/          # Summary panel components
│   ├── data/
│   │   ├── types.ts         # Re-exports from control-plane
│   │   └── fixtures.ts      # Deterministic test fixtures
│   ├── hooks/
│   │   └── use-snapshot.ts  # Snapshot data hook
│   ├── routes/              # Route components
│   └── styles/
│       └── index.css        # Global styles
└── test/
    ├── setup.ts
    ├── components/          # Component rendering tests
    └── snapshots/           # Deterministic snapshot tests
```

## Type Reuse

All types are re-exported from the existing control-plane source via `src/data/types.ts`. No parallel schemas are created. The console imports:

- `DegradedState`, `ExecutionReceipt`, `NodeDescriptor` from `types.ts`
- `OperationalEvent`, `OperationalMemoryLog` from `operational-memory.ts`
- `ReplayEnvelope`, `validateReplayEnvelope` from `replay.ts`
- `summarizePolicyOutcomes`, `summarizeDegradedTimeline` from `observability.ts`
- `HeterogeneousCandidate`, `HeterogeneousRoutingResult` from `heterogeneous-routing.ts`
- `WorkerTrustDecision`, `WorkerCapabilityAttestation` from `worker-trust.ts`
- And all other control-plane types

## Routes

| Route | Hash | Purpose |
|-------|------|---------|
| Overview | `#` | Dashboard with summary cards |
| Execution Plans | `#execution-plans` | Execution plan lineage viewer |
| Receipts | `#receipts` | Individual receipt viewer |
| Replay Validation | `#replay-validation` | Replay envelope validation |
| Degraded States | `#degraded-states` | Degraded state inspector |
| Trust & Attestation | `#trust-attestation` | Worker trust/attestation inspector |
| Routing Decisions | `#routing-decisions` | Heterogeneous routing decisions |
| Events | `#events` | Operational event log |
| Diagnostics | `#diagnostics` | System diagnostics summary |
| Telemetry | `#telemetry` | Probe outcomes and telemetry state |

## Testing

- Component rendering tests: `npm test`
- Deterministic snapshot tests: `test/snapshots/`
- Degraded state rendering tests: `test/components/degraded-state-rendering.test.tsx`
- Unknown/unavailable rendering tests: `test/components/unknown-unavailable-rendering.test.tsx`

## Running

```bash
cd operator-console
npm install
npm run dev     # Start dev server
npm run build   # Production build
npm test        # Run tests
```
