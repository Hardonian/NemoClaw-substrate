// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// We'll read the code file and the doc files to ensure parity.
const CODE_PATH = path.join(process.cwd(), "src", "lib", "control-plane", "execution-lifecycle.ts");
const OPERATIONAL_MEMORY_CODE_PATH = path.join(process.cwd(), "src", "lib", "control-plane", "operational-memory.ts");
const REASON_CODES_DOC_PATH = path.join(process.cwd(), "docs", "reference", "reason-codes.md");
const EVENT_TAXONOMY_DOC_PATH = path.join(process.cwd(), "docs", "reference", "event-taxonomy.md");

function documentedMarkdownCodeValues(docContent: string): Set<string> {
  const values = new Set<string>();
  for (const match of docContent.matchAll(/`([a-z0-9_]+)`/g)) {
    values.add(match[1]);
  }
  return values;
}

describe("Control Plane Documentation Parity", () => {
  it("ensures all ExecutionLifecycleReasonCode values are documented in reason-codes.md", () => {
    const codeContent = fs.readFileSync(CODE_PATH, "utf-8");
    const docContent = fs.readFileSync(REASON_CODES_DOC_PATH, "utf-8");

    // Isolate the ExecutionLifecycleReasonCode type definition
    const typeDefMatch = codeContent.match(/export type ExecutionLifecycleReasonCode =([\s\S]*?);/);
    if (!typeDefMatch) {
      throw new Error("Could not find ExecutionLifecycleReasonCode type definition in source code.");
    }
    const typeDefBody = typeDefMatch[1];

    // Extract reason codes from the body
    // Pattern: | "code_name"
    const reasonCodeMatches = typeDefBody.match(/\|\s*"([a-z0-9_]+)"/g);
    if (!reasonCodeMatches) {
      throw new Error("Could not find any reason code values in ExecutionLifecycleReasonCode definition.");
    }

    const expectedCodes = reasonCodeMatches.map((m) => m.match(/"([a-z0-9_]+)"/)![1]);

    const missingInDoc: string[] = [];
    const documentedCodes = documentedMarkdownCodeValues(docContent);
    for (const code of expectedCodes) {
      if (!documentedCodes.has(code)) {
        missingInDoc.push(code);
      }
    }

    expect(missingInDoc, `The following reason codes are missing from ${path.basename(REASON_CODES_DOC_PATH)}`).toEqual([]);
  });

  it("ensures all EXECUTION_LIFECYCLE_EVENT_TAXONOMY values are documented in event-taxonomy.md", () => {
    const codeContent = fs.readFileSync(CODE_PATH, "utf-8");
    const docContent = fs.readFileSync(EVENT_TAXONOMY_DOC_PATH, "utf-8");

    // Extract event types from EXECUTION_LIFECYCLE_EVENT_TAXONOMY array
    const eventMatch = codeContent.match(/export const EXECUTION_LIFECYCLE_EVENT_TAXONOMY = \[\s*([\s\S]*?)\s*\] as const;/);
    if (!eventMatch) {
      throw new Error("Could not find EXECUTION_LIFECYCLE_EVENT_TAXONOMY in source code.");
    }

    const expectedEvents = eventMatch[1]
      .split(",")
      .map((e) => e.trim().replace(/"/g, ""))
      .filter((e) => e.length > 0);

    const missingInDoc: string[] = [];
    const documentedEvents = documentedMarkdownCodeValues(docContent);
    for (const event of expectedEvents) {
      if (!documentedEvents.has(event)) {
        missingInDoc.push(event);
      }
    }

    expect(missingInDoc, `The following event types are missing from ${path.basename(EVENT_TAXONOMY_DOC_PATH)}`).toEqual([]);
  });

  it("ensures all OperationalEventCategory values are documented in event-taxonomy.md", () => {
    const codeContent = fs.readFileSync(OPERATIONAL_MEMORY_CODE_PATH, "utf-8");
    const docContent = fs.readFileSync(EVENT_TAXONOMY_DOC_PATH, "utf-8");

    const typeDefMatch = codeContent.match(/export type OperationalEventCategory =([\s\S]*?);/);
    if (!typeDefMatch) {
      throw new Error("Could not find OperationalEventCategory type definition in source code.");
    }
    const eventMatches = typeDefMatch[1].match(/\|\s*"([a-z0-9_]+)"/g);
    if (!eventMatches) {
      throw new Error("Could not find any operational event category values.");
    }

    const expectedEvents = eventMatches.map((m) => m.match(/"([a-z0-9_]+)"/)![1]);
    const documentedEvents = documentedMarkdownCodeValues(docContent);
    const missingInDoc = expectedEvents.filter((event) => !documentedEvents.has(event));

    expect(missingInDoc, `The following operational event categories are missing from ${path.basename(EVENT_TAXONOMY_DOC_PATH)}`).toEqual([]);
  });
});
