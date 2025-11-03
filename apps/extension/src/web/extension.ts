// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

let listeners: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  const channel = vscode.window.createOutputChannel("eventlogger");

  function timestamp() {
    return new Date().toISOString();
  }

  listeners.push(
    vscode.workspace.onDidOpenTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - opened`);
    }),
  );

  listeners.push(
    vscode.workspace.onDidCloseTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - closed`);
    }),
  );

  listeners.push(
    vscode.workspace.onDidCreateFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - created`,
      );
    }),
  );

  listeners.push(
    vscode.workspace.onDidDeleteFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.fsPath).join(", ")} - deleted`,
      );
    }),
  );

  listeners.push(
    vscode.workspace.onDidRenameFiles((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.files.map((file) => file.oldUri.fsPath).join(", ")} - ${e.files.map((file) => file.newUri.fsPath).join(", ")} - renamed`,
      );
    }),
  );

  listeners.push(
    vscode.workspace.onDidSaveTextDocument((e) => {
      channel.appendLine(`[${timestamp()}] ${e.uri.fsPath} - saved`);
    }),
  );

  listeners.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.isDirty) {
        channel.appendLine(
          `[${timestamp()}] ${e.document.uri.fsPath} - ${e.contentChanges.map((change) => `${change.range.start.line}:${change.range.start.character} - ${change.range.end.line}:${change.range.end.character} - ${change.text}`).join(" --- ")}`,
        );
      }
    }),
  );

  listeners.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.textEditor.document.uri.fsPath} - ${e.selections.map((selection) => `${selection.start.line}:${selection.start.character} - ${selection.end.line}:${selection.end.character}`).join(", ")} - selection changed`,
      );
    }),
  );

  listeners.push(
    vscode.window.onDidChangeTerminalState((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.name} ${e.state.shell} - terminal state changed`,
      );
    }),
  );

  listeners.push(
    vscode.window.onDidChangeTerminalShellIntegration((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.terminal.name} ${e.terminal.state.shell} - terminal shell integration changed`,
      );
    }),
  );

  listeners.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      channel.appendLine(
        `[${timestamp()}] ${e.terminal.name} ${e.exitCode} ${e.execution.commandLine.value} - command executed`,
      );
    }),
  );

  context.subscriptions.push(...listeners);
}

export function deactivate() {
  listeners.forEach((listener) => listener.dispose());
}
