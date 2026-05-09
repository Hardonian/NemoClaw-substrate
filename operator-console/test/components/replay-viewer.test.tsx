import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplayViewer } from "../../src/components/viewers/replay-viewer";
import { validReplayEnvelope, emptyReplayEnvelope, invalidReplayEnvelope } from "../../src/data/fixtures";

describe("ReplayViewer", () => {
  it("renders valid envelope with success status", () => {
    render(<ReplayViewer envelope={validReplayEnvelope} />);
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("renders empty envelope", () => {
    render(<ReplayViewer envelope={emptyReplayEnvelope} />);
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("renders invalid envelope with validation errors", () => {
    render(<ReplayViewer envelope={invalidReplayEnvelope} />);
    expect(screen.getByText("Validation Failed")).toBeInTheDocument();
    expect(screen.getByText("Validation Failures")).toBeInTheDocument();
  });

  it("shows envelope metadata", () => {
    render(<ReplayViewer envelope={validReplayEnvelope} />);
    expect(screen.getByText("Replay Envelope")).toBeInTheDocument();
    expect(screen.getByText(/Version 1/)).toBeInTheDocument();
  });
});
