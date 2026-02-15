// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as os from "os";
import { ConvexHttpClient } from "convex/browser";
import * as vscode from "vscode";

import { api } from "@package/backend/convex/_generated/api";
import { assert } from "@package/validators/assert";
import * as WorkspaceEvents from "@package/validators/workspaceEvents";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(
  context: vscode.ExtensionContext,
  client?: ConvexHttpClient,
  hostname?: string,
) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "leopard" is now active!');
  const channel = vscode.window.createOutputChannel("Leopard Event Logger");

  const config = vscode.workspace.getConfiguration("leopard");
  const convexUrl = config.get<string>("convexUrl") ?? "";
  BatchedConvexHttpClient.init(
    client ?? new ConvexHttpClient(convexUrl),
    hostname ?? os.hostname(),
    channel,
    1000,
  );

  channel.appendLine(`[INIT] Leopard extension activated`);
  channel.appendLine(`[INIT] Convex URL: ${convexUrl}`);
  channel.appendLine(`[INIT] Hostname: ${hostname ?? os.hostname()}`);
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

      BatchedConvexHttpClient.getInstance().addEvent({
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
  await BatchedConvexHttpClient.flushAndResetInstance();
}

class BatchedConvexHttpClient {
  private static instance: BatchedConvexHttpClient | null = null;
  private client: ConvexHttpClient;
  private debouncer: NodeJS.Timeout | null = null;
  private eventBuffer: Parameters<
    typeof this.client.mutation<
      typeof api.api.extension.addBatchedChangesMutation
    >
  >[1]["changes"];
  private channel: vscode.OutputChannel;
  private debounceDelay: number;
  private hostname: string;

  private constructor(
    client: ConvexHttpClient,
    hostname: string,
    channel: vscode.OutputChannel,
    debounceDelay: number,
  ) {
    this.client = client;
    this.channel = channel;
    this.debounceDelay = debounceDelay;
    this.eventBuffer = [];
    this.hostname = hostname;
  }

  public static init(
    client: ConvexHttpClient,
    hostname: string,
    channel: vscode.OutputChannel,
    debounceDelay: number,
  ) {
    assert(
      BatchedConvexHttpClient.instance === null,
      "BatchedConvexHttpClient already initialized.",
    );
    BatchedConvexHttpClient.instance = new BatchedConvexHttpClient(
      client,
      hostname,
      channel,
      debounceDelay,
    );
  }

  public static getInstance(): BatchedConvexHttpClient {
    assert(
      BatchedConvexHttpClient.instance !== null,
      "BatchedConvexHttpClient not initialized. Call init() first.",
    );
    return BatchedConvexHttpClient.instance;
  }

  private async submitEvents() {
    if (this.eventBuffer.length === 0) {
      return;
    }

    // Create a copy to avoid race conditions: the eventBuffer could be modified while
    // sending events (e.g., new events arriving during the async mutation).
    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      this.channel.appendLine(
        `[${Date.now()}] SENDING: ${eventsToSend.length} batched event(s) to Convex...`,
      );

      await this.client.mutation(api.api.extension.addBatchedChangesMutation, {
        hostname: this.hostname,
        changes: eventsToSend,
      });

      this.channel.appendLine(
        `[${Date.now()}] SUCCESS: ${eventsToSend.length} batched event(s) uploaded to Convex`,
      );
    } catch (error) {
      this.eventBuffer.unshift(...eventsToSend);

      const errorMsg = error instanceof Error ? error.message : String(error);
      this.channel.appendLine(
        `[${Date.now()}] ERROR: Failed to upload batched events - ${errorMsg}`,
      );
      vscode.window.showWarningMessage(
        `Leopard: Failed to upload batched events - ${errorMsg}`,
      );
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
      void this.submitEvents();
    }, this.debounceDelay);
  }

  public async flush() {
    if (this.debouncer) {
      clearTimeout(this.debouncer);
      this.debouncer = null;
    }
    await this.submitEvents();
  }

  public static async flushAndResetInstance() {
    await BatchedConvexHttpClient.getInstance().flush();
    BatchedConvexHttpClient.instance = null;
  }
}
