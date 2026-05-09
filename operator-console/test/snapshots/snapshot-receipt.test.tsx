import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReceiptViewer } from "../src/components/viewers/receipt-viewer";
import { makeExecutionReceipt, makeDegradedState } from "../src/data/fixtures";

describe("Snapshot: ReceiptViewer", () => {
  it("renders deterministically", () => {
    const receipt = makeExecutionReceipt({
      receiptId: "snapshot-receipt",
      requestId: "snapshot-req",
      nodeId: "node-a",
      modelId: "nvidia/model",
      phases: [
        { phase: "received", at: "2026-05-09T00:00:00.000Z", notes: "test" },
        { phase: "policy", at: "2026-05-09T00:00:00.000Z", notes: "policy_default_allow" },
        { phase: "scheduling", at: "2026-05-09T00:00:00.000Z", notes: "node-a" },
        { phase: "completed", at: "2026-05-09T00:00:00.000Z" },
      ],
      timing: { totalMs: 100, queueMs: 10, executionMs: 90 },
    });
    const { container } = render(<ReceiptViewer receipt={receipt} />);
    expect(container.textContent).toContain("snapshot-receipt");
    expect(container.textContent).toContain("snapshot-req");
    expect(container.textContent).toContain("100 ms");
    expect(container.textContent).toMatchSnapshot();
  });

  it("renders receipt with degraded events deterministically", () => {
    const receipt = makeExecutionReceipt({
      receiptId: "snapshot-degraded-receipt",
      degradedEvents: [
        makeDegradedState({ category: "degraded", severity: "warning", reason: "test", affectedSubsystem: "test", reasonCode: "test_code", explanation: "Test explanation", sourceComponent: "test", timestamp: "2026-05-09T00:00:00.000Z" }),
      ],
    });
    const { container } = render(<ReceiptViewer receipt={receipt} />);
    expect(container.textContent).toContain("Degraded Events");
    expect(container.textContent).toContain("test_code");
    expect(container.textContent).toMatchSnapshot();
  });
});
