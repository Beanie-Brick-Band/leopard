// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ConvexHttpClient } from "convex/browser";
import * as vscode from "vscode";

import { api } from "@package/backend/convex/_generated/api";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "helpme" is now active!');
  const channel = vscode.window.createOutputChannel("eventlogger");
  const client = new ConvexHttpClient("https://tough-gazelle-941.convex.cloud");

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "helpme.helloWorld",
    async () => {
      try {
      } catch (e) {
        vscode.window.showInformationMessage(
          `Error: ${JSON.stringify(e)} ${typeof e}`,
        );
      }
      // try {
      //   vscode.window.showInformationMessage(`Error: ${unused.parse("test")}`);
      // } catch (e) {
      //   vscode.window.showInformationMessage(`Error: ${JSON.stringify(e)}`);
      // }
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from helpme!");
    },
  );

  context.subscriptions.push(disposable);

  function timestamp() {
    return new Date().toISOString();
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

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - saved`);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.isDirty) {
        channel.appendLine(
          `[${timestamp()}] ${e.document.uri.fsPath} - ${e.contentChanges.map((change) => `${change.range.start.line}:${change.range.start.character} - ${change.range.end.line}:${change.range.end.character}; ${change.rangeOffset}:${change.rangeLength} - ${change.text}`).join(" --- ")}`,
        );
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
export function deactivate() {}
