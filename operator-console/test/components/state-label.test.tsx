import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateLabel } from "../../src/components/primitives/state-label";

describe("StateLabel", () => {
  it("renders all state variants correctly", () => {
    const states = ["healthy", "constrained", "degraded", "unavailable", "unknown", "partial_capability", "approval_blocked", "stale", "unreachable"];
    for (const state of states) {
      const { container, unmount } = render(<StateLabel state={state} />);
      const label = container.querySelector("span");
      expect(label).toHaveTextContent(state);
      expect(label).toHaveAttribute("aria-label", `State: ${state}`);
      unmount();
    }
  });

  it("renders unknown state explicitly", () => {
    render(<StateLabel state="unknown" />);
    const label = screen.getByText("unknown");
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("aria-label", "State: unknown");
  });

  it("renders unavailable state explicitly", () => {
    render(<StateLabel state="unavailable" />);
    const label = screen.getByText("unavailable");
    expect(label).toBeInTheDocument();
  });
});
