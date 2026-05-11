// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createOperatorReport,
  reportToJson,
  reportToHtml,
  addReportSection,
} from "./operator-report";

describe("createOperatorReport", () => {
  it("creates a report with required fields", () => {
    const report = createOperatorReport("rpt-1", [
      { title: "Metrics", content: { cpu: 45 } },
    ]);
    expect(report.reportId).toBe("rpt-1");
    expect(report.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(report.sections).toHaveLength(1);
    expect(report.summary).toBe("");
  });

  it("accepts an optional summary", () => {
    const report = createOperatorReport("rpt-2", [], "All systems nominal");
    expect(report.summary).toBe("All systems nominal");
  });
});

describe("reportToJson", () => {
  it("produces valid JSON", () => {
    const report = createOperatorReport("rpt-3", [
      { title: "Health", content: { status: "ok" } },
    ]);
    const json = reportToJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.reportId).toBe("rpt-3");
    expect(parsed.sections).toHaveLength(1);
  });
});

describe("reportToHtml", () => {
  it("produces valid HTML with doctype", () => {
    const report = createOperatorReport("rpt-4", [
      { title: "Status", content: { ok: true } },
    ]);
    const html = reportToHtml(report);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("rpt-4");
    expect(html).toContain("Status");
    expect(html).toContain("ok");
  });

  it("includes summary when provided", () => {
    const report = createOperatorReport("rpt-5", [], "Summary here");
    const html = reportToHtml(report);
    expect(html).toContain("Summary here");
    expect(html).toContain("summary");
  });

  it("omits summary section when empty", () => {
    const report = createOperatorReport("rpt-6", []);
    const html = reportToHtml(report);
    expect(html).not.toContain("Summary here");
  });

  it("escapes HTML special characters in content", () => {
    const report = createOperatorReport("rpt-7", [
      { title: "XSS <script>", content: { key: "<b>bold</b>" } },
    ]);
    const html = reportToHtml(report);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("escapes ampersands and quotes", () => {
    const report = createOperatorReport("rpt-8", [
      { title: "A&B", content: { msg: 'He said "hi"' } },
    ]);
    const html = reportToHtml(report);
    expect(html).toContain("A&amp;B");
    expect(html).toContain("&quot;hi&quot;");
  });

  it("renders object values as JSON strings", () => {
    const report = createOperatorReport("rpt-9", [
      { title: "Complex", content: { nested: { a: 1 } } },
    ]);
    const html = reportToHtml(report);
    expect(html).toContain('{&quot;a&quot;:');
  });

  it("handles null/undefined values as empty strings", () => {
    const report = createOperatorReport("rpt-10", [
      { title: "Empty", content: { a: null, b: undefined } },
    ]);
    const html = reportToHtml(report);
    expect(html).toContain("Empty");
    expect(html).toContain("<td></td>");
  });
});

describe("addReportSection", () => {
  it("returns a new report with added section", () => {
    const report = createOperatorReport("rpt-11", [
      { title: "First", content: { x: 1 } },
    ]);
    const updated = addReportSection(report, "Second", { y: 2 });
    expect(updated.sections).toHaveLength(2);
    expect(updated.sections[1].title).toBe("Second");
    expect(updated.sections[1].content).toEqual({ y: 2 });
  });

  it("does not mutate the original report", () => {
    const report = createOperatorReport("rpt-12", []);
    addReportSection(report, "Added", {});
    expect(report.sections).toHaveLength(0);
  });
});
