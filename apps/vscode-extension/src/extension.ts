// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ConvexHttpClient } from "convex/browser";
import * as vscode from "vscode";

import { api } from "@package/backend/convex/_generated/api";
import * as WorkspaceEvents from "@package/validators/workspaceEvents";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "leopard" is now active!');
  const channel = vscode.window.createOutputChannel("eventlogger");

  const configuration = vscode.workspace.getConfiguration("leopard");
  const convexUrl = configuration.get<string>("convexUrl") ?? "";
  const client = new ConvexHttpClient(convexUrl);

  function timestamp() {
    return Date.now();
  }

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidOpenTextDocument((e) => {
  //     channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - opened`);
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidCloseTextDocument((e) => {
  //     channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - closed`);
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidCreateFiles((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - created`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidDeleteFiles((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - deleted`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidRenameFiles((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.files.map((file) => file.oldUri.fsPath).join(", ")} - ${e.files.map((file) => file.newUri.fsPath).join(", ")} - renamed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.workspace.onDidSaveTextDocument((e) => {
  //     channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - saved`);
  //   }),
  // );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.contentChanges.length === 0) {
        return;
      }

      channel.appendLine(
        `[${timestamp()}] ${e.document.uri.fsPath} - ${e.contentChanges.map((change) => `${change.range.start.line}:${change.range.start.character} - ${change.range.end.line}:${change.range.end.character}; ${change.rangeOffset}:${change.rangeLength} - ${change.text}`).join(" --- ")}`,
      );

      // TODO implement reliable recovery in case of disconnections/failed mutations
      try {
        await client.mutation(api.api.extension.addBatchedChangesMutation, {
          changes: [
            {
              timestamp: timestamp(),
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
            },
          ],
        });
      } catch (e) {
        console.log(e);
        vscode.window.showInformationMessage(
          `Error, failed to upload: ${JSON.stringify(e)}`,
        );
      }
    }),
  );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/60
  // context.subscriptions.push(
  //   vscode.workspace.onDidAcceptCopy((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.contents.map((content) => content.plainText).join("; ")} - copy accepted`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTextEditorSelection((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.textEditor.document.uri.fsPath} - ${e.selections.map((selection) => `${selection.start.line}:${selection.start.character} - ${selection.end.line}:${selection.end.character}`).join(", ")} - selection changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/62
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTerminalState((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.name} ${e.state.shell} - terminal state changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow implementation for this event is low priority but could potentially be useful
  // context.subscriptions.push(
  //   vscode.window.onDidChangeTerminalShellIntegration((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.terminal.name} ${e.terminal.state.shell} - terminal shell integration changed`,
  //     );
  //   }),
  // );

  // TODO: workspace ingestion flow for this event: https://github.com/Beanie-Brick-Band/leopard/issues/62
  // context.subscriptions.push(
  //   vscode.window.onDidEndTerminalShellExecution((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.terminal.name} ${e.exitCode} ${e.execution.commandLine.value} - command executed`,
  //     );
  //   }),
  // );
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
