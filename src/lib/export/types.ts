export interface ExportManifest {
  version: string;
  timestamp: string;
  type: 'audit' | 'replay' | 'diagnostics' | 'telemetry';
  bundleId: string;
  entries: ExportEntry[];
  merkleRoot: string;
}

export interface ExportEntry {
  id: string;
  timestamp: string;
  kind: 'receipt' | 'execution-plan' | 'approval-lineage' | 'telemetry-summary' | 'diagnostic' | 'degraded-state' | 'trust-evidence';
  data: unknown;
  hash: string;
}

export interface ReplayEnvelope {
  manifest: ExportManifest;
  signatures?: Record<string, string>;
}
