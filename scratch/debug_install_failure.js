const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-install-'));
const INSTALLER = path.join(__dirname, '..', 'scripts', 'install.sh');

const result = spawnSync('bash', [INSTALLER], {
  encoding: 'utf-8',
  env: {
    ...process.env,
    HOME: tmp,
    NEMOCLAW_NON_INTERACTIVE: '1',
  }
});

console.log('Status:', result.status);
console.log('Stdout:', result.stdout);
console.log('Stderr:', result.stderr);
