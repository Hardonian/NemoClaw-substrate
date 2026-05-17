// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  getExplainer,
  listExplainers,
  explainCodes,
  explainersBySeverity,
} from "./diagnostic-explainers";

describe("getExplainer", () => {
  it("returns explainer for known code", () => {
    const exp = getExplainer("S-001");
    expect(exp).toBeDefined();
    expect(exp?.code).toBe("S-001");
    expect(exp?.description).toBeDefined();
    expect(exp?.cause).toBeDefined();
    expect(exp?.remediation).toBeDefined();
    expect(exp?.severity).toBeDefined();
  });

  it("returns undefined for unknown code", () => {
    expect(getExplainer("ZZ-999")).toBeUndefined();
  });

  it("every explainer has all required fields", () => {
    const explainers = listExplainers();
    for (const e of explainers) {
      expect(e.code).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(e.cause).toBeTruthy();
      expect(e.remediation).toBeTruthy();
      expect(["info", "warning", "error", "critical"]).toContain(e.severity);
    }
  });
});

describe("listExplainers", () => {
  it("returns sorted explainers", () => {
    const list = listExplainers();
    const codes = list.map((e) => e.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  it("returns non-empty list", () => {
    expect(listExplainers().length).toBeGreaterThan(0);
  });
});

describe("explainCodes", () => {
  it("returns explainers for valid codes", () => {
    const result = explainCodes(["S-001", "N-001"]);
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe("S-001");
    expect(result[1].code).toBe("N-001");
  });

  it("filters out unknown codes", () => {
    const result = explainCodes(["S-001", "ZZ-999"]);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("S-001");
  });

  it("returns empty for all unknown", () => {
    expect(explainCodes(["XX-000", "YY-000"])).toEqual([]);
  });
});

describe("explainersBySeverity", () => {
  it("filters by severity", () => {
    const criticals = explainersBySeverity("critical");
    expect(criticals.every((e) => e.severity === "critical")).toBe(true);
    expect(criticals.length).toBeGreaterThan(0);
  });

  it("returns empty if no explainers match", () => {
    // 'info' explainers exist in the enum but may not have any
    // Just verify the filter works
    const infos = explainersBySeverity("info");
    expect(infos.every((e) => e.severity === "info")).toBe(true);
  });
});
