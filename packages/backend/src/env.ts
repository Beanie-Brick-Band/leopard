import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    SITE_URL: z.string().url().default("http://localhost:3000"),
  },

  /**
   * Specify your client-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  client: {
    // Add your client-side env vars here
  },

  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnvStrict: {
    SITE_URL: process.env.SITE_URL,
  },
  clientPrefix: "",
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
