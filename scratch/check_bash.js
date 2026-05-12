const { spawnSync } = require('node:child_process');
const result = spawnSync('bash', ['--version'], { encoding: 'utf-8' });
console.log('Status:', result.status);
console.log('Error:', result.error);
console.log('Stdout:', result.stdout);
console.log('Stderr:', result.stderr);
