import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TrustInspector } from "../src/components/viewers/trust-inspector";
import { sampleWorkerTrustDecisions, sampleWorkerAttestations, sampleWorkerIdentities } from "../src/data/fixtures";

describe("Snapshot: TrustInspector", () => {
  it("renders trust data deterministically", () => {
    const { container } = render(
      <TrustInspector
        decisions={sampleWorkerTrustDecisions}
        attestations={sampleWorkerAttestations}
        identities={sampleWorkerIdentities}
      />
    );
    expect(container.textContent).toContain("4 Worker Trust Decisions");
    expect(container.textContent).toContain("4 Worker Attestations");
    expect(container.textContent).toContain("3 Worker Identities");
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
