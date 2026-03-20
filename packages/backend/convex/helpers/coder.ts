import { createClient } from "@package/coder-sdk/client";

/** Create an authenticated Coder API client using environment variables */
export function getCoderClient() {
  return createClient({
    baseUrl: process.env.CODER_API_URL!,
    auth: process.env.CODER_API_KEY!,
  });
}

/** Extract the Coder origin URL (without /api/v2 path) */
export function getCoderOrigin() {
  return new URL(process.env.CODER_API_URL!).origin;
}
