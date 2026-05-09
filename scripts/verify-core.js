// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawnSync } = require("node:child_process");

const args = new Set(process.argv.slice(2));
const strictMode = args.has("--strict");

const checks = [
  { id: "changelog", label: "CHANGELOG hygiene", command: ["npm", "run", "verify:changelog-hygiene"] },
  { id: "typecheck", label: "TypeScript typecheck", command: ["npm", "run", "typecheck"] },
  { id: "lint", label: "Biome lint", command: ["npm", "run", "lint"] },
  { id: "control-plane", label: "Control-plane tests", command: ["npm", "run", "verify:control-plane"] },
  { id: "local-probes", label: "Local probes tests", command: ["npm", "run", "verify:local-probes"] },
  { id: "remote-probes", label: "Remote probes tests", command: ["npm", "run", "verify:remote-probes"] },
  { id: "governed-routing", label: "Governed routing tests", command: ["npm", "run", "verify:governed-routing"] },
];

function isToolchainFailure(result) {
  if (result.error && result.error.code === "ENOENT") return true;
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
  return (
    text.includes("command not found") ||
    text.includes("is not recognized") ||
    text.includes("could not determine executable") ||
    text.includes("missing script") ||
    text.includes("cannot find module")
  );
}

let repoFailures = 0;
let warnings = 0;
console.log(`verify-core (${strictMode ? "strict" : "relaxed"} mode)`);
for (const check of checks) {
  const [cmd, ...cmdArgs] = check.command;
  const result = spawnSync(cmd, cmdArgs, { stdio: "pipe", encoding: "utf8" });
  if (result.status === 0) {
    console.log(`PASS ${check.label}`);
    continue;
  }

  const toolchainFailure = isToolchainFailure(result);
  if (toolchainFailure) {
    warnings += 1;
    console.log(`WARN ${check.label}`);
  } else {
    repoFailures += 1;
    console.log(`FAIL ${check.label}`);
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) {
    console.log(output.split("\n").map((line) => `  ${line}`).join("\n"));
  }
}

const shouldFail = repoFailures > 0 || (strictMode && warnings > 0);
console.log(`Summary: PASS=${checks.length - repoFailures - warnings} WARN=${warnings} FAIL=${repoFailures}`);
process.exit(shouldFail ? 1 : 0);
