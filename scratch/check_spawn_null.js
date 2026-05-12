const { spawnSync } = require('node:child_process');
const result = spawnSync('nonexistent-command');
console.log(`stdout: ${result.stdout}`);
console.log(`stderr: ${result.stderr}`);
console.log(`combined: ${result.stdout}${result.stderr}`);
