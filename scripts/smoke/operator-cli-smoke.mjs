import { promises as fs } from 'fs';
import path from 'path';

async function smokeTestOperatorCli() {
  console.log('[operator-cli-smoke] Running operator CLI smoke tests in demo mode...');
  
  const fixtureDir = path.resolve('./fixtures/generated');
  
  try {
    await fs.access(fixtureDir);
  } catch (e) {
    console.error(`[operator-cli-smoke] Fixtures not found at ${fixtureDir}. Run generate-fixtures.mjs first.`);
    process.exit(1);
  }
  
  // Simulate parsing a receipt JSON
  const receiptPath = path.join(fixtureDir, 'receipt.json');
  const receiptStr = await fs.readFile(receiptPath, 'utf8');
  const receipt = JSON.parse(receiptStr);
  
  if (!receipt.id || !receipt.status) {
    console.error('[operator-cli-smoke] Failed: Receipt fixture missing required fields.');
    process.exit(1);
  }
  
  if (receiptStr.includes('sk-') || receiptStr.includes('ghp_')) {
    console.error('[operator-cli-smoke] Failed: Receipt fixture appears to contain unredacted secrets.');
    process.exit(1);
  }

  // Simulate a table output sanity check
  console.log('[operator-cli-smoke] Validating table output simulation...');
  console.log('--------------------------------------------------');
  console.log(`| ID           | STATUS      | DURATION (ms) |`);
  console.log('--------------------------------------------------');
  console.log(`| ${receipt.id.substring(0,8)}... | ${receipt.status.padEnd(11)} | ${receipt.metrics.duration_ms.toString().padEnd(13)} |`);
  console.log('--------------------------------------------------');

  console.log('[operator-cli-smoke] All smoke tests passed.');
}

smokeTestOperatorCli().catch(err => {
  console.error(err);
  process.exit(1);
});
