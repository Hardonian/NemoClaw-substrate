import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedInspector } from "../../src/components/viewers/degraded-inspector";
import { makeDegradedState } from "../../src/data/fixtures";

describe("DegradedInspector degraded-state rendering", () => {
  it("renders healthy category explicitly", () => {
    const states = [makeDegradedState({ category: "healthy" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders constrained category explicitly", () => {
    const states = [makeDegradedState({ category: "constrained", reason: "limited", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("constrained")).toBeInTheDocument();
  });

  it("renders degraded category explicitly", () => {
    const states = [makeDegradedState({ category: "degraded", reason: "slow", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("degraded")).toBeInTheDocument();
  });

  it("renders unavailable category explicitly", () => {
    const states = [makeDegradedState({ category: "unavailable", reason: "offline", affectedSubsystem: "test", severity: "error", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });

  it("renders stale category explicitly", () => {
    const states = [makeDegradedState({ category: "stale", reason: "old", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("stale")).toBeInTheDocument();
  });

  it("renders approval_blocked category explicitly", () => {
    const states = [makeDegradedState({ category: "approval_blocked", reason: "waiting", affectedSubsystem: "test", severity: "warning", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("approval_blocked")).toBeInTheDocument();
  });

  it("renders partial_capability category explicitly", () => {
    const states = [makeDegradedState({ category: "partial_capability", reason: "partial", affectedSubsystem: "test", severity: "info", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("partial_capability")).toBeInTheDocument();
  });

  it("renders unreachable category explicitly", () => {
    const states = [makeDegradedState({ category: "unreachable", reason: "no route", affectedSubsystem: "test", severity: "error", reasonCode: "test", explanation: "test", sourceComponent: "test" })];
    render(<DegradedInspector states={states} />);
    expect(screen.getByText("unreachable")).toBeInTheDocument();
  });
});
