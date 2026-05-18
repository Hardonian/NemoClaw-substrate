import fs from "fs";
import { expect, test, describe } from "vitest";

describe("local bootstrap docs", () => {
  test("documents ignore-scripts as local verification fallback", () => {
    const content = fs.readFileSync("docs/contributing/local-bootstrap.md", "utf8");
    expect(content).toContain("npm install --ignore-scripts");
    expect(content).toContain("contributor-side diagnosis only");
  });
});
