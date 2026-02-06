import * as assert from "assert";
import type { TestConvex } from "convex-test";
import * as vscode from "vscode";

import type schema from "@package/backend/convex/schema";
import { internal } from "@package/backend/convex/_generated/api";

import { createMockClient, resetMockClient } from "../client";
import { activate } from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  let mockClient: TestConvex<typeof schema> | null = null;

  setup(async () => {
    // Set up mock client using convex-test
    mockClient = createMockClient();

    await mockClient.mutation(internal.web.index.createMock, {});

    // Activate the extension (this will trigger the initialization code)
    const mockContext = {
      subscriptions: [] as { dispose: () => void }[],
    } as vscode.ExtensionContext;
    activate(mockContext);
  });

  teardown(() => {
    resetMockClient();
  });

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
