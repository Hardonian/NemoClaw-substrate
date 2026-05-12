const fs = require('fs');
const path = require('path');

const BASH_PATH = (() => {
  if (process.platform !== "win32") return "bash";
  const commonPaths = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    "C:\\Git\\bin\\bash.exe",
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return "bash"; // Fallback to PATH
})();

console.log('process.platform:', process.platform);
console.log('BASH_PATH:', BASH_PATH);
console.log('Exists:', fs.existsSync(BASH_PATH));
