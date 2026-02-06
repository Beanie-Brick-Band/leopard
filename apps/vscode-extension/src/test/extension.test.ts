import * as assert from "assert";
import type { TestConvex } from "convex-test";
import * as vscode from "vscode";

import type schema from "@package/backend/convex/schema";
import { internal } from "@package/backend/convex/_generated/api";

import { createMockClient, resetMockClient, setMockHostname } from "../client";
import { activate } from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  let mockClient: TestConvex<typeof schema> | null = null;

  setup(async () => {
    // Set up mock client using convex-test
    mockClient = createMockClient();

    await mockClient.mutation(internal.web.index.createMock, {});
    setMockHostname(
      "coder-273044a0-03a7-49ef-b1a4-e1bbc3c49d9b-7b78cdf4d9-mx66l",
    );

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
