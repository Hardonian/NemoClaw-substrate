// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Command, Flags } from "@oclif/core";
import * as path from "path";
import * as fs from "fs";
import { lintPolicyFile, formatLintReport, type PolicySchemaType } from "../../policy/lint-engine";

export default class PolicyLintCommand extends Command {
  static id = "policy:lint";
  static strict = false;
  static summary = "Lint sandbox policy files against schema";
  static description = "Validates sandbox-policy.json or YAML policy files against their JSON schema and reports structural, semantic, and operational safety violations.";
  static usage = ["policy lint [--schema sandbox-policy|policy-preset] [--policy-file <path>]"];
  static examples = [
    "<%= config.bin %> policy lint",
    "<%= config.bin %> policy lint --schema policy-preset --policy-file my-policy.yaml",
  ];

  static flags = {
    schema: Flags.string({
      description: "Schema type to validate against",
      options: ["sandbox-policy", "policy-preset"],
      default: "sandbox-policy",
    }),
    "policy-file": Flags.string({
      description: "Path to the policy file to lint",
    }),
  };

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(PolicyLintCommand);
    const schemaType = flags.schema as PolicySchemaType;

    let policyFile: string | null = flags["policy-file"] ?? null;

    if (!policyFile && argv.length > 0) {
      policyFile = String(argv[0]);
    }

    if (!policyFile) {
      policyFile = this.findDefaultPolicyFile();
    }

    if (!policyFile) {
      this.error("No policy file specified. Use --policy-file <path> or pass a file path as an argument.", { exit: 1 });
      return;
    }

    const resolvedPath = path.resolve(policyFile);
    if (!fs.existsSync(resolvedPath)) {
      this.error(`Policy file not found: ${resolvedPath}`, { exit: 1 });
      return;
    }

    const result = lintPolicyFile(resolvedPath, schemaType);
    this.log(formatLintReport(result));

    if (!result.valid) {
      this.exit(1);
    }
  }

  private findDefaultPolicyFile(): string | null {
    const candidates = [
      path.resolve("sandbox-policy.json"),
      path.resolve("sandbox-policy.yaml"),
      path.resolve("nemoclaw-blueprint", "openclaw-sandbox.yaml"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }
}
