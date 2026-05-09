import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "../../src/components/primitives/timeline";

describe("Timeline", () => {
  it("renders timeline items in order", () => {
    const items = [
      { timestamp: "2026-05-09T00:00:00.000Z", label: "First" },
      { timestamp: "2026-05-09T00:01:00.000Z", label: "Second" },
      { timestamp: "2026-05-09T00:02:00.000Z", label: "Third" },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("renders empty message when no items", () => {
    render(<Timeline items={[]} />);
    expect(screen.getByText("No timeline events.")).toBeInTheDocument();
  });

  it("renders status and detail when provided", () => {
    const items = [
      { timestamp: "2026-05-09T00:00:00.000Z", label: "Phase", status: "healthy", detail: "Completed" },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByText("healthy")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
