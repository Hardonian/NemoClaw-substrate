const fs = require('fs');
const path = require('path');

const DIR = process.cwd();

function walk(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(res, callback);
    } else {
      if (res.endsWith('.ts') || res.endsWith('.js') || res.endsWith('.md')) {
        callback(res);
      }
    }
  }
}

let modifiedCount = 0;

walk(DIR, (file) => {
  const original = fs.readFileSync(file, 'utf8');
  let current = original;

  // Replace variations of degraded
  current = current.replace(/\bfallback\b/g, 'degraded');
  current = current.replace(/\bFallback\b/g, 'Degraded');
  current = current.replace(/\bFALLBACK\b/g, 'DEGRADED');

  if (current !== original) {
    fs.writeFileSync(file, current, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`\nModified ${modifiedCount} files.`);
