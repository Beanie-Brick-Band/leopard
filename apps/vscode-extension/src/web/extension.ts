// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { api } from "@package/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const channel = vscode.window.createOutputChannel("eventlogger");

  const client = new ConvexHttpClient("https://scrupulous-basilisk-407.convex.cloud/");
  const user = await client.query(api.auth.getCurrentUser, {});
  channel.appendLine(`User: ${user ? user.email : "Not logged in"}`);

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

  context.subscriptions.push(
    vscode.workspace.onDidAcceptCopy((e) => {
      channel.appendLine(`[${timestamp()}] ${e.contents} - copy accepted`);
    }),
  );

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
