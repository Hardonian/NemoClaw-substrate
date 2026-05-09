import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateLabel } from "../../src/components/primitives/state-label";
import { DegradedInspector } from "../../src/components/viewers/degraded-inspector";
import { makeDegradedState } from "../../src/data/fixtures";
import { ReceiptViewer } from "../../src/components/viewers/receipt-viewer";
import { makeExecutionReceipt } from "../../src/data/fixtures";

describe("Unknown and unavailable rendering", () => {
  it("StateLabel renders 'unknown' state explicitly", () => {
    render(<StateLabel state="unknown" />);
    const label = screen.getByLabelText("State: unknown");
    expect(label).toHaveTextContent("unknown");
    expect(label).not.toBeEmptyDOMElement();
  });

  it("StateLabel renders 'unavailable' state explicitly", () => {
    render(<StateLabel state="unavailable" />);
    const label = screen.getByLabelText("State: unavailable");
    expect(label).toHaveTextContent("unavailable");
  });

  it("DegradedInspector renders unknown category explicitly", () => {
    const states = [makeDegradedState({ category: "unknown", reason: "unknown reason", affectedSubsystem: "test", severity: "warning", reasonCode: "unknown_error", explanation: "Unknown state", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  it("DegradedInspector renders unavailable category explicitly", () => {
    const states = [makeDegradedState({ category: "unavailable", reason: "not available", affectedSubsystem: "test", severity: "error", reasonCode: "node_missing", explanation: "Unavailable state", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });

  it("ReceiptViewer shows 'Unavailable' for missing timing", () => {
    const receipt = makeExecutionReceipt({ timing: {} });
    render(<ReceiptViewer receipt={receipt} />);
    const unavailableElements = screen.getAllByText("Unavailable");
    expect(unavailableElements.length).toBeGreaterThan(0);
  });

  it("EmptyState is shown for missing data", () => {
    render(<DegradedInspector states={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No degraded states");
  });
});
