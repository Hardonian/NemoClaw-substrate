import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../src/components/primitives/empty-state";

describe("EmptyState", () => {
  it("renders with role status", () => {
    render(<EmptyState title="No data" description="Nothing here" />);
    const container = screen.getByRole("status");
    expect(container).toBeInTheDocument();
  });

  it("renders title and description", () => {
    render(<EmptyState title="No degraded states" description="All subsystems are operating normally." />);
    expect(screen.getByText("No degraded states")).toBeInTheDocument();
    expect(screen.getByText("All subsystems are operating normally.")).toBeInTheDocument();
  });

  it("is accessible with aria-live polite", () => {
    render(<EmptyState title="Empty" description="No content" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
