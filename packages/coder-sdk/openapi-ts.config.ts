import { defineConfig } from "@hey-api/openapi-ts";
import { env } from "./env";

export default defineConfig({
  input:
    "./v2.28.0-swagger.json",
  output: "./src",
  plugins: [
    {
      name: '@hey-api/client-fetch',
      baseUrl: `${env.CODER_URL}/api/v2`,
    },
    {
      name: '@hey-api/sdk',
      baseUrl: `${env.CODER_URL}/api/v2`,
      auth: true,

    }
  ]
});
