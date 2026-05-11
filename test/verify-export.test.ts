// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  scanForHardcodedSecrets,
  scanForUnauthorizedEgress,
  scanNetworkPolicies,
  walkDir,
  ALLOWED_EGRESS,
} from "../../scripts/verify-export.ts";
import type { ScanTarget } from "../../scripts/verify-export.ts";

describe("verify-export script", () => {
  describe("ALLOWED_EGRESS", () => {
    it("contains expected hosts", () => {
      expect(ALLOWED_EGRESS.has("localhost")).toBe(true);
      expect(ALLOWED_EGRESS.has("github.com")).toBe(true);
      expect(ALLOWED_EGRESS.has("api.github.com")).toBe(true);
    });
  });

  describe("scanForHardcodedSecrets", () => {
    it("detects hardcoded API keys", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: 'const apiKey = "abcdefghijklmnopqrstuvwxyz123456";\n',
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].name).toBe("hardcoded_secret");
    });

    it("detects hardcoded secret keys", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: "secret_key = 'ABCDEFGHIJKLMNOPQRSTUVWX123456';\n",
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("ignores comments", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: "// apiKey = \"abcdefghijklmnopqrstuvwxyz123456\"\n",
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBe(0);
    });

    it("ignores placeholder values", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: 'const apiKey = "YOUR_API_KEY_HERE_PLACEHOLDER_1234";\n',
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBe(0);
    });

    it("ignores test fixtures", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/fixtures/config.ts",
          content: 'const apiKey = "abcdefghijklmnopqrstuvwxyz123456";\n',
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBe(0);
    });

    it("returns empty when no secrets found", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: "const greeting = 'hello';\n",
        },
      ];
      const findings = scanForHardcodedSecrets(targets);
      expect(findings.length).toBe(0);
    });
  });

  describe("scanForUnauthorizedEgress", () => {
    it("allows known hosts", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/file.ts",
          content: 'const url = "https://github.com/NVIDIA/NemoClaw";\n',
        },
      ];
      const findings = scanForUnauthorizedEgress(targets);
      expect(findings.length).toBe(0);
    });

    it("detects unknown external URLs", () => {
      const targets: ScanTarget[] = [
        {
          path: "/src/something.ts",
          content: 'const url = "https://suspicious-domain.example.com/data";\n',
        },
      ];
      const findings = scanForUnauthorizedEgress(targets);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].name).toBe("unauthorized_egress");
    });

    it("skips comments", () => {
      const targets: ScanTarget[] = [
        {
          path: "/src/something.ts",
          content: "// https://suspicious-domain.example.com/data\n",
        },
      ];
      const findings = scanForUnauthorizedEgress(targets);
      expect(findings.length).toBe(0);
    });

    it("skips markdown files", () => {
      const targets: ScanTarget[] = [
        {
          path: "/docs/example.md",
          content: 'See [docs](https://suspicious-domain.example.com)\n',
        },
      ];
      const findings = scanForUnauthorizedEgress(targets);
      expect(findings.length).toBe(0);
    });

    it("skips test fixtures", () => {
      const targets: ScanTarget[] = [
        {
          path: "/test/fixtures/config.ts",
          content: 'const url = "https://suspicious-domain.example.com/data";\n',
        },
      ];
      const findings = scanForUnauthorizedEgress(targets);
      expect(findings.length).toBe(0);
    });
  });

  describe("scanNetworkPolicies", () => {
    it("checks network policy file", () => {
      const result = scanNetworkPolicies();
      // Result depends on whether policy file exists in test environment
      expect(result).toHaveProperty("name", "network_policy");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
      expect(result).toHaveProperty("severity");
    });
  });

  describe("walkDir", () => {
    it("returns empty array for non-existent directory", () => {
      const results = walkDir("/nonexistent/path", [".ts"]);
      expect(results).toEqual([]);
    });
  });
});
