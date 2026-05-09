import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DegradedInspector } from "../../src/components/viewers/degraded-inspector";
import { sampleDegradedStates } from "../../src/data/fixtures";

describe("DegradedInspector snapshot", () => {
  it("renders all degraded states snapshot", () => {
    const { container } = render(<DegradedInspector states={sampleDegradedStates} />);
    const text = container.textContent;
    expect(text).toContain("9 degraded state");
    expect(text).toContain("healthy");
    expect(text).toContain("constrained");
    expect(text).toContain("degraded");
    expect(text).toContain("unavailable");
    expect(text).toContain("unknown");
    expect(text).toContain("stale");
    expect(text).toContain("approval_blocked");
    expect(text).toContain("unreachable");
    expect(text).toContain("partial_capability");
  });

  it("renders empty state snapshot", () => {
    const { container } = render(<DegradedInspector states={[]} />);
    const text = container.textContent;
    expect(text).toContain("No degraded states");
    expect(text).toContain("All subsystems are operating normally");
  });
});
