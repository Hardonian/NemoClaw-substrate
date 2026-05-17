// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Release engineering barrel exports.
 *
 * Re-exports all release engineering modules for convenient single-point imports.
 */

export {
  computeSHA256,
  createArtifact,
  createManifest,
  manifestToJSON,
  manifestFromJSON,
} from "./release-manifest";

export type {
  ArtifactProvenance,
  ReleaseArtifact,
  ReleaseManifest,
} from "./release-manifest";

export {
  computeBundleHash,
  verifyArtifact,
  verifyBundle,
  isIntegrityValid,
  integrityReportSummary,
} from "./integrity";

export type { IntegrityResult, IntegrityReport } from "./integrity";

export {
  parseConventionalCommit,
  parseCommits,
  groupByType,
  extractBreakingChanges,
  entriesToChangelog,
  generateChangelog,
  changelogToMarkdown,
} from "./changelog";

export type {
  ConventionalCommit,
  ChangelogEntry,
  ChangelogSection,
  Changelog,
} from "./changelog";

export {
  compareSemver,
  inRange,
  checkCompatibility,
  createDefaultMatrix,
  matrixForVersion,
  compatibilitySummary,
} from "./compatibility-matrix";

export type { CompatibilityMatrix, CompatibilityCheck } from "./compatibility-matrix";

export {
  createBuildInfo,
  buildInfoToJSON,
  buildInfoFromJSON,
  buildInfoMatch,
} from "./reproducible-build";

export type { ReproducibleBuildInfo } from "./reproducible-build";
