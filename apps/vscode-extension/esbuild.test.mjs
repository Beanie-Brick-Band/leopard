import * as fs from "fs";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

// Build counter to track related ESM/CJS builds
let buildCounter = 0;

// ANSI color codes - 3 colors that alternate between ESM and CJS
const colors = {
  reset: "\x1b[0m",
  // 3 colors: yellow, blue, red
  palette: ["\x1b[33m", "\x1b[36m", "\x1b[31m"], // yellow, cyan, red
};

// Single color index that alternates for all builds
let colorIndex = 0;

/**
 * Creates a problem matcher plugin with a build name and unique ID for identification
 * @param {string} buildName - Name to identify this build (e.g., "ESM" or "CJS")
 * @param {() => number} getIdFn - Function that returns the current build ID
 * @returns {import('esbuild').Plugin}
 */
function createProblemMatcherPlugin(buildName, getIdFn) {
  return {
    name: `esbuild-problem-matcher-${buildName.toLowerCase()}`,

    setup(build) {
      let buildId = null;
      let buildColor = null;

      build.onStart(() => {
        buildId = getIdFn();
        buildColor = colors.palette[colorIndex % 3];
        colorIndex++;
        console.log(
          `${buildColor}  [${buildName}#${buildId}] build started${colors.reset}`,
        );
      });

      build.onEnd((result) => {
        // Use the ID and color captured at start
        const id = buildId ?? getIdFn();
        const color = buildColor ?? colors.palette[(colorIndex - 1) % 3];
        if (result.errors.length > 0) {
          console.error(
            `${color}✘ [${buildName}#${id}] build failed with ${result.errors.length} error(s)${colors.reset}`,
          );
          result.errors.forEach(({ text, location }) => {
            console.error(
              `${color}✘ [${buildName}#${id}] ${text}${colors.reset}`,
            );
            if (location) {
              console.error(
                `${color}    ${location.file}:${location.line}:${location.column}:`,
              );
            }
          });
        } else {
          console.log(
            `${color}✔ [${buildName}#${id}] build finished successfully${colors.reset}`,
          );
        }
      });
    },
  };
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync("out/test")) {
    fs.mkdirSync("out/test", { recursive: true });
  }

  // Track build IDs - each build (ESM and CJS) gets its own incrementing ID
  const getEsmBuildId = () => {
    // Increment and return new ID when ESM starts
    return ++buildCounter;
  };
  const getCjsBuildId = () => {
    // Increment and return new ID when CJS starts
    return ++buildCounter;
  };

  // First, bundle as ES module (.mjs) to support convex-test which requires ESM
  const esmCtx = await esbuild.context({
    entryPoints: ["src/test/extension.test.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: "out/test/extension.test.mjs",
    external: ["vscode", "mocha"],
    logLevel: watch ? "silent" : "info",
    sourcemap: true,
    target: "node18",
    plugins: [createProblemMatcherPlugin("ESM", getEsmBuildId)],
  });

  // Then, convert the ESM bundle to CommonJS (.cjs) for the test runner
  const cjsCtx = await esbuild.context({
    entryPoints: ["out/test/extension.test.mjs"],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: "out/test/extension.test.cjs",
    external: ["vscode", "mocha"],
    logLevel: watch ? "silent" : "info",
    sourcemap: true,
    target: "node18",
    plugins: [createProblemMatcherPlugin("CJS", getCjsBuildId)],
  });

  if (watch) {
    // Do initial builds
    await esmCtx.rebuild();
    await cjsCtx.rebuild();

    // Start watching both - CJS will automatically rebuild when ESM file changes
    // Don't await these - they run indefinitely
    esmCtx.watch();
    cjsCtx.watch();

    // Keep process alive - prevent exit
    process.stdin.resume();
    process.on("SIGINT", async () => {
      await esmCtx.dispose();
      await cjsCtx.dispose();
      process.exit(0);
    });
  } else {
    await esmCtx.rebuild();
    await cjsCtx.rebuild();
    await esmCtx.dispose();
    await cjsCtx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
