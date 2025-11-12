import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@package/eslint-config/base";
import { nextjsConfig } from "@package/eslint-config/nextjs";
import { reactConfig } from "@package/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
