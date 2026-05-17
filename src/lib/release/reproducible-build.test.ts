// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createBuildInfo,
  buildInfoToJSON,
  buildInfoFromJSON,
  buildInfoMatch,
} from "./reproducible-build";

describe("createBuildInfo", () => {
  it("creates build info with required fields", () => {
    const info = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
    });
    expect(info.version).toBe("0.1.0");
    expect(info.commit).toBe("abc123");
    expect(info.nodeVersion).toBeDefined();
    expect(info.platform).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.toolchain).toBe("tsc");
    expect(info.deps).toEqual({});
  });

  it("uses provided values over defaults", () => {
    const info = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "webpack",
      deps: { "p-retry": "4.6.2" },
    });
    expect(info.nodeVersion).toBe("22.16.0");
    expect(info.platform).toBe("linux");
    expect(info.arch).toBe("x64");
    expect(info.toolchain).toBe("webpack");
    expect(info.deps["p-retry"]).toBe("4.6.2");
  });

  it("strips leading v from node version when using default", () => {
    const info = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
    });
    expect(info.nodeVersion).not.toMatch(/^v/);
  });
});

describe("buildInfoToJSON", () => {
  it("serializes build info to JSON", () => {
    const info = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      deps: { yaml: "2.8.3" },
    });
    const json = buildInfoToJSON(info);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.deps.yaml).toBe("2.8.3");
  });

  it("uses default indentation of 2", () => {
    const info = createBuildInfo({ version: "0.1.0", commit: "abc" });
    const json = buildInfoToJSON(info);
    expect(json).toContain("  \"version\"");
  });

  it("supports custom indentation", () => {
    const info = createBuildInfo({ version: "0.1.0", commit: "abc" });
    const json = buildInfoToJSON(info, 4);
    expect(json).toContain("    \"version\"");
  });
});

describe("buildInfoFromJSON", () => {
  it("parses valid JSON to build info", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: {},
    });
    const info = buildInfoFromJSON(json);
    expect(info.version).toBe("0.1.0");
    expect(info.commit).toBe("abc123");
  });

  it("throws on missing version", () => {
    const json = JSON.stringify({
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: {},
    });
    expect(() => buildInfoFromJSON(json)).toThrow("Invalid build info");
  });

  it("throws on missing commit", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: {},
    });
    expect(() => buildInfoFromJSON(json)).toThrow("Invalid build info");
  });

  it("throws on missing nodeVersion", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      commit: "abc123",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: {},
    });
    expect(() => buildInfoFromJSON(json)).toThrow("Invalid build info");
  });

  it("throws on invalid JSON", () => {
    expect(() => buildInfoFromJSON("not json")).toThrow();
  });
});

describe("buildInfoMatch", () => {
  it("returns true for identical build info", () => {
    const a = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: { "p-retry": "4.6.2" },
    });
    const b = { ...a, deps: { ...a.deps } };
    expect(buildInfoMatch(a, b)).toBe(true);
  });

  it("returns false for different version", () => {
    const a = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
    });
    const b = { ...a, version: "0.2.0" };
    expect(buildInfoMatch(a, b)).toBe(false);
  });

  it("returns false for different commit", () => {
    const a = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
    });
    const b = { ...a, commit: "def456" };
    expect(buildInfoMatch(a, b)).toBe(false);
  });

  it("returns false for different deps", () => {
    const a = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: { "p-retry": "4.6.2" },
    });
    const b = createBuildInfo({
      version: "0.1.0",
      commit: "abc123",
      nodeVersion: "22.16.0",
      platform: "linux",
      arch: "x64",
      toolchain: "tsc",
      deps: { "p-retry": "5.0.0" },
    });
    expect(buildInfoMatch(a, b)).toBe(false);
  });
});
