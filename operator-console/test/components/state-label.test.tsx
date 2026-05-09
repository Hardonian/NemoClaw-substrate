import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateLabel } from "../src/components/primitives/state-label";

describe("StateLabel", () => {
  const allStates = ["healthy", "constrained", "degraded", "unavailable", "unknown", "partial_capability", "approval_blocked", "stale", "unreachable"];

  it.each(allStates)("renders state: %s", (state) => {
    render(<StateLabel state={state} />);
    const label = screen.getByLabelText(`State: ${state}`);
    expect(label).toHaveTextContent(state);
  });

  it("renders unknown state for unrecognized values", () => {
    render(<StateLabel state="nonexistent_state" />);
    const label = screen.getByLabelText("State: nonexistent_state");
    expect(label).toHaveTextContent("nonexistent_state");
  });

  it("always shows the raw state string", () => {
    render(<StateLabel state="unavailable" />);
    expect(screen.getByLabelText("State: unavailable")).toHaveTextContent("unavailable");
  });
});
