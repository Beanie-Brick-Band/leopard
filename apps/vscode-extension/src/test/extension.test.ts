import * as assert from "assert";
import type { TestConvex } from "convex-test";
import * as vscode from "vscode";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import type schema from "@package/backend/convex/schema";
import { api, internal } from "@package/backend/convex/_generated/api";
import * as WorkspaceEvents from "@package/validators/workspaceEvents";

import { createMockClient, resetMockClient, setMockHostname } from "../client";
import { activate, deactivate } from "../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  let mockClient: TestConvex<typeof schema>;
  let workspaceId: Id<"workspaces">;
  let workspaceUri: vscode.Uri;

  setup(async () => {
    mockClient = createMockClient();
    await mockClient.mutation(internal.web.index.createMock, {});

    const coderWorkspaceId = "273044a0-03a7-49ef-b1a4-e1bbc3c49d9b";
    setMockHostname(`coder-${coderWorkspaceId}-7b78cdf4d9-mx66l`);
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

    const mockContext = {
      subscriptions: [] as { dispose: () => void }[],
    } as vscode.ExtensionContext;
    activate(mockContext);
  });

  teardown(async () => {
    deactivate();
    resetMockClient();

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
