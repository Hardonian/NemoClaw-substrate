import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TrustInspector } from "../../src/components/viewers/trust-inspector";
import { sampleWorkerTrustDecisions, sampleWorkerAttestations, sampleWorkerIdentities } from "../../src/data/fixtures";

describe("TrustInspector snapshot", () => {
  it("renders trust decisions snapshot", () => {
    const { container } = render(<TrustInspector decisions={sampleWorkerTrustDecisions} attestations={sampleWorkerAttestations} identities={sampleWorkerIdentities} />);
    const text = container.textContent;
    expect(text).toContain("4 Worker Trust Decisions");
    expect(text).toContain("trusted_local");
    expect(text).toContain("observed");
    expect(text).toContain("unknown");
    expect(text).toContain("untrusted");
    expect(text).toContain("4 Worker Attestations");
    expect(text).toContain("3 Worker Identities");
  });
});
