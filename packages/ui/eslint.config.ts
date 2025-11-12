import { defineConfig } from "eslint/config";

import { baseConfig } from "@package/eslint-config/base";
import { reactConfig } from "@package/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
