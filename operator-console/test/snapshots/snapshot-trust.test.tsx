import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TrustInspector } from "../../src/components/viewers/trust-inspector";
import { sampleWorkerTrustDecisions, sampleWorkerAttestations, sampleWorkerIdentities } from "../../src/data/fixtures";

describe("Snapshot: TrustInspector", () => {
  it("renders trust data deterministically", () => {
    const { container } = render(
      <TrustInspector
        decisions={sampleWorkerTrustDecisions}
        attestations={sampleWorkerAttestations}
        identities={sampleWorkerIdentities}
      />
    );
    expect(container.textContent).toContain("Worker Trust Decisions (4)");
    expect(container.textContent).toContain("Worker Attestations (4)");
    expect(container.textContent).toContain("Worker Identities (3)");
    expect(container.textContent).toMatchSnapshot();
  });

  it("renders empty trust data deterministically", () => {
    const { container } = render(
      <TrustInspector decisions={[]} attestations={[]} identities={[]} />
    );
    expect(container.textContent).toContain("No trust decisions");
    expect(container.textContent).toContain("No attestations");
    expect(container.textContent).toContain("No worker identities");
    expect(container.textContent).toMatchSnapshot();
  });
});
