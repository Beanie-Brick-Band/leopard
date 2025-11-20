import { defineConfig } from "eslint/config";

import { baseConfig } from "@package/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**", "out/**"],
  },
  baseConfig,
  {
    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "warn",
    },
  },
);
