// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as os from "os";
import { ConvexHttpClient } from "convex/browser";
import * as vscode from "vscode";

import { api } from "@package/backend/convex/_generated/api";
import { assert } from "@package/validators/assert";
import * as WorkspaceEvents from "@package/validators/workspaceEvents";

let batchedClient: BatchedConvexHttpClient | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "leopard" is now active!');
  const channel = vscode.window.createOutputChannel("Leopard Event Logger");

  // Get configuration from VSCode settings
  const config = vscode.workspace.getConfiguration("leopard");
  const convexUrl = config.get<string>("convexUrl") ?? "";

  batchedClient = new BatchedConvexHttpClient(convexUrl, channel, {
    debounceDelayMs: 1000,
    retryDelayMs: 2000,
    maxRetries: 5,
  });

  // Log configuration info
  channel.appendLine(`[INIT] Leopard extension activated`);
  channel.appendLine(`[INIT] Convex URL: ${convexUrl}`);
  channel.appendLine(`[INIT] Hostname: ${os.hostname()}`);
  channel.show();

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidOpenTextDocument((e) => {
  //     channel.appendLine(`[${Date.now()}] ${e.uri.fsPath} - opened`);
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidCloseTextDocument((e) => {
  //     channel.appendLine(`[${Date.now()}] ${e.uri.fsPath} - closed`);
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidCreateFiles((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.files.map((file) => file.fsPath).join(", ")} - created`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidDeleteFiles((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.files.map((file) => file.fsPath).join(", ")} - deleted`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidRenameFiles((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.files.map((file) => file.oldUri.fsPath).join(", ")} - ${e.files.map((file) => file.newUri.fsPath).join(", ")} - renamed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidSaveTextDocument((e) => {
  //     channel.appendLine(`[${Date.now()}] ${e.uri.fsPath} - saved`);
  //   }),
  // );

  // TODO implement reliable recovery in case of disconnections/failed mutations
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) {
        return;
      }

      // Ignore changes to output channels (including our own logger)
      if (e.document.uri.scheme === "output") {
        return;
      }

      assert(batchedClient !== null, "Batched client is not initialized");
      batchedClient.addEvent({
        timestamp: Date.now(),
        eventType: WorkspaceEvents.NAME.DID_CHANGE_TEXT_DOCUMENT,
        metadata: {
          contentChanges: e.contentChanges.map((change) => ({
            range: {
              start: {
                line: change.range.start.line,
                column: change.range.start.character,
              },
              end: {
                line: change.range.end.line,
                column: change.range.end.character,
              },
            },
            text: change.text,
            filePath: e.document.uri.fsPath,
          })),
        },
      });
    }),
  );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/60
  // context.subscriptions.push(
  //   vscode.workspace.onDidAcceptCopy((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.contents.map((content) => content.plainText).join("; ")} - copy accepted`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTextEditorSelection((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.textEditor.document.uri.fsPath} - ${e.selections.map((selection) => `${selection.start.line}:${selection.start.character} - ${selection.end.line}:${selection.end.character}`).join(", ")} - selection changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/62
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTerminalState((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.name} ${e.state.shell} - terminal state changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTerminalShellIntegration((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.terminal.name} ${e.terminal.state.shell} - terminal shell integration changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/62
  // context.subscriptions.push(
  //   vscode.window.onDidEndTerminalShellExecution((e) => {
  //     channel.appendLine(
  //       `[${Date.now()}] ${e.terminal.name} ${e.exitCode} ${e.execution.commandLine.value} - command executed`,
  //     );
  //   }),
  // );
}

// This method is called when your extension is deactivated
export async function deactivate() {
  assert(batchedClient !== null, "Batched client is not initialized");
  await batchedClient.flush();
}

interface BatchedConvexHttpClientConfig {
  debounceDelayMs: number;
  retryDelayMs: number;
  maxRetries: number;
}
class BatchedConvexHttpClient {
  private client: ConvexHttpClient;
  private debouncer: NodeJS.Timeout | null = null;
  private eventBuffer: Parameters<
    typeof this.client.mutation<
      typeof api.api.extension.addBatchedChangesMutation
    >
  >[1]["changes"];
  private channel: vscode.OutputChannel;
  private config: BatchedConvexHttpClientConfig;

  constructor(
    convexUrl: string,
    channel: vscode.OutputChannel,
    config: BatchedConvexHttpClientConfig,
  ) {
    this.client = new ConvexHttpClient(convexUrl);
    this.channel = channel;
    this.eventBuffer = [];
    this.config = config;
  }

  private async submitEventsOrRetryUntilMaxRetriesReached(
    events: (typeof this.eventBuffer)[0][],
  ): Promise<boolean> {
    let error: unknown;

    for (
      let retryCount = 0;
      retryCount < this.config.maxRetries;
      retryCount++
    ) {
      try {
        if (retryCount > 0) {
          this.channel.appendLine(
            `[${Date.now()}] RETRY ${retryCount}/${this.config.maxRetries}: Retrying upload of ${events.length} batched event(s)...`,
          );

          // wait before retrying again to avoid overwhelming the connection
          await sleep(this.config.retryDelayMs);
        } else {
          this.channel.appendLine(
            `[${Date.now()}] SENDING: ${events.length} batched event(s) to Convex...`,
          );
        }

        await this.client.mutation(
          api.api.extension.addBatchedChangesMutation,
          {
            hostname: os.hostname(),
            changes: events,
          },
        );

        this.channel.appendLine(
          `[${Date.now()}] SUCCESS: ${events.length} batched event(s) uploaded to Convex`,
        );
        return true;
      } catch (e) {
        error = e;
      }
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    this.channel.appendLine(
      `[${Date.now()}] ERROR: Failed to upload batched events after ${this.config.maxRetries} retries - ${errorMsg}`,
    );
    console.error(errorMsg);
    vscode.window.showWarningMessage(
      `Leopard: Failed to upload batched events after ${this.config.maxRetries} retries - ${errorMsg}`,
    );
    return false;
  }

  private async submitEventsOrRecoverToBuffer() {
    if (this.eventBuffer.length === 0) {
      return;
    }

    // Create a copy to avoid race conditions: the eventBuffer could be modified while
    // sending events (e.g., new events arriving during the async mutation).
    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    const success =
      await this.submitEventsOrRetryUntilMaxRetriesReached(eventsToSend);

    if (!success) {
      // Restore events since they weren't sent
      this.eventBuffer.unshift(...eventsToSend);
    }
  }

  public addEvent(event: (typeof this.eventBuffer)[0]): void {
    this.channel.appendLine(
      `[${event.timestamp}] Logged an event: ${event.eventType}`,
    );

    this.eventBuffer.push(event);
    if (this.debouncer) {
      clearTimeout(this.debouncer);
    }
    this.debouncer = setTimeout(() => {
      void this.submitEventsOrRecoverToBuffer();
    }, this.config.debounceDelayMs);
  }

  public async flush() {
    if (this.debouncer) {
      clearTimeout(this.debouncer);
      this.debouncer = null;
    }
    await this.submitEventsOrRecoverToBuffer();
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
