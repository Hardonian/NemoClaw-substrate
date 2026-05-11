// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  compareSemver,
  inRange,
  checkCompatibility,
  createDefaultMatrix,
  matrixForVersion,
  compatibilitySummary,
} from "./compatibility-matrix";
import type { CompatibilityMatrix } from "./compatibility-matrix";

describe("compareSemver", () => {
  it("returns 0 for equal versions", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns negative when first is less", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
  });

  it("returns positive when first is greater", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBeGreaterThan(0);
  });

  it("handles partial versions", () => {
    expect(compareSemver("1.0", "1.0.0")).toBe(0);
  });
});

describe("inRange", () => {
  it("returns true for version within range", () => {
    expect(inRange("1.5.0", "1.0.0", "2.0.0")).toBe(true);
    expect(inRange("1.0.0", "1.0.0", "2.0.0")).toBe(true);
    expect(inRange("2.0.0", "1.0.0", "2.0.0")).toBe(true);
  });

  it("returns false for version below range", () => {
    expect(inRange("0.9.0", "1.0.0", "2.0.0")).toBe(false);
  });

  it("returns false for version above range", () => {
    expect(inRange("2.1.0", "1.0.0", "2.0.0")).toBe(false);
  });
});

describe("checkCompatibility", () => {
  const matrix: CompatibilityMatrix = {
    cliMin: "1.0.0",
    cliMax: "2.0.0",
    serverMin: "3.0.0",
    serverMax: "4.0.0",
    sdkMin: "0.5.0",
    sdkMax: "1.0.0",
  };

  it("returns overall compatible when all versions in range", () => {
    const result = checkCompatibility("1.5.0", "3.5.0", "0.8.0", matrix);
    expect(result.overall).toBe(true);
    expect(result.cliCompatible).toBe(true);
    expect(result.serverCompatible).toBe(true);
    expect(result.sdkCompatible).toBe(true);
  });

  it("returns false when CLI out of range", () => {
    const result = checkCompatibility("2.1.0", "3.5.0", "0.8.0", matrix);
    expect(result.overall).toBe(false);
    expect(result.cliCompatible).toBe(false);
  });

  it("returns false when server out of range", () => {
    const result = checkCompatibility("1.5.0", "4.1.0", "0.8.0", matrix);
    expect(result.overall).toBe(false);
    expect(result.serverCompatible).toBe(false);
  });

  it("returns false when SDK out of range", () => {
    const result = checkCompatibility("1.5.0", "3.5.0", "1.1.0", matrix);
    expect(result.overall).toBe(false);
    expect(result.sdkCompatible).toBe(false);
  });
});

describe("createDefaultMatrix", () => {
  it("returns a valid compatibility matrix", () => {
    const matrix = createDefaultMatrix();
    expect(matrix.cliMin).toBe("0.1.0");
    expect(matrix.cliMax).toBe("0.99.0");
    expect(matrix.serverMin).toBe("0.1.0");
    expect(matrix.serverMax).toBe("0.99.0");
    expect(matrix.sdkMin).toBe("0.1.0");
    expect(matrix.sdkMax).toBe("0.99.0");
  });
});

describe("matrixForVersion", () => {
  it("creates matrix for major version 0", () => {
    const matrix = matrixForVersion("0.1.0");
    expect(matrix.cliMin).toBe("0.0.0");
    expect(matrix.cliMax).toBe("1.0.0");
  });

  it("creates matrix for major version 2", () => {
    const matrix = matrixForVersion("2.5.0");
    expect(matrix.cliMin).toBe("2.0.0");
    expect(matrix.cliMax).toBe("3.0.0");
    expect(matrix.serverMin).toBe("2.0.0");
    expect(matrix.serverMax).toBe("3.0.0");
    expect(matrix.sdkMin).toBe("2.0.0");
    expect(matrix.sdkMax).toBe("3.0.0");
  });
});

describe("compatibilitySummary", () => {
  it("returns success message when compatible", () => {
    const summary = compatibilitySummary({
      cliCompatible: true,
      serverCompatible: true,
      sdkCompatible: true,
      overall: true,
    });
    expect(summary).toBe("All components are compatible.");
  });

  it("reports CLI incompatibility", () => {
    const summary = compatibilitySummary({
      cliCompatible: false,
      serverCompatible: true,
      sdkCompatible: true,
      overall: false,
    });
    expect(summary).toContain("CLI version out of range");
  });

  it("reports all incompatibilities", () => {
    const summary = compatibilitySummary({
      cliCompatible: false,
      serverCompatible: false,
      sdkCompatible: false,
      overall: false,
    });
    expect(summary).toContain("CLI version out of range");
    expect(summary).toContain("Server version out of range");
    expect(summary).toContain("SDK version out of range");
  });
});
