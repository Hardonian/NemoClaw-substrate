import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../../src/components/primitives/status-badge";

describe("StatusBadge", () => {
  it("renders with correct label", () => {
    render(<StatusBadge status="warning" label="warning" />);
    expect(screen.getByRole("status")).toHaveTextContent("warning");
  });

  it("renders with info status", () => {
    render(<StatusBadge status="info" label="info" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("info");
    expect(badge).toHaveAttribute("data-status", "info");
  });

  it("renders with error status", () => {
    render(<StatusBadge status="error" label="error" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("error");
    expect(badge).toHaveAttribute("data-status", "error");
  });

  it("renders with critical status", () => {
    render(<StatusBadge status="critical" label="critical" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("critical");
    expect(badge).toHaveAttribute("data-status", "critical");
  });

  it("renders with success status", () => {
    render(<StatusBadge status="success" label="success" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("success");
    expect(badge).toHaveAttribute("data-status", "success");
  });

  it("renders with unknown status", () => {
    render(<StatusBadge status="unknown" label="unknown" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("unknown");
    expect(badge).toHaveAttribute("data-status", "unknown");
  });
});
