import * as esbuild from "esbuild";

async function main() {
  // First, bundle as ES module (.mjs) to support convex-test which requires ESM
  await esbuild.build({
    entryPoints: ["src/test/extension.test.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: "out/test/extension.test.mjs",
    external: ["vscode", "mocha"],
    logLevel: "info",
    sourcemap: true,
    target: "node18",
  });

  // Then, convert the ESM bundle to CommonJS (.cjs) for the test runner
  await esbuild.build({
    entryPoints: ["out/test/extension.test.mjs"],
    bundle: true, // Re-bundle to convert format
    format: "cjs",
    platform: "node",
    outfile: "out/test/extension.test.cjs",
    external: ["vscode", "mocha"],
    logLevel: "info",
    sourcemap: true,
    target: "node18",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
