// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ConvexHttpClient } from "convex/browser";
import * as vscode from "vscode";

import { api } from "@package/backend/convex/_generated/api";
import { workspaceEventName } from "@package/validators";

import { env } from "./env";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "leopard" is now active!');
  const channel = vscode.window.createOutputChannel("eventlogger");
  const client = new ConvexHttpClient(env.CONVEX_URL);

  function timestamp() {
    return Date.now();
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - opened`);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - closed`);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - created`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - deleted`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.oldUri.fsPath).join(", ")} - ${e.files.map((file) => file.newUri.fsPath).join(", ")} - renamed`,
      );
    }),
  );

  // context.subscriptions.push(
  //   vscode.workspace.onDidSaveTextDocument((e) => {
  //     channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - saved`);
  //   }),
  // );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - closed`);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - created`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - deleted`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.oldUri.fsPath).join(", ")} - ${e.files.map((file) => file.newUri.fsPath).join(", ")} - renamed`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - saved`);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (!e.document.isDirty) {
        return;
      }

      channel.appendLine(
        `[${timestamp()}] ${e.document.uri.fsPath} - ${e.contentChanges.map((change) => `${change.range.start.line}:${change.range.start.character} - ${change.range.end.line}:${change.range.end.character}; ${change.rangeOffset}:${change.rangeLength} - ${change.text}`).join(" --- ")}`,
      );

      try {
        await client.mutation(api.api.extension.addBatchedChangesMutation, {
          changes: [
            {
              timestamp: timestamp(),
              eventType: workspaceEventName.parse("DID_CHANGE_TEXT_DOCUMENT"),
              metadata: {
                // contentChanges: e.contentChanges.map((change) => ({
                //   // range: {
                //   //   start: {
                //   //     line: change.range.start.line,
                //   //     column: change.range.start.character,
                //   //   },
                //   //   end: {
                //   //     line: change.range.end.line,
                //   //     column: change.range.end.character,
                //   //   },
                //   // },
                //   text: change.text,
                //   filePath: e.document.uri.fsPath,
                // })),
                content: e.document.getText(),
                filePath: e.document.uri.fsPath,
              },
            },
          ],
        });
      } catch (e) {
        console.log(e);
        // vscode.window.showInformationMessage(
        // `Error, failed to send to prod: ${JSON.stringify(e)}`,
        // );
      }
    }),
  );

  // context.subscriptions.push(
  //   vscode.workspace.onDidAcceptCopy((e) => {
  //     channel.appendLine(
  //       `[${timestamp()}] ${e.contents.map((content) => content.plainText).join("; ")} - copy accepted`,
  //     );
  //   }),
  // );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.textEditor.document.uri.fsPath} - ${e.selections.map((selection) => `${selection.start.line}:${selection.start.character} - ${selection.end.line}:${selection.end.character}`).join(", ")} - selection changed`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTerminalState((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.name} ${e.state.shell} - terminal state changed`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTerminalShellIntegration((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.terminal.name} ${e.terminal.state.shell} - terminal shell integration changed`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.terminal.name} ${e.exitCode} ${e.execution.commandLine.value} - command executed`,
      );
    }),
  );
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
