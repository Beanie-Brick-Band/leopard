import * as assert from "assert";
import type { TestConvex } from "convex-test";
import type { ConvexHttpClient } from "convex/browser";
import { convexTest } from "convex-test";
import * as vscode from "vscode";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api, internal } from "@package/backend/convex/_generated/api";
import * as apiModule from "@package/backend/convex/_generated/api";
import * as apiExtensionModule from "@package/backend/convex/api/extension";
import schema from "@package/backend/convex/schema";
import * as webIndexModule from "@package/backend/convex/web/index";
import * as webReplayModule from "@package/backend/convex/web/replay";
import * as WorkspaceEvents from "@package/validators/workspaceEvents";

import { activate, BatchedConvexHttpClient } from "../extension";

/*
  These tests were designed to be sequential. Only one VSCode instance is
  running at a time, so we should avoid mutating state that can carry over from
  other tests where possible.
*/
suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  let mockClient: TestConvex<typeof schema>;
  let workspaceId: Id<"workspaces">;
  let workspaceUri: vscode.Uri;

  suiteSetup(() => {
    /*
      VSCode automatically activates the extension on test suite startup, but the
      listeners of the extension aren't being triggered. So we manually activate
      another instance that does get triggered. This is a workaround to the bug,
      which for testing should be sufficient.

      Also activate should run only once per VSCode instance. Several activate calls
      can create several extension instances that can carry over to other tests.
      
      Also no need to run deactivate since VSCode does automatic cleanup
    */
    const mockContext = {
      subscriptions: [] as { dispose: () => void }[],
    } as vscode.ExtensionContext;

    activate(mockContext);
  });

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

    const coderWorkspaceId = "273044a0-03a7-49ef-b1a4-e1bbc3c49d9b";
    const unverifiedWorkspaceId = await mockClient.query(
      internal.web.index.getWorkspaceByCoderWorkspaceId,
      { coderWorkspaceId },
    );
    assert.ok(unverifiedWorkspaceId, "Workspace should exist");
    workspaceId = unverifiedWorkspaceId;

    const newWorkspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    assert.ok(newWorkspaceUri, "Workspace folder should exist");
    workspaceUri = newWorkspaceUri;

    const wsEdit = new vscode.WorkspaceEdit();
    wsEdit.createFile(vscode.Uri.joinPath(workspaceUri, "test-dummy.ts"), {
      ignoreIfExists: true,
    });
    const success = await vscode.workspace.applyEdit(wsEdit);
    assert.ok(success, "test-dummy.ts file should be created");

    BatchedConvexHttpClient.init(
      mockClient as unknown as ConvexHttpClient,
      `coder-${coderWorkspaceId}-7b78cdf4d9-mx66l`,
      1000,
    );
  });

  teardown(async () => {
    await BatchedConvexHttpClient.flushAndResetInstance();

    const wsEdit = new vscode.WorkspaceEdit();
    wsEdit.deleteFile(vscode.Uri.joinPath(workspaceUri, "test-dummy.ts"));
    const success = await vscode.workspace.applyEdit(wsEdit);
    assert.ok(success, "test-dummy.ts file should be deleted");
  });

  test("onDidChangeTextDocument event is sent to Convex", async () => {
    const wsEdit = new vscode.WorkspaceEdit();
    const fileUri = vscode.Uri.joinPath(workspaceUri, "test-dummy.ts");
    wsEdit.insert(fileUri, new vscode.Position(0, 0), "Hello, world!");
    const success = await vscode.workspace.applyEdit(wsEdit);
    assert.ok(success, "Hello, world! should be inserted into test-dummy.ts");

    // events are not immediately sent to the mockClient because of the debounce delay, so
    // we need this to bypass the debounce and flush the buffer
    await BatchedConvexHttpClient.getInstance().flush();

    const replay = await mockClient.query(api.web.replay.getReplay, {
      workspaceId,
    });
    const lastEvent = replay[replay.length - 1];
    assert.ok(replay.length > 0, "Replay should contain at least one event");
    assert.deepStrictEqual(
      lastEvent,
      {
        eventType: WorkspaceEvents.NAME.DID_CHANGE_TEXT_DOCUMENT,
        timestamp: lastEvent?.timestamp, // the timestamp value can vary too much for testing
        workspaceId: lastEvent?.workspaceId, // workspaceId is included in the parsed event
        metadata: {
          contentChanges: [
            {
              range: {
                start: {
                  line: 0,
                  column: 0,
                },
                end: {
                  line: 0,
                  column: 0,
                },
              },
              text: "Hello, world!",
              filePath: fileUri.fsPath,
            },
          ],
        },
      },
      "Event object should match expected structure",
    );
  });
});
