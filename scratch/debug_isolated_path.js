const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

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
    console.log(`Processing ${sysDir}`);
    for (const name of fs.readdirSync(sysDir)) {
      if (EXCLUDE.has(name)) continue;
      try {
        fs.symlinkSync(path.join(sysDir, name), path.join(dir, name), process.platform === "win32" ? "file" : undefined);
      } catch (err) {
        if (process.platform === "win32") {
          // console.log(`Failed to link ${name}: ${err.code}`);
          continue;
        }
        throw err;
      }
    }
  }
  return dir;
}

const dir = buildIsolatedSystemPath();
console.log('Isolated path:', dir);
console.log('Contents:', fs.readdirSync(dir).slice(0, 10));
