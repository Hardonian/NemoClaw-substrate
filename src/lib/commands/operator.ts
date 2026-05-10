// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Command, Flags } from "@oclif/core";
import fs from "node:fs";
import path from "node:path";
import { formatJson, formatTable } from "../operator/format";
import type { OperatorOutput, OperatorRecord, OperatorTopic } from "../operator/types";

const TOPICS: OperatorTopic[] = [
  "status","diagnostics","workers","telemetry","trust","attestation","replay","receipts","proofpack","queue","policy","degraded","plans","approvals",
];

function loadTopic(topic: OperatorTopic, rootDir: string): OperatorRecord[] {
  const fixture = path.join(rootDir, "fixtures", "demo", `${topic}.json`);
  return JSON.parse(fs.readFileSync(fixture, "utf8")) as OperatorRecord[];
}

export default class OperatorCommand extends Command {
  static id = "operator";
  static summary = "Operator-facing governed substrate inspection surfaces";
  static args = [{ name: "topic", required: true, options: TOPICS }];
  static flags = {
    help: Flags.help({ char: "h" }),
    json: Flags.boolean({ description: "Emit deterministic JSON output" }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(OperatorCommand);
    const topic = args.topic as OperatorTopic;
    const rows = loadTopic(topic, this.config.root);
    const out: OperatorOutput = flags.json ? "json" : "table";
    this.log(out === "json" ? formatJson(topic, rows) : formatTable(rows));
  }
}
