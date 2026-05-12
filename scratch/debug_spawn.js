const { spawnSync } = require('child_process');
const path = require('path');

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const scriptPath = path.join(__dirname, '..', 'scripts', 'install.sh');

console.log('Spawning:', BASH_PATH);
console.log('Args:', [scriptPath]);

const result = spawnSync(BASH_PATH, [scriptPath], {
  encoding: 'utf-8',
  env: {
    ...process.env,
    NEMOCLAW_NON_INTERACTIVE: "1"
  }
});

console.log('Status:', result.status);
console.log('Error:', result.error);
console.log('Stdout type:', typeof result.stdout);
console.log('Stderr type:', typeof result.stderr);
console.log('Stdout:', result.stdout);
console.log('Stderr:', result.stderr);
