// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportSection {
  title: string;
  content: Record<string, unknown>;
}

export interface OperatorReport {
  generatedAt: string;
  reportId: string;
  sections: ReportSection[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a structured operator report from a set of named sections.
 */
export function createOperatorReport(
  reportId: string,
  sections: ReportSection[],
  summary: string = "",
): OperatorReport {
  return {
    generatedAt: new Date().toISOString(),
    reportId,
    sections,
    summary,
  };
}

/**
 * Serialize an operator report to JSON for automated ingestion.
 */
export function reportToJson(report: OperatorReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Serialize an operator report to a minimal HTML document.
 * Suitable for browser viewing or email embedding.
 */
export function reportToHtml(report: OperatorReport): string {
  const css = `
body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem; color: #1a1a1a; }
h1 { font-size: 1.5rem; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.5rem; }
h2 { font-size: 1.1rem; margin-top: 1.5rem; }
table { border-collapse: collapse; width: 100%; max-width: 800px; }
th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.85rem; }
th { background: #f5f5f5; }
.meta { color: #666; font-size: 0.85rem; }
.summary { background: #f0f7ff; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
`;

  const sectionHtml = report.sections
    .map(
      (s) => `
  <h2>${escapeHtml(s.title)}</h2>
  <table>
    <tbody>
      ${renderSectionRows(s.content)}
    </tbody>
  </table>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NemoClaw Operator Report — ${escapeHtml(report.reportId)}</title>
  <style>${css}</style>
</head>
<body>
  <h1>Operator Report</h1>
  <p class="meta">ID: ${escapeHtml(report.reportId)} &middot; Generated: ${escapeHtml(report.generatedAt)}</p>
  ${report.summary ? `<div class="summary">${escapeHtml(report.summary)}</div>` : ""}
  ${sectionHtml}
</body>
</html>`;
}

/**
 * Add a key-value section to an existing report. Returns a new report.
 */
export function addReportSection(
  report: OperatorReport,
  title: string,
  content: Record<string, unknown>,
): OperatorReport {
  return {
    ...report,
    sections: [...report.sections, { title, content }],
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function renderSectionRows(content: Record<string, unknown>): string {
  return Object.entries(content)
    .map(
      ([key, value]) => `
      <tr><th>${escapeHtml(key)}</th><td>${escapeHtml(formatValue(value))}</td></tr>`,
    )
    .join("");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
