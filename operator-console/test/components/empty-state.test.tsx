import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../src/components/primitives/empty-state";

describe("EmptyState", () => {
  it("renders with role=status", () => {
    render(<EmptyState title="No data" description="Nothing to show" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders title and description", () => {
    render(<EmptyState title="Empty title" description="Empty description" />);
    expect(screen.getByRole("status")).toHaveTextContent("Empty title");
    expect(screen.getByRole("status")).toHaveTextContent("Empty description");
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState title="No action" description="No button" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    render(<EmptyState title="With action" description="Has button" actionLabel="Click me" onAction={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });
});
