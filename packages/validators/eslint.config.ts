import { defineConfig } from "eslint/config";

import { baseConfig } from "@package/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
