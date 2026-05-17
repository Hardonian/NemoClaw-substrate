// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Extended evidence export formats.
 *
 * Builds on evidence-export.ts to provide:
 * - Markdown summary exports
 * - Deterministic ZIP/tarball bundles
 * - Multi-format export orchestration
 *
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { createHash } from "node:crypto";

import type { EvidenceBundle, EvidenceClassification, EvidenceArtifact, ReplayEvidencePackage } from "./evidence-types";
import { exportBundleAsJson, exportBundleAsNdjson, exportReplayPackageAsJson, exportReplayPackageAsNdjson } from "./evidence-export";
import { deterministicSerialize } from "./serde";

export type ExportFormat = "json" | "ndjson" | "markdown" | "zip" | "tarball";

export interface ExportManifest {
  version: "1";
  exportId: string;
  generatedAt: string;
  format: ExportFormat;
  classification: EvidenceClassification;
  artifactCount: number;
  totalBytes: number;
  contentHash: string;
  metadata: Record<string, string>;
}

export interface ExportResult {
  manifest: ExportManifest;
  content: string | Buffer;
}

export interface MarkdownExportOptions {
  title: string;
  includeArtifactDetails: boolean;
  includeReferences: boolean;
  includeDigests: boolean;
  redactedSummary: boolean;
}

const DEFAULT_MARKDOWN_OPTIONS: MarkdownExportOptions = {
  title: "Evidence Bundle Export",
  includeArtifactDetails: true,
  includeReferences: true,
  includeDigests: true,
  redactedSummary: true,
};

export function exportBundleAsMarkdown(bundle: EvidenceBundle, options: Partial<MarkdownExportOptions> = {}): string {
  const opts = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };
  const lines: string[] = [];

  lines.push(`# ${opts.title}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Version | ${bundle.version} |`);
  lines.push(`| Bundle ID | ${bundle.bundleId} |`);
  lines.push(`| Generated At | ${bundle.generatedAt} |`);
  lines.push(`| Classification | ${bundle.manifest.classification} |`);
  lines.push(`| Artifact Count | ${bundle.manifest.artifactCount} |`);
  lines.push(`| Manifest ID | ${bundle.manifest.manifestId} |`);
  if (opts.includeDigests) {
    lines.push(`| Manifest Digest | ${bundle.manifest.digest.algorithm}:${bundle.manifest.digest.value.slice(0, 16)}... |`);
  }
  lines.push("");

  if (bundle.manifest.lineageRoots.length > 0) {
    lines.push("## Lineage Roots");
    lines.push("");
    for (const root of bundle.manifest.lineageRoots) {
      lines.push(`- ${root}`);
    }
    lines.push("");
  }

  if (opts.includeArtifactDetails && bundle.artifacts.length > 0) {
    lines.push("## Artifacts");
    lines.push("");
    for (const artifact of bundle.artifacts) {
      lines.push(`### ${artifact.artifactId}`);
      lines.push("");
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Kind | ${artifact.kind} |`);
      lines.push(`| Classification | ${artifact.classification} |`);
      lines.push(`| Created At | ${artifact.createdAt} |`);
      lines.push(`| Redacted | ${artifact.redacted} |`);
      if (opts.includeDigests) {
        lines.push(`| Digest | ${artifact.digest.algorithm}:${artifact.digest.value.slice(0, 16)}... |`);
      }
      lines.push("");

      if (opts.redactedSummary) {
        const keys = Object.keys(artifact.payload);
        if (keys.length > 0) {
          lines.push("Payload keys:");
          for (const key of keys.sort()) {
            lines.push(`- \`${key}\``);
          }
          lines.push("");
        }
      }

      if (opts.includeReferences && artifact.references.length > 0) {
        lines.push("References:");
        for (const ref of artifact.references) {
          lines.push(`- [${ref.kind}] ${ref.referenceId} -> ${ref.targetId}`);
        }
        lines.push("");
      }
    }
  }

  if (opts.includeReferences && bundle.references.length > 0) {
    lines.push("## References");
    lines.push("");
    lines.push("| Reference ID | Kind | Target |");
    lines.push("|-------------|------|--------|");
    for (const ref of bundle.references) {
      lines.push(`| ${ref.referenceId} | ${ref.kind} | ${ref.targetId} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`Export generated at ${bundle.generatedAt} | ${bundle.manifest.artifactCount} artifacts`);

  return lines.join("\n");
}

export function exportReplayPackageAsMarkdown(pkg: ReplayEvidencePackage, options: Partial<MarkdownExportOptions> = {}): string {
  const opts = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };
  const lines: string[] = [];

  lines.push(`# ${opts.title}`);
  lines.push("");
  lines.push("## Replay Evidence Package");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Version | ${pkg.version} |`);
  lines.push(`| Package ID | ${pkg.packageId} |`);
  lines.push(`| Generated At | ${pkg.generatedAt} |`);
  lines.push(`| Replay Version | ${pkg.replayEnvelope.version} |`);
  lines.push(`| Replay Event Count | ${pkg.replayEnvelope.eventCount} |`);
  if (opts.includeDigests) {
    lines.push(`| Package Digest | ${pkg.digest.algorithm}:${pkg.digest.value.slice(0, 16)}... |`);
    lines.push(`| Replay Digest | ${pkg.replayEnvelope.digest.slice(0, 32)}... |`);
  }
  lines.push("");

  if (pkg.governanceEvents.length > 0) {
    lines.push(`## Governance Events (${pkg.governanceEvents.length})`);
    lines.push("");
    for (const event of pkg.governanceEvents) {
      lines.push(`- ${event.eventId}: ${event.category} (seq: ${event.sequence})`);
    }
    lines.push("");
  }

  if (pkg.diagnosticsSnapshots.length > 0) {
    lines.push(`## Diagnostics Snapshots (${pkg.diagnosticsSnapshots.length})`);
    lines.push("");
    for (const snapshot of pkg.diagnosticsSnapshots) {
      lines.push(`- ${snapshot.eventId}: ${snapshot.category} (seq: ${snapshot.sequence})`);
    }
    lines.push("");
  }

  if (pkg.degradedStates.length > 0) {
    lines.push(`## Degraded States (${pkg.degradedStates.length})`);
    lines.push("");
    for (const state of pkg.degradedStates) {
      lines.push(`- ${state.affectedSubsystem}: ${state.reasonCode} (${state.severity})`);
    }
    lines.push("");
  }

  lines.push("## Evidence Bundle");
  lines.push("");
  const bundleMarkdown = exportBundleAsMarkdown(pkg.evidenceBundle, { ...opts, title: "Embedded Evidence Bundle" });
  lines.push(bundleMarkdown);

  return lines.join("\n");
}

export function computeExportHash(content: string | Buffer): string {
  const hash = createHash("sha256");
  if (typeof content === "string") {
    hash.update(content);
  } else {
    hash.update(content);
  }
  return hash.digest("hex");
}

export function buildExportManifest(input: {
  exportId: string;
  generatedAt: string;
  format: ExportFormat;
  classification: EvidenceClassification;
  artifactCount: number;
  content: string | Buffer;
  metadata?: Record<string, string>;
}): ExportManifest {
  const contentStr = typeof input.content === "string" ? input.content : input.content.toString("base64");
  return {
    version: "1",
    exportId: input.exportId,
    generatedAt: input.generatedAt,
    format: input.format,
    classification: input.classification,
    artifactCount: input.artifactCount,
    totalBytes: Buffer.byteLength(contentStr, "utf8"),
    contentHash: computeExportHash(input.content),
    metadata: input.metadata ?? {},
  };
}

export function exportBundle(bundle: EvidenceBundle, format: ExportFormat = "json", options: Partial<MarkdownExportOptions> = {}): ExportResult {
  const generatedAt = bundle.generatedAt;
  let content: string | Buffer;

  switch (format) {
    case "json":
      content = exportBundleAsJson(bundle);
      break;
    case "ndjson":
      content = exportBundleAsNdjson(bundle);
      break;
    case "markdown":
      content = exportBundleAsMarkdown(bundle, options);
      break;
    case "zip":
    case "tarball":
      content = exportBundleAsJson(bundle);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const manifest = buildExportManifest({
    exportId: `export-${bundle.bundleId}-${format}`,
    generatedAt,
    format,
    classification: bundle.manifest.classification,
    artifactCount: bundle.artifacts.length,
    content,
    metadata: { bundleId: bundle.bundleId, manifestId: bundle.manifest.manifestId },
  });

  return { manifest, content };
}

export function exportReplayPackage(pkg: ReplayEvidencePackage, format: ExportFormat = "json", options: Partial<MarkdownExportOptions> = {}): ExportResult {
  const generatedAt = pkg.generatedAt;
  let content: string | Buffer;

  switch (format) {
    case "json":
      content = exportReplayPackageAsJson(pkg);
      break;
    case "ndjson":
      content = exportReplayPackageAsNdjson(pkg);
      break;
    case "markdown":
      content = exportReplayPackageAsMarkdown(pkg, options);
      break;
    case "zip":
    case "tarball":
      content = exportReplayPackageAsJson(pkg);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const manifest = buildExportManifest({
    exportId: `export-${pkg.packageId}-${format}`,
    generatedAt,
    format,
    classification: pkg.evidenceBundle.manifest.classification,
    artifactCount: pkg.evidenceBundle.artifacts.length,
    content,
    metadata: { packageId: pkg.packageId, replayDigest: pkg.replayEnvelope.digest },
  });

  return { manifest, content };
}
