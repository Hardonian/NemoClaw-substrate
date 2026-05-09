# Observability UI

## Overview

The observability UI layer renders aggregated summaries from the control-plane's observability functions. It presents policy outcomes, fallback frequency, telemetry event counts, degraded timelines, and stale node lists as structured, text-first displays.

## Components

### ObservabilitySummaryPanel

The `ObservabilitySummaryPanel` component renders five summary sections:

1. **Policy Outcomes**: Allow/deny/approval_required/unavailable counts from `summarizePolicyOutcomes()`
2. **Fallback Frequency**: Fallback event counts by reason from `summarizeFallbackFrequency()`
3. **Telemetry Events**: Event counts by telemetry category from `summarizeTelemetryEventCounts()`
4. **Degraded Timeline**: Chronological degraded state entries from `summarizeDegradedTimeline()`
5. **Stale Nodes**: List of stale node identifiers from `summarizeStaleNodes()`

### DiagnosticsSummaryPanel

The `DiagnosticsSummaryPanel` renders diagnostic output lines as a structured text block. It uses the `CodeBlock` primitive for display.

### ApprovalLineagePanel

The `ApprovalLineagePanel` extracts and displays operator overrides across all receipts, showing who approved what and when.

## Data Flow

All data flows through the `useSnapshot` hook, which:
1. Imports deterministic fixtures from `src/data/fixtures.ts`
2. Applies observability summary functions to the event data
3. Returns a single `SnapshotData` object consumed by all routes

No API calls, no side effects, no autonomous refresh.

## Design Decisions

- **No charts**: All data is presented as tables, key-value lists, or text
- **Explicit empty states**: Every section shows an `EmptyState` when data is absent
- **Status badges**: Color-coded status indicators use semantic colors (info, warning, error, critical, success, unknown)
- **State labels**: Monospace labels for system states (healthy, degraded, unavailable, unknown, etc.)
- **Timestamps**: ISO timestamps are rendered in a human-readable format with the raw value in the `title` attribute
