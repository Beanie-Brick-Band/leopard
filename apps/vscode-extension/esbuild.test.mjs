import * as fs from "fs";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`,
          );
        }
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync("out/test")) {
    fs.mkdirSync("out/test", { recursive: true });
  }

  const ctx = await esbuild.context({
    entryPoints: ["src/test/extension.test.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: "out/test/extension.test.cjs",
    external: ["vscode", "mocha"],
    logLevel: watch ? "silent" : "info",
    sourcemap: true,
    target: "node18",
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
