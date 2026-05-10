// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface OperatorProfile {
  name: string;
  remoteEnabled: boolean;
  requireApproval: boolean;
  trustedNetworks: string[];
}

const BASE: Record<string, OperatorProfile> = {
  "local-only": { name: "local-only", remoteEnabled: false, requireApproval: true, trustedNetworks: [] },
  "HX370-primary": { name: "HX370-primary", remoteEnabled: false, requireApproval: true, trustedNetworks: ["loopback"] },
  "X99-gpu-worker": { name: "X99-gpu-worker", remoteEnabled: false, requireApproval: true, trustedNetworks: ["loopback"] },
  "Radxa-observer": { name: "Radxa-observer", remoteEnabled: false, requireApproval: true, trustedNetworks: [] },
  "LAN-trusted": { name: "LAN-trusted", remoteEnabled: true, requireApproval: true, trustedNetworks: ["lan"] },
  "Tailscale-only": { name: "Tailscale-only", remoteEnabled: true, requireApproval: true, trustedNetworks: ["tailscale"] },
  "remote-disabled": { name: "remote-disabled", remoteEnabled: false, requireApproval: true, trustedNetworks: [] },
  "high-risk-approval-required": { name: "high-risk-approval-required", remoteEnabled: true, requireApproval: true, trustedNetworks: [] },
};

export function resolveProfile(name: string, env = process.env): OperatorProfile {
  const p = BASE[name];
  if (!p) throw new Error(`Invalid profile: ${name}`);
  return {
    ...p,
    remoteEnabled: env.NEMOCLAW_REMOTE_ENABLED ? env.NEMOCLAW_REMOTE_ENABLED === "1" : p.remoteEnabled,
  };
}
