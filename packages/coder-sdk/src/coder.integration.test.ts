import { beforeAll, describe, expect, it } from "vitest";

import { createClient, createConfig } from "./client";
import { buildInfo } from "./sdk.gen";

describe("Coder integration tests", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    const coderUrl = process.env.CODER_URL;
    if (!coderUrl) {
      throw new Error(
        "CODER_URL environment variable is required for integration tests",
      );
    }
    client = createClient(
      createConfig({
        baseUrl: `${coderUrl}/api/v2`,
      }),
    );
  });

  it("should check if the production version of coder matches local schema version", async () => {
    const response = await buildInfo({ client });

    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(response.data?.version).toMatch(/^v2\.28\.0/);
    expect(response.data?.agent_api_version).toBeDefined();
    expect(response.data?.dashboard_url).toBeDefined();
  });
});
