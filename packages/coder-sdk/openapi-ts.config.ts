import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    "https://raw.githubusercontent.com/coder/coder/refs/tags/v2.28.0/coderd/apidoc/swagger.json",
  output: "./src",
  plugins: [
    {
      name: '@hey-api/sdk',
      baseUrl: "https://coder.nolapse.tech/api/v2",
      auth: true,

    }
    
  ]
});
