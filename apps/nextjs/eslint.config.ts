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
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/lib/auth.tsx", "src/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "convex/react",
              importNames: [
                "Authenticated",
                "Unauthenticated",
                "AuthLoading",
                "useConvexAuth",
              ],
              message:
                "Import from '~/lib/auth' instead to enable proper test mocking.",
            },
          ],
        },
      ],
    },
  },
);
