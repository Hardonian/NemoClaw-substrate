import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DegradedInspector } from "../src/components/viewers/degraded-inspector";
import { sampleDegradedStates } from "../src/data/fixtures";

describe("Snapshot: DegradedInspector", () => {
  it("renders all degraded categories deterministically", () => {
    const { container } = render(<DegradedInspector states={sampleDegradedStates} />);
    expect(container.textContent).toContain("9 degraded state(s)");
    expect(container.textContent).toContain("healthy");
    expect(container.textContent).toContain("degraded");
    expect(container.textContent).toContain("unavailable");
    expect(container.textContent).toMatchSnapshot();
  });

  it("renders empty state deterministically", () => {
    const { container } = render(<DegradedInspector states={[]} />);
    expect(container.textContent).toContain("No degraded states");
    expect(container.textContent).toMatchSnapshot();
  });
});
