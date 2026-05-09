import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../src/components/primitives/status-badge";

describe("StatusBadge", () => {
  it("renders with info status", () => {
    render(<StatusBadge status="info" label="information" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-status", "info");
    expect(badge).toHaveTextContent("information");
  });

  it("renders with warning status", () => {
    render(<StatusBadge status="warning" label="warning" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "warning");
  });

  it("renders with error status", () => {
    render(<StatusBadge status="error" label="error" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "error");
  });

  it("renders with critical status", () => {
    render(<StatusBadge status="critical" label="critical" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "critical");
  });

  it("renders with success status", () => {
    render(<StatusBadge status="success" label="success" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "success");
  });

  it("renders with unknown status", () => {
    render(<StatusBadge status="unknown" label="unknown" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "unknown");
  });

  it("sets aria-label to the label value", () => {
    render(<StatusBadge status="info" label="test label" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "test label");
  });
});
