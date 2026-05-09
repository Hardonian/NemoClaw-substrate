import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedInspector } from "../src/components/viewers/degraded-inspector";
import { sampleDegradedStates, makeDegradedState } from "../src/data/fixtures";

describe("DegradedInspector", () => {
  it("renders empty state when no degraded states", () => {
    render(<DegradedInspector states={[]} />);
    expect(screen.getByText("No degraded states")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("All subsystems are operating normally.");
  });

  it("groups states by category", () => {
    render(<DegradedInspector states={sampleDegradedStates} />);
    const categories = ["healthy", "constrained", "degraded", "unavailable", "unknown", "stale", "approval_blocked", "unreachable", "partial_capability"];
    for (const cat of categories) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  it("shows count of degraded states", () => {
    render(<DegradedInspector states={sampleDegradedStates} />);
    expect(screen.getByText(`${sampleDegradedStates.length} degraded state(s)`)).toBeInTheDocument();
  });

  it("renders reason codes and explanations", () => {
    const states = [makeDegradedState({ category: "degraded", reason: "test reason", affectedSubsystem: "test", severity: "warning", reasonCode: "test_code", explanation: "Test explanation", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("test_code")).toBeInTheDocument();
    expect(screen.getByText("Test explanation")).toBeInTheDocument();
  });

  it("shows recovery suggestion when available", () => {
    const states = [makeDegradedState({ category: "degraded", reason: "test", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "Test", sourceComponent: "test", recoverySuggestion: "Do something" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText(/Recovery:/)).toBeInTheDocument();
    expect(screen.getByText("Do something")).toBeInTheDocument();
  });

  it("shows 'None' for recovery when not available", () => {
    const states = [makeDegradedState({ category: "degraded", reason: "test", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "Test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});
