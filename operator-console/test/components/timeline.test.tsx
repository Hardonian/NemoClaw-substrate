import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "../src/components/primitives/timeline";

describe("Timeline", () => {
  it("renders empty state when no items", () => {
    render(<Timeline items={[]} />);
    expect(screen.getByText("No timeline events.")).toBeInTheDocument();
  });

  it("renders items in order", () => {
    const items = [
      { timestamp: "2026-05-09T00:00:00.000Z", label: "First" },
      { timestamp: "2026-05-09T00:01:00.000Z", label: "Second" },
      { timestamp: "2026-05-09T00:02:00.000Z", label: "Third" },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByLabelText("Timeline")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders timestamp, label, status, and detail", () => {
    const items = [
      { timestamp: "2026-05-09T00:00:00.000Z", label: "Event", status: "healthy", detail: "Some detail" },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByText("Event")).toBeInTheDocument();
    expect(screen.getByText("Some detail")).toBeInTheDocument();
  });
});
