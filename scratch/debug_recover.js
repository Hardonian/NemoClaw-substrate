const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const sandboxName = "alive-sandbox";
const port = "18789";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nemoclaw-debug-"));
const homeLocalBin = path.join(tmpDir, ".local", "bin");
const registryDir = path.join(tmpDir, ".nemoclaw");
const openshellPath = path.join(homeLocalBin, "openshell");
const invocationLog = path.join(tmpDir, "openshell-calls.log");

fs.mkdirSync(homeLocalBin, { recursive: true });
fs.mkdirSync(registryDir, { recursive: true });

fs.writeFileSync(
  path.join(registryDir, "sandboxes.json"),
  JSON.stringify({
    defaultSandbox: sandboxName,
    sandboxes: {
      [sandboxName]: {
        name: sandboxName,
        model: "nvidia/test-model",
        provider: "nvidia-prod",
        gpuEnabled: false,
        policies: [],
        dashboardPort: Number(port),
      },
    },
  }),
  { mode: 0o600 },
);

const forwardStateFile = path.join(tmpDir, "forward-state");
fs.writeFileSync(forwardStateFile, "initial");

fs.writeFileSync(
  openshellPath,
  `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(invocationLog)}, args.join(" ") + "\\n");

if (args[0] === "status") {
  process.stdout.write("Gateway: nemoclaw\\nStatus: Connected\\n");
  process.exit(0);
}

if (args[0] === "gateway" && args[1] === "info") {
  process.stdout.write(
    "Gateway: nemoclaw\\nGateway endpoint: https://127.0.0.1:8080\\n",
  );
  process.exit(0);
}

if (args[0] === "sandbox" && args[1] === "get" && args[2] === ${JSON.stringify(sandboxName)}) {
  process.stdout.write(
    "Sandbox:\\n\\n  Id: abc\\n  Name: ${sandboxName}\\n  Phase: Ready\\n",
  );
  process.exit(0);
}

if (args[0] === "sandbox" && args[1] === "list") {
  process.stdout.write("${sandboxName}   Ready   1m ago\\n");
  process.exit(0);
}

if (args[0] === "sandbox" && args[1] === "exec") {
  process.stdout.write("__NEMOCLAW_SANDBOX_EXEC_STARTED__\\nRUNNING\\n");
  process.exit(0);
}

if (args[0] === "forward" && args[1] === "list") {
  const state = fs.readFileSync(${JSON.stringify(forwardStateFile)}, "utf-8");
  process.stdout.write(state === "running"
    ? "${sandboxName} 127.0.0.1 ${port} 99999 running\\n"
    : "${sandboxName} 127.0.0.1 ${port} 12345 dead\\n");
  process.exit(0);
}

if (args[0] === "forward" && args[1] === "start") {
  fs.writeFileSync(${JSON.stringify(forwardStateFile)}, "running");
  process.exit(0);
}

if (args[0] === "forward") {
  process.exit(0);
}

if (args[0] === "policy" && args[1] === "get") {
  process.exit(1);
}

if (args[0] === "inference" && args[1] === "get") {
  process.stdout.write(
    "Gateway inference:\\n  Provider: nvidia-prod\\n  Model: nvidia/test-model\\n",
  );
  process.exit(0);
}

process.exit(0);
`,
  { mode: 0o755 },
);

// Create .cmd wrapper for Windows
fs.writeFileSync(openshellPath + ".cmd", `@echo off\n"${process.execPath}" "${openshellPath}" %*`);

const repoRoot = "c:\\Users\\scott\\GitHub\\NemoClaw-substrate";
const result = spawnSync(
  process.execPath,
  [path.join(repoRoot, "bin", "nemoclaw.js"), sandboxName, "recover"],
  {
    cwd: repoRoot,
    encoding: "utf-8",
    env: {
      ...process.env,
      HOME: tmpDir,
      PATH: `${homeLocalBin}${path.delimiter}${process.env.PATH}`,
      NEMOCLAW_NO_CONNECT_HINT: "1",
    },
    timeout: 15000,
  },
);

console.log("STATUS:", result.status);
console.log("STDOUT:", result.stdout);
console.log("STDERR:", result.stderr);
if (result.error) console.log("ERROR:", result.error);

fs.rmSync(tmpDir, { recursive: true, force: true });
