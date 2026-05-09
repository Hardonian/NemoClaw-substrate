import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReceiptViewer } from "../../src/components/viewers/receipt-viewer";
import { makeExecutionReceipt, makeDegradedState, T } from "../../src/data/fixtures";

describe("ReceiptViewer snapshot", () => {
  it("renders complete receipt snapshot", () => {
    const receipt = makeExecutionReceipt({
      receiptId: "snap-001",
      requestId: "snap-req-001",
      phases: [
        { phase: "received", at: T, notes: "control_request" },
        { phase: "policy", at: T, notes: "policy_default_allow" },
        { phase: "scheduling", at: T, notes: "node-a:local" },
        { phase: "completed", at: T },
      ],
      timing: { totalMs: 250, queueMs: 20, executionMs: 230 },
      provenance: { source: "snapshot-test", lineage: ["chat", "provider"], replayVersion: "1" },
    });
    const { container } = render(<ReceiptViewer receipt={receipt} />);
    const text = container.textContent;
    expect(text).toContain("snap-001");
    expect(text).toContain("snap-req-001");
    expect(text).toContain("received");
    expect(text).toContain("completed");
    expect(text).toContain("250 ms");
  });

  it("renders receipt with degraded events snapshot", () => {
    const receipt = makeExecutionReceipt({
      receiptId: "snap-002",
      degradedEvents: [
        makeDegradedState({ category: "degraded", reason: "test degraded", affectedSubsystem: "runtime", severity: "warning", reasonCode: "transport_unreachable", explanation: "Test explanation", sourceComponent: "test", timestamp: T, recoverySuggestion: "Test recovery" }),
      ],
    });
    const { container } = render(<ReceiptViewer receipt={receipt} />);
    const text = container.textContent;
    expect(text).toContain("snap-002");
    expect(text).toContain("transport_unreachable");
    expect(text).toContain("Test explanation");
    expect(text).toContain("Test recovery");
  });
});
