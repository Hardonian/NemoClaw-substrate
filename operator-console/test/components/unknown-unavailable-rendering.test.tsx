import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedInspector } from "../../src/components/viewers/degraded-inspector";
import { StateLabel } from "../../src/components/primitives/state-label";
import { StatusBadge } from "../../src/components/primitives/status-badge";
import { makeDegradedState } from "../../src/data/fixtures";

describe("Unknown/unavailable rendering", () => {
  it("renders unknown degraded state explicitly without hiding it", () => {
    const states = [makeDegradedState({ category: "unknown", reason: "insufficient data", affectedSubsystem: "trust", severity: "warning", reasonCode: "unknown_error", explanation: "Trust assessment could not be completed.", sourceComponent: "worker-trust" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("Trust assessment could not be completed.")).toBeInTheDocument();
  });

  it("renders unavailable degraded state explicitly", () => {
    const states = [makeDegradedState({ category: "unavailable", reason: "offline", affectedSubsystem: "remote-worker", severity: "error", reasonCode: "node_missing", explanation: "Remote worker node not responding.", sourceComponent: "device-registry" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    expect(screen.getByText("Remote worker node not responding.")).toBeInTheDocument();
  });

  it("shows empty state when no degraded states present", () => {
    render(<DegradedInspector states={[]} />);
    expect(screen.getByText("No degraded states")).toBeInTheDocument();
    expect(screen.getByText("All subsystems are operating normally.")).toBeInTheDocument();
  });

  it("StateLabel renders unknown state", () => {
    render(<StateLabel state="unknown" />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  it("StateLabel renders unavailable state", () => {
    render(<StateLabel state="unavailable" />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });

  it("StatusBadge renders unknown status", () => {
    render(<StatusBadge status="unknown" label="unknown" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("unknown");
  });
});
