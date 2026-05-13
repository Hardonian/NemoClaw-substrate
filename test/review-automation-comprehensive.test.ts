// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';

describe('Review Automation Comprehensive Suite', () => {
  const runReviewScript = async (scriptName: string, ...args: string[]) => {
    try {
      const { stdout } = await execa('node', [path.join('scripts', 'review', scriptName), ...args], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      return { success: true, output: stdout };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.message, exitCode: error.exitCode };
    }
  };

  it('should pass the claims check', async () => {
    const result = await runReviewScript('check-claims.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the doc links check', async () => {
    const result = await runReviewScript('check-doc-links.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the no-theatre terminology check', async () => {
    const result = await runReviewScript('check-no-theatre.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the SPDX header check for documentation', async () => {
    const result = await runReviewScript('check-spdx-docs.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the status matrix check', async () => {
    const result = await runReviewScript('check-status-matrix.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the fixtures redaction check', async () => {
    const result = await runReviewScript('check-fixtures-redacted.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the proofpack integrity check', async () => {
    const result = await runReviewScript('check-proofpack.mjs');
    expect(result.success).toBe(true);
  });

  it('should pass the documentation index check', async () => {
    const result = await runReviewScript('check-doc-index.mjs');
    expect(result.success).toBe(true);
  });

  it('should verify that review:all aggregate command works', async () => {
     // We use npm run review:all which should exit with 0
     const { exitCode } = await execa('npm', ['run', 'review:all'], {
       env: { ...process.env, NODE_ENV: 'test' }
     });
     expect(exitCode).toBe(0);
  });

  describe('Negative Tests (Violations)', () => {
    const tempDir = path.join(process.cwd(), 'temp-violations');

    it('should fail when a forbidden claim is found', async () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const violationFile = path.join(tempDir, 'claim-violation.md');
      fs.writeFileSync(violationFile, '# Unhackable System\nThis is a foolproof and magic solution.');
      
      const result = await runReviewScript('check-claims.mjs', tempDir);
      // Clean up before assertion to ensure it runs even if expect fails
      fs.unlinkSync(violationFile);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Found forbidden claim');
    });

    it('should fail when security theatre terminology is found', async () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const violationFile = path.join(tempDir, 'theatre-violation.md');
      fs.writeFileSync(violationFile, '# Military-grade Encryption\nUses bank-grade security and fallbacks.');
      
      const result = await runReviewScript('check-no-theatre.mjs', tempDir);
      fs.unlinkSync(violationFile);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Found security theatre word');
    });

    it('should fail when SPDX header is missing in documentation', async () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const violationFile = path.join(tempDir, 'missing-spdx.md');
      fs.writeFileSync(violationFile, '# Title without SPDX\nSome content.');
      
      const result = await runReviewScript('check-spdx-docs.mjs', tempDir);
      fs.unlinkSync(violationFile);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Missing SPDX header');
    });

    it('should fail when a potential secret is found in fixtures', async () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
      const violationFile = path.join(tempDir, 'secret-violation.json');
      // Using a real-looking secret that matches the hardened regex (must have non-hex chars if 40 chars)
      fs.writeFileSync(violationFile, JSON.stringify({ key: "nvapi-1234567890123456789012345678901234567890" }));
      
      const result = await runReviewScript('check-fixtures-redacted.mjs', tempDir);
      fs.unlinkSync(violationFile);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Found potential unredacted secret');
    });

    // Final cleanup of temp directory
    it('cleanup', () => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
