import * as assert from "assert";
import type { TestConvex } from "convex-test";
import type { ConvexHttpClient } from "convex/browser";
import { convexTest } from "convex-test";
import * as vscode from "vscode";

import { internal } from "@package/backend/convex/_generated/api";
import * as apiModule from "@package/backend/convex/_generated/api";
import * as apiExtensionModule from "@package/backend/convex/api/extension";
import schema from "@package/backend/convex/schema";
import * as webIndexModule from "@package/backend/convex/web/index";
import * as webReplayModule from "@package/backend/convex/web/replay";

import { activate, deactivate } from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  let mockClient: TestConvex<typeof schema> | null = null;

  setup(async () => {
    // Provide modules in the format expected by convex-test
    // The modules object maps file paths to async functions that return the module exports
    const modules: Record<string, () => Promise<unknown>> = {
      "convex/_generated/api.ts": () => Promise.resolve(apiModule),
      "convex/web/index.ts": () => Promise.resolve(webIndexModule),
      "convex/web/replay.ts": () => Promise.resolve(webReplayModule),
      "convex/api/extension.ts": () => Promise.resolve(apiExtensionModule),
    };
    mockClient = convexTest(schema, modules);

    await mockClient.mutation(internal.web.index.createMock, {});

    // Activate the extension (this will trigger the initialization code)
    const mockContext = {
      subscriptions: [] as { dispose: () => void }[],
    } as vscode.ExtensionContext;
    activate(mockContext, mockClient as unknown as ConvexHttpClient);
  });

  teardown(async () => {
    await deactivate();
  });

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
