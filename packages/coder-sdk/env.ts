import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    CODER_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
