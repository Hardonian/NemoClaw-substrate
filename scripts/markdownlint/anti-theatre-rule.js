// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  names: ["anti-theatre-terms"],
  description: "Enforce anti-theatre integrity by blocking autonomous-washing terms",
  tags: ["anti-theatre"],
  function: function rule(params, onError) {
    const forbiddenTerms = [
      "self-heal",
      "self-healing",
      "auto-recover",
      "auto-recovering",
      "autonomous failover",
      "fallback",
      "evidence bundle",
      "export bundle",
      "trust decision"
    ];

    params.lines.forEach((line, lineIndex) => {
      forbiddenTerms.forEach(term => {
        const regex = new RegExp("\\b" + term + "\\b", "i");
        const match = line.match(regex);
        if (match) {
          onError({
            lineNumber: lineIndex + 1,
            detail: `Forbidden term found: "${match[0]}". Use canonical terms (e.g., "Degraded State", "Proofpack", "Authorization").`,
            context: line
          });
        }
      });
    });
  }
};
