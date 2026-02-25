import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "tests/**/*.test.{ts,tsx}",
      "tests/**/*.integration.test.{ts,tsx}",
    ],
    testTimeout: 30000, // real network calls to MinIO
    hookTimeout: 30000, // cleanup hooks also hit MinIO
  },
});
