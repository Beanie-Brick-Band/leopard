import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    globals: true,
    include: ["tests/web_api/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
