const { spawnSync } = require('node:child_process');
const result = spawnSync('bash', ['-c', 'echo hello'], { encoding: 'utf-8' });
console.log('Bash result:', JSON.stringify(result, null, 2));

const result2 = spawnSync('setsid', ['bash', '-c', 'echo hello'], { encoding: 'utf-8' });
console.log('Setsid result:', JSON.stringify(result2, null, 2));
