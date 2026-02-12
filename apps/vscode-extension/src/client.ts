import type { TestConvex } from "convex-test";
import { convexTest } from "convex-test";
import { ConvexHttpClient } from "convex/browser";

import * as apiModule from "@package/backend/convex/_generated/api";
import * as apiExtensionModule from "@package/backend/convex/api/extension";
import schema from "@package/backend/convex/schema";
import * as webIndexModule from "@package/backend/convex/web/index";
import * as webReplayModule from "@package/backend/convex/web/replay";

let mockClient: TestConvex<typeof schema> | null = null;

export function createMockClient() {
  // Provide modules in the format expected by convex-test
  // The modules object maps file paths to async functions that return the module exports
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/index.ts": () => Promise.resolve(webIndexModule),
    "convex/web/replay.ts": () => Promise.resolve(webReplayModule),
    "convex/api/extension.ts": () => Promise.resolve(apiExtensionModule),
  };
  mockClient = convexTest(schema, modules);
  return mockClient;
}

export function resetMockClient() {
  mockClient = null;
}

export function createClient(convexUrl: string): ConvexHttpClient {
  // Use mock client if set (for testing), otherwise create real client
  if (mockClient !== null) {
    return mockClient as unknown as ConvexHttpClient;
  }
  return new ConvexHttpClient(convexUrl);
}
