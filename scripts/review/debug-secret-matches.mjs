import { promises as fs } from 'fs';
import path from 'path';

const secretRegex = /(sk-[a-zA-Z0-9]{48}|gh[p|u|s|r]_[a-zA-Z0-9]{36}|nvapi-[a-zA-Z0-9_-]{40,}|AKIA[0-9A-Z]{16}|[a-zA-Z0-9+/]{40}|xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9]{24,32}|SG\.[a-zA-Z0-9_-]{22,23}\.[a-zA-Z0-9_-]{37,44})/g;

async function debug() {
  const files = [
    'fixtures/generated/diagnostics.json',
    'fixtures/generated/receipt.json',
    'fixtures/generated/replay-events.json',
    'fixtures/generated/seeded-events.json'
  ];

  for (const f of files) {
    try {
      const content = await fs.readFile(f, 'utf8');
      const matches = content.match(secretRegex);
      if (matches) {
        console.log(`File: ${f}`);
        matches.forEach(m => console.log(`  Match (${m.length}): ${m}`));
      }
    } catch (e) {
      console.log(`Could not read ${f}`);
    }
  }
}

debug();
