import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedInspector } from "../../src/components/viewers/degraded-inspector";
import { makeDegradedState } from "../../src/data/fixtures";

describe("Degraded state rendering", () => {
  const categories: Array<{ category: string; severity: string; reasonCode: string }> = [
    { category: "healthy", severity: "info", reasonCode: "none" },
    { category: "constrained", severity: "warning", reasonCode: "capability_missing" },
    { category: "degraded", severity: "warning", reasonCode: "transport_unreachable" },
    { category: "unavailable", severity: "error", reasonCode: "node_missing" },
    { category: "unknown", severity: "warning", reasonCode: "unknown_error" },
    { category: "partial_capability", severity: "info", reasonCode: "capability_missing" },
    { category: "approval_blocked", severity: "warning", reasonCode: "approval_required" },
    { category: "stale", severity: "warning", reasonCode: "heartbeat_stale" },
    { category: "unreachable", severity: "error", reasonCode: "transport_unreachable" },
  ];

  it.each(categories)("renders category=$category with severity=$severity", ({ category, severity, reasonCode }) => {
    const states = [makeDegradedState({ category, severity, reason: "test", affectedSubsystem: "test", reasonCode: reasonCode as never, explanation: "Test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText(category)).toBeInTheDocument();
  });

  it("renders critical severity correctly", () => {
    const states = [makeDegradedState({ category: "degraded", severity: "critical", reason: "critical", affectedSubsystem: "test", reasonCode: "unknown_error", explanation: "Critical", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders error severity correctly", () => {
    const states = [makeDegradedState({ category: "unavailable", severity: "error", reason: "error", affectedSubsystem: "test", reasonCode: "node_missing", explanation: "Error", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });
});
