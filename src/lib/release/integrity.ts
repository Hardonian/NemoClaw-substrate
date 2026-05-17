// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Bundle integrity validation.
 *
 * Pure functions for verifying that a bundle matches its release manifest.
 * No I/O — takes content and manifest as input, returns verification results.
 */

import { createHash } from "node:crypto";
import type { ReleaseManifest } from "./release-manifest";

export interface IntegrityResult {
  valid: boolean;
  artifactName: string;
  expected: string;
  actual: string;
}

export interface IntegrityReport {
  passed: IntegrityResult[];
  failed: IntegrityResult[];
  missing: string[];
}

export function computeBundleHash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function verifyArtifact(
  artifactName: string,
  content: string | Buffer,
  manifest: ReleaseManifest,
): IntegrityResult {
  const artifact = manifest.artifacts.find((a) => a.name === artifactName);
  if (!artifact) {
    return {
      valid: false,
      artifactName,
      expected: "not found in manifest",
      actual: computeBundleHash(content),
    };
  }
  const actual = computeBundleHash(content);
  return {
    valid: actual === artifact.hash,
    artifactName,
    expected: artifact.hash,
    actual,
  };
}

export function verifyBundle(
  bundles: Map<string, string | Buffer>,
  manifest: ReleaseManifest,
): IntegrityReport {
  const passed: IntegrityResult[] = [];
  const failed: IntegrityResult[] = [];
  const missing: string[] = [];

  for (const artifact of manifest.artifacts) {
    const content = bundles.get(artifact.name);
    if (content === undefined) {
      missing.push(artifact.name);
      continue;
    }
    const result = verifyArtifact(artifact.name, content, manifest);
    if (result.valid) {
      passed.push(result);
    } else {
      failed.push(result);
    }
  }

  return { passed, failed, missing };
}

export function isIntegrityValid(report: IntegrityReport): boolean {
  return report.failed.length === 0 && report.missing.length === 0;
}

export function integrityReportSummary(report: IntegrityReport): string {
  const total = report.passed.length + report.failed.length + report.missing.length;
  if (isIntegrityValid(report)) {
    return `All ${total} artifact(s) verified successfully.`;
  }
  const parts: string[] = [];
  if (report.failed.length > 0) {
    parts.push(`${report.failed.length} hash mismatch(es)`);
  }
  if (report.missing.length > 0) {
    parts.push(`${report.missing.length} missing artifact(s)`);
  }
  return `${report.passed.length}/${total} artifact(s) valid. ${parts.join(", ")}.`;
}
