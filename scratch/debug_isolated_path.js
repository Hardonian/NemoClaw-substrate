const fs = require('fs');
const path = require('path');
const os = require('os');

const pathSeparator = process.platform === "win32" ? ";" : ":";

function buildIsolatedSystemPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nemoclaw-preflight-sysbin-"));
  const EXCLUDE = new Set(["node", "npm", "npx"]);
  
  const sysDirs = ["/usr/bin", "/bin"];
  if (process.platform === "win32") {
    const gitBashUsrBin = "C:\\Program Files\\Git\\usr\\bin";
    if (fs.existsSync(gitBashUsrBin)) {
      sysDirs.push(gitBashUsrBin);
    }
  }

  for (const sysDir of sysDirs) {
    if (!fs.existsSync(sysDir)) continue;
    for (const name of fs.readdirSync(sysDir)) {
      if (EXCLUDE.has(name)) continue;
      try {
        fs.symlinkSync(path.join(sysDir, name), path.join(dir, name), process.platform === "win32" ? "file" : undefined);
      } catch (err) {
        if (err.code === "EEXIST") continue;
        if (process.platform === "win32") continue;
        throw err;
      }
    }
  }
  const linkedCount = fs.readdirSync(dir).length;
  if (process.platform === "win32" && linkedCount === 0) {
    return sysDirs.join(pathSeparator);
  }
  return dir;
}

const TEST_SYSTEM_PATH = buildIsolatedSystemPath();
console.log('TEST_SYSTEM_PATH:', TEST_SYSTEM_PATH);
console.log('Contents count:', fs.existsSync(TEST_SYSTEM_PATH) && !TEST_SYSTEM_PATH.includes(';') ? fs.readdirSync(TEST_SYSTEM_PATH).length : 'N/A (joined path)');
