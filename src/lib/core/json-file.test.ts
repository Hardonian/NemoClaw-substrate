import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readJsonSync, readJsonSyncSafe } from "./json-file";

describe("json-file", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "json-file-test-"));
    testFile = path.join(tmpDir, "test.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("readJsonSync", () => {
    it("should read and parse valid JSON", () => {
      const data = { hello: "world", count: 42 };
      fs.writeFileSync(testFile, JSON.stringify(data), "utf-8");

      const result = readJsonSync(testFile);
      expect(result).toEqual(data);
    });

    it("should throw if file does not exist", () => {
      expect(() => readJsonSync(path.join(tmpDir, "missing.json"))).toThrow();
    });

    it("should throw if file contains invalid JSON", () => {
      fs.writeFileSync(testFile, "{ invalid json", "utf-8");
      expect(() => readJsonSync(testFile)).toThrow(SyntaxError);
    });
  });

  describe("readJsonSyncSafe", () => {
    it("should read and parse valid JSON", () => {
      const data = { hello: "world", count: 42 };
      fs.writeFileSync(testFile, JSON.stringify(data), "utf-8");

      const result = readJsonSyncSafe(testFile, { fallback: true });
      expect(result).toEqual(data);
    });

    it("should return fallback if file does not exist", () => {
      const result = readJsonSyncSafe(path.join(tmpDir, "missing.json"), { fallback: true });
      expect(result).toEqual({ fallback: true });
    });

    it("should return fallback if file contains invalid JSON", () => {
      fs.writeFileSync(testFile, "{ invalid json", "utf-8");
      const result = readJsonSyncSafe(testFile, { fallback: true });
      expect(result).toEqual({ fallback: true });
    });
  });
});
