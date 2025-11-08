import { baseConfig } from "@package/eslint-config/base";
import { reactConfig } from "@package/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
