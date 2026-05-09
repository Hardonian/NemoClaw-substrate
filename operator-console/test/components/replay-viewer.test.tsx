import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplayViewer } from "../../src/components/viewers/replay-viewer";
import { makeReplayEnvelope, sampleEvents, validReplayEnvelope, emptyReplayEnvelope } from "../../src/data/fixtures";

describe("ReplayViewer", () => {
  it("renders valid envelope with correct status", () => {
    render(<ReplayViewer envelope={validReplayEnvelope} />);
    expect(screen.getByText("Replay Envelope")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("renders empty envelope", () => {
    render(<ReplayViewer envelope={emptyReplayEnvelope} />);
    expect(screen.getByText("Replay Envelope")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("renders envelope with mismatched event count as invalid", () => {
    const invalid = makeReplayEnvelope({ eventCount: 99, events: [] });
    render(<ReplayViewer envelope={invalid} />);
    expect(screen.getByText("Validation Failed")).toBeInTheDocument();
    expect(screen.getByText("event_count_mismatch")).toBeInTheDocument();
  });

  it("renders envelope with sequence mismatch as invalid", () => {
    const invalid = makeReplayEnvelope({
      eventCount: 1,
      events: [{ ...sampleEvents[0], sequence: 5 }],
    });
    render(<ReplayViewer envelope={invalid} />);
    expect(screen.getByText("Validation Failed")).toBeInTheDocument();
    expect(screen.getByText("sequence_mismatch")).toBeInTheDocument();
  });

  it("displays event count in header", () => {
    render(<ReplayViewer envelope={validReplayEnvelope} />);
    expect(screen.getByText(`(${sampleEvents.length})`)).toBeInTheDocument();
  });
});
