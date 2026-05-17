// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type Severity = "info" | "warning" | "error" | "critical";

export interface DiagnosticExplainer {
  code: string;
  description: string;
  cause: string;
  remediation: string;
  severity: Severity;
}

const EXPLAINERS: Record<string, DiagnosticExplainer> = {
  "S-001": {
    code: "S-001",
    description: "Sandbox process terminated unexpectedly",
    cause: "The agent sandbox process exited without a graceful shutdown signal.",
    remediation: "Restart the sandbox with `nemoclaw sandbox start`. Review sandbox logs for OOM kills or segfaults.",
    severity: "error",
  },
  "S-002": {
    code: "S-002",
    description: "Sandbox resource limits exceeded",
    cause: "The sandbox hit configured CPU, memory, or disk limits.",
    remediation: "Increase limits in the blueprint manifest or reduce agent workload.",
    severity: "warning",
  },
  "N-001": {
    code: "N-001",
    description: "Network policy violation detected",
    cause: "Egress traffic was blocked by the configured network policy.",
    remediation: "Review network policy in `nemoclaw-blueprint/policies/presets/` and adjust allowed destinations.",
    severity: "warning",
  },
  "N-002": {
    code: "N-002",
    description: "SSRF validation failed",
    cause: "A request was made to an internal or disallowed endpoint.",
    remediation: "Check the SSRF validation rules in the blueprint and review agent plugin requests.",
    severity: "error",
  },
  "N-003": {
    code: "N-003",
    description: "Node unreachable",
    cause: "One or more cluster nodes cannot be reached via the configured network path.",
    remediation: "Verify network connectivity, check node health, and confirm DNS resolution.",
    severity: "critical",
  },
  "C-001": {
    code: "C-001",
    description: "Credential leak detected in output",
    cause: "A secret or API key was found in sandbox stdout or logs.",
    remediation: "Rotate the exposed credential immediately. Add the key pattern to the credential sanitization list.",
    severity: "critical",
  },
  "C-002": {
    code: "C-002",
    description: "Credential sanitization bypass attempted",
    cause: "An agent process tried to write credentials in an unsanitized format.",
    remediation: "Audit agent behavior and tighten output filtering policies.",
    severity: "error",
  },
  "A-001": {
    code: "A-001",
    description: "Attestation verification failed",
    cause: "The sandbox attestation report could not be verified against the expected root of trust.",
    remediation: "Check hardware attestation configuration and verify the platform key is current.",
    severity: "error",
  },
  "A-002": {
    code: "A-002",
    description: "Attestation expired",
    cause: "The sandbox attestation report has passed its validity window.",
    remediation: "Re-attest the sandbox by restarting it.",
    severity: "warning",
  },
  "D-001": {
    code: "D-001",
    description: "Degraded cluster state",
    cause: "Fewer than the required number of nodes are reachable for quorum.",
    remediation: "Restore unreachable nodes or reduce the cluster to a consistent subset.",
    severity: "warning",
  },
  "P-001": {
    code: "P-001",
    description: "Policy configuration error",
    cause: "A network or security policy manifest failed validation.",
    remediation: "Run `nemoclaw policy validate` and fix the YAML syntax or schema violations.",
    severity: "error",
  },
  "P-002": {
    code: "P-002",
    description: "Plugin compatibility mismatch",
    cause: "A loaded plugin version is incompatible with the current NemoClaw runtime.",
    remediation: "Update the plugin to a compatible version or pin the runtime version.",
    severity: "warning",
  },
};

export function getExplainer(code: string): DiagnosticExplainer | undefined {
  return EXPLAINERS[code];
}

export function listExplainers(): DiagnosticExplainer[] {
  return Object.values(EXPLAINERS).sort((a, b) => a.code.localeCompare(b.code));
}

export function explainCodes(codes: string[]): DiagnosticExplainer[] {
  return codes.map((c) => getExplainer(c)).filter((e): e is DiagnosticExplainer => e !== undefined);
}

export function explainersBySeverity(
  severity: Severity,
): DiagnosticExplainer[] {
  return listExplainers().filter((e) => e.severity === severity);
}
