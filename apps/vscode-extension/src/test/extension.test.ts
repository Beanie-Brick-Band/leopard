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
  let fileManager: FileManager;

  suiteSetup(() => {
    /*
      VSCode automatically activates the extension on test suite startup, but the
      listeners of the extension aren't being triggered. So we manually activate
      another instance that does get triggered. This is a workaround to the bug
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

    fileManager = new FileManager(workspaceUri);
    BatchedConvexHttpClient.init(
      mockClient as unknown as ConvexHttpClient,
      `coder-${coderWorkspaceId}-7b78cdf4d9-mx66l`,
      1000,
    );
  });

  teardown(async () => {
    await fileManager.deleteAllFiles();
    await BatchedConvexHttpClient.flushAndResetInstance();
  });

  test("onDidChangeTextDocument event is sent to the Database", async () => {
    const success = await fileManager.createAndEdit(
      "test-dummy.ts",
      new vscode.Position(0, 0),
      "Hello, world!",
    );
    assert.ok(success, `test-dummy.ts should be created and edited`);

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
        ...lastEvent,
        eventType: WorkspaceEvents.NAME.DID_CHANGE_TEXT_DOCUMENT,
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
              filePath: fileManager.getFileURI("test-dummy.ts").fsPath,
            },
          ],
        },
      },
      "Event object should match expected structure",
    );
  });

  test("Sequential workspace events must be batch submitted", async () => {
    const success1 = await fileManager.createAndEdit(
      "test-dummy3.ts",
      new vscode.Position(0, 0),
      "First edit\n",
    );
    assert.ok(success1, "First edit should be applied");

    // simulate typing delay
    await sleep(200);

    const success2 = await fileManager.createAndEdit(
      "test-dummy2.ts",
      new vscode.Position(1, 0),
      "Second edit\n",
    );
    assert.ok(success2, "Second edit should be applied");

    // Flush to bypass debounce and submit batched events
    await BatchedConvexHttpClient.getInstance().flush();

    // Verify both events were received
    const replay = await mockClient.query(api.web.replay.getReplay, {
      workspaceId,
    });

    const recentEvents = replay.slice(-2);
    assert.ok(
      recentEvents.length >= 2,
      "Should have at least 2 sequential events",
    );

    const firstEditEvent = recentEvents.find((event) =>
      event.metadata.contentChanges.some(
        (change: { text: string }) => change.text === "First edit\n",
      ),
    );
    assert.ok(firstEditEvent, "Should find event containing 'First edit'");

    const secondEditEvent = recentEvents.find((event) =>
      event.metadata.contentChanges.some(
        (change: { text: string }) => change.text === "Second edit\n",
      ),
    );
    assert.ok(secondEditEvent, "Should find event containing 'Second edit'");

    const timeDiff = Math.abs(
      firstEditEvent._creationTime - secondEditEvent._creationTime,
    );
    assert.ok(
      timeDiff <= 10,
      `events that are batched together should have a _creationTime difference of less than 10ms (actual diff: ${timeDiff}ms)`,
    );
  });
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class FileManager {
  private readonly workspaceUri: vscode.Uri;
  private readonly files: Set<string>;

  constructor(workspaceUri: vscode.Uri) {
    this.workspaceUri = workspaceUri;
    this.files = new Set();
  }

  async createAndEdit(
    fileName: string,
    position: vscode.Position,
    edit: string,
  ) {
    const fileUri = vscode.Uri.joinPath(this.workspaceUri, fileName);
    const wsEdit = new vscode.WorkspaceEdit();
    wsEdit.createFile(fileUri, { ignoreIfExists: true });
    wsEdit.insert(fileUri, position, edit);
    const success = await vscode.workspace.applyEdit(wsEdit);
    if (success) {
      this.files.add(fileName);
      return true;
    }

    return false;
  }

  async deleteAllFiles() {
    if (this.files.size === 0) {
      return true;
    }
    const wsEdit = new vscode.WorkspaceEdit();
    for (const fileName of this.files) {
      wsEdit.deleteFile(vscode.Uri.joinPath(this.workspaceUri, fileName), {
        ignoreIfNotExists: true,
      });
    }
    const success = await vscode.workspace.applyEdit(wsEdit);
    if (success) {
      this.files.clear();
      return true;
    }
    return false;
  }

  getFileURI(fileName: string) {
    return vscode.Uri.joinPath(this.workspaceUri, fileName);
  }
}
