import fs from "fs";
import { describe, it, expect } from "vitest";

describe("local bootstrap docs", () => {
  it("documents ignore-scripts as local verification degraded", () => {
    const content = fs.readFileSync("docs/contributing/local-bootstrap.md", "utf8");
    expect(content).toContain("npm install --ignore-scripts");
    expect(content).toContain("contributor-side diagnosis only");
  });
});
