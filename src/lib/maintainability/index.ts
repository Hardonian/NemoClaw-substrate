// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export {
  scanDependencyHygiene,
  checkDependencyHygieneStrict,
} from "./dependency-hygiene";
export type { DependencyIssue, DependencyHygieneReport } from "./dependency-hygiene";

export {
  scanNamingConventions,
  checkNamingConventionsStrict,
} from "./naming-conventions";
export type { NamingViolation, NamingConventionReport } from "./naming-conventions";

export {
  scanDeadCode,
  checkDeadCodeStrict,
} from "./dead-code-scan";
export type { DeadCodeEntry, DeadCodeReport } from "./dead-code-scan";

export {
  checkArchitectureBoundaries,
  checkArchitectureBoundariesStrict,
  getModuleBoundaries,
} from "./architecture-boundary";
export type {
  ModuleBoundary,
  BoundaryViolation,
  ArchitectureBoundaryReport,
} from "./architecture-boundary";
