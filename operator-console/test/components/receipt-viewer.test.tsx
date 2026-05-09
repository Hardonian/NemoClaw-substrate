import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceiptViewer } from "../../src/components/viewers/receipt-viewer";
import { makeExecutionReceipt, makeDegradedState } from "../../src/data/fixtures";

describe("ReceiptViewer", () => {
  it("renders receipt with phases", () => {
    const receipt = makeExecutionReceipt();
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText(/Receipt:/)).toBeInTheDocument();
    expect(screen.getByText("Execution Phases")).toBeInTheDocument();
    expect(screen.getByText("received")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders degraded events when present", () => {
    const receipt = makeExecutionReceipt({
      degradedEvents: [
        makeDegradedState({ category: "degraded", reason: "test", affectedSubsystem: "test", severity: "warning", reasonCode: "test_code", explanation: "Test degraded state", sourceComponent: "test" }),
      ],
    });
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Degraded Events (1)")).toBeInTheDocument();
    expect(screen.getByText("test_code")).toBeInTheDocument();
  });

  it("renders scheduling decision", () => {
    const receipt = makeExecutionReceipt();
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Scheduling Decision")).toBeInTheDocument();
  });

  it("renders policy decision", () => {
    const receipt = makeExecutionReceipt();
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Policy Decision")).toBeInTheDocument();
  });

  it("renders provenance section", () => {
    const receipt = makeExecutionReceipt();
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Provenance")).toBeInTheDocument();
  });
});
