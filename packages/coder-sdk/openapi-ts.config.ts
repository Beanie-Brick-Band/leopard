import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    "./v2.28.0-swagger.json",
  output: "./src",
  plugins: [
    {
      name: '@hey-api/sdk',
      baseUrl: "https://coder.nolapse.tech/api/v2",
      auth: true,

    }
    
  ]
});
