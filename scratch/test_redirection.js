const { spawnSync } = require('child_process');
const path = require('path');

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const logPath = path.join(__dirname, 'test_log.txt');

console.log('Log Path:', logPath);

const result = spawnSync(BASH_PATH, ['-c', `printf "hello" > "$LEGACY_LOG_PATH"`], {
  env: {
    ...process.env,
    LEGACY_LOG_PATH: logPath
  },
  encoding: 'utf-8'
});

console.log('Status:', result.status);
console.log('Stderr:', result.stderr);
const fs = require('fs');
console.log('Exists:', fs.existsSync(logPath));
if (fs.existsSync(logPath)) {
  console.log('Content:', fs.readFileSync(logPath, 'utf-8'));
  fs.unlinkSync(logPath);
}
