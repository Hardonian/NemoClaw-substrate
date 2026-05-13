import { promises as fs } from 'fs';
import path from 'path';

// Minimal script to check for unsupported claims
const forbiddenClaims = [
  'guaranteed', '100%', 'foolproof', 'bulletproof', 'unhackable', 'perfect'
];

async function checkClaims(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf8');
        for (const claim of forbiddenClaims) {
          if (content.toLowerCase().includes(claim)) {
            console.error(`[check-claims] Found forbidden claim "${claim}" in ${fullPath}`);
            issues++;
          }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    console.error(`[check-claims] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-claims] No forbidden claims found.');
}

checkClaims('./docs').catch(err => {
  console.error(err);
  process.exit(1);
});
