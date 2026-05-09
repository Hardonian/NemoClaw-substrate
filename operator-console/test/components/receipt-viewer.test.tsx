import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceiptViewer } from "../../src/components/viewers/receipt-viewer";
import { makeExecutionReceipt, makeDegradedState } from "../../src/data/fixtures";

describe("ReceiptViewer", () => {
  it("renders receipt ID and request ID", () => {
    const receipt = makeExecutionReceipt({ receiptId: "test-receipt", requestId: "test-req" });
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText(/test-receipt/)).toBeInTheDocument();
    expect(screen.getByText(/test-req/)).toBeInTheDocument();
  });

  it("renders execution phases", () => {
    const receipt = makeExecutionReceipt();
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Execution Phases")).toBeInTheDocument();
    expect(screen.getByText("received")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders degraded events when present", () => {
    const receipt = makeExecutionReceipt({
      degradedEvents: [
        makeDegradedState({ category: "degraded", severity: "warning", reason: "test", affectedSubsystem: "test", reasonCode: "capability_missing", explanation: "Test degraded", sourceComponent: "test" }),
      ],
    });
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText(/Degraded Events/)).toBeInTheDocument();
  });

  it("renders timing information", () => {
    const receipt = makeExecutionReceipt({ timing: { totalMs: 100, queueMs: 10, executionMs: 90 } });
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getByText("Timing")).toBeInTheDocument();
    expect(screen.getByText("100 ms")).toBeInTheDocument();
  });

  it("renders unavailable for missing timing values", () => {
    const receipt = makeExecutionReceipt({ timing: {} });
    render(<ReceiptViewer receipt={receipt} />);
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });
});
