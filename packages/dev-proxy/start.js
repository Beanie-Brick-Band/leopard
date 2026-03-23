const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: false,
  });
}

function exitWithStatus(result) {
  if (typeof result.stderr === "string" && result.stderr.trim()) {
    console.error(result.stderr.trim());
  }

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

const dockerInfo = run("docker", ["info"], { stdio: "ignore" });

if (dockerInfo.status !== 0) {
  console.log();
  console.log("Docker is not running!");
  console.log();
  console.log("Please start Docker and try again:");
  console.log("  - On macOS: Open Docker Desktop or OrbStack");
  console.log("  - On Linux: Run 'sudo systemctl start docker'");
  console.log("  - On Windows: Open Docker Desktop");
  console.log();
  exitWithStatus(dockerInfo);
}

const runningProxy = run("docker", [
  "ps",
  "--filter",
  "name=^/reverse-proxy$",
  "--filter",
  "status=running",
  "-q",
]);

if (runningProxy.status !== 0) {
  exitWithStatus(runningProxy);
}

if (runningProxy.stdout.trim()) {
  console.log("Reverse proxy is already running");
  process.exit(0);
}

const existingProxy = run("docker", [
  "ps",
  "-a",
  "--filter",
  "name=^/reverse-proxy$",
  "-q",
]);

if (existingProxy.status !== 0) {
  exitWithStatus(existingProxy);
}

if (existingProxy.stdout.trim()) {
  console.log("Cleaning up stopped reverse-proxy container...");

  const removeProxy = run("docker", ["rm", "-f", "reverse-proxy"], {
    stdio: "ignore",
  });

  if (removeProxy.status !== 0) {
    exitWithStatus(removeProxy);
  }
}

console.log("Starting reverse proxy...");

const startProxy = run("docker", ["compose", "up", "-d"], { stdio: "inherit" });
exitWithStatus(startProxy);
