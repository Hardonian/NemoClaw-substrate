import { promises as fs } from 'fs';
import path from 'path';

const ALLOWED_STATUS_LABELS = ['supported', 'experimental', 'deprecated', 'unsupported', 'planned', 'alpha', 'beta', 'stable'];

async function checkStatusMatrix(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf8');
        // Basic heuristic: find markdown tables with a Status column
        if (content.includes('| Status |') || content.includes('|Status|')) {
           // We're just going to do a simple regex check for table rows containing status words, 
           // and warn if we see weird status labels.
           const lines = content.split('\n');
           let inTable = false;
           let statusColIndex = -1;
           for (const line of lines) {
             if (line.trim().startsWith('|')) {
               const cols = line.split('|').map(c => c.trim().toLowerCase());
               if (!inTable) {
                 if (cols.includes('status')) {
                   inTable = true;
                   statusColIndex = cols.indexOf('status');
                 }
               } else if (inTable && statusColIndex !== -1 && !line.includes('---')) {
                 const statusVal = cols[statusColIndex];
                 if (statusVal && statusVal.length > 0 && !ALLOWED_STATUS_LABELS.includes(statusVal)) {
                    console.error(`[check-status-matrix] Invalid status label "${statusVal}" in ${fullPath}`);
                    issues++;
                 }
               }
             } else {
               inTable = false;
             }
           }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    console.error(`[check-status-matrix] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-status-matrix] Status matrix check complete.');
}

checkStatusMatrix('./docs').catch(err => {
  console.error(err);
  process.exit(1);
});
