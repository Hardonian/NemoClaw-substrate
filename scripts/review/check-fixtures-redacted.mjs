import { promises as fs } from 'fs';
import path from 'path';

// Check for common secret patterns like "sk-...", "ghp_...", "nvapi-..."
const secretRegex = /(sk-[a-zA-Z0-9]{48}|gh[p|u|s|r]_[a-zA-Z0-9]{36}|nvapi-[a-zA-Z0-9_-]{40,})/g;

async function checkFixturesRedacted(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath, 'utf8');
        const matches = content.match(secretRegex);
        if (matches) {
          console.error(`[check-fixtures-redacted] Found potential unredacted secret in ${fullPath}`);
          issues++;
        }
      }
    }
  }
  
  // We check fixtures directory if it exists, otherwise warn
  try {
    await fs.access(dir);
    await walk(dir);
  } catch (e) {
    console.warn(`[check-fixtures-redacted] Directory ${dir} not found. Skipping.`);
    return;
  }
  
  if (issues > 0) {
    console.error(`[check-fixtures-redacted] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-fixtures-redacted] Fixtures redaction check complete.');
}

checkFixturesRedacted('./fixtures').catch(err => {
  console.error(err);
  process.exit(1);
});
