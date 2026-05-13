import { promises as fs } from 'fs';
import path from 'path';

// "Theatre" words are terms that sound secure but have no technical meaning or are misleading.
const theatreWords = [
  'military-grade',
  'bank-grade',
  'unhackable',
  'cyber-immune',
  'impervious',
  '100% secure'
];

async function checkNoTheatre(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf8');
        for (const word of theatreWords) {
          if (content.toLowerCase().includes(word)) {
            console.error(`[check-no-theatre] Found security theatre word "${word}" in ${fullPath}`);
            issues++;
          }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    console.error(`[check-no-theatre] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-no-theatre] Security theatre check complete.');
}

checkNoTheatre('./docs').catch(err => {
  console.error(err);
  process.exit(1);
});
