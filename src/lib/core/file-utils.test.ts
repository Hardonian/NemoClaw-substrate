import * as fs from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { readJsonFileSync } from "./file-utils.js";

vi.mock("node:fs");

describe("readJsonFileSync", () => {
  it("reads and parses valid JSON", () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{"key":"value"}');
    expect(readJsonFileSync("/fake/path.json")).toEqual({ key: "value" });
  });

  it("throws on invalid JSON", () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{"key":');
    expect(() => readJsonFileSync("/fake/path.json")).toThrow();
  });
});
