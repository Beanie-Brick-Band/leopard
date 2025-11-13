import { z } from "zod/v4";

const envSchema = z.object({
  CODER_URL: z.url(),
});

export const env = envSchema.parse({
  CODER_URL: process.env.CODER_URL,
});

