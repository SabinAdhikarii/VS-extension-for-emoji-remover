import * as vscode from 'vscode';
import { removeEmojis, countEmojis, hasEmojis } from './emojiUtils';

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('Emoji Remover is active');

  // --- Status bar ---
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'emojiRemover.removeFromFile';
  statusBarItem.tooltip = 'Click to remove emojis from this file';
  context.subscriptions.push(statusBarItem);

  // --- Diagnostics (underline emojis in editor) ---
  diagnosticCollection = vscode.languages.createDiagnosticCollection('emojiRemover');
  context.subscriptions.push(diagnosticCollection);

  // --- Commands ---

  // 1. Remove from current file
  context.subscriptions.push(
    vscode.commands.registerCommand('emojiRemover.removeFromFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
      }
      await removeFromDocument(editor.document, editor);
    })
  );

  // 2. Remove from selection
  context.subscriptions.push(
    vscode.commands.registerCommand('emojiRemover.removeFromSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('No text selected.');
        return;
      }
      const selectedText = editor.document.getText(editor.selection);
      const { text: cleaned, count } = removeEmojis(selectedText);

      await editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, cleaned);
      });

      vscode.window.showInformationMessage(
        count > 0 ? `✔ Removed ${count} emoji${count !== 1 ? 's' : ''} from selection.`
                  : 'No emojis found in selection.'
      );
    })
  );

  // 3. Remove from workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('emojiRemover.removeFromWorkspace', async () => {
      const files = await vscode.workspace.findFiles(
        '**/*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c,cs,php,rb,swift,kt,dart,vue,svelte,html,css,scss,json,yaml,yml,sh,bash,zsh}',
        '**/node_modules/**'
      );

      if (files.length === 0) {
        vscode.window.showInformationMessage('No supported files found in workspace.');
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `Remove emojis from ${files.length} files in this workspace?`,
        { modal: true },
        'Yes, clean them all'
      );

      if (confirmed !== 'Yes, clean them all') return;

      let totalRemoved = 0;
      let filesChanged = 0;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Emoji Remover',
          cancellable: true,
        },
        async (progress, token) => {
          for (let i = 0; i < files.length; i++) {
            if (token.isCancellationRequested) break;

            progress.report({
              increment: (100 / files.length),
              message: `Scanning ${files.length - i} files remaining…`,
            });

            const doc = await vscode.workspace.openTextDocument(files[i]);
            const original = doc.getText();
            if (!hasEmojis(original)) continue;

            const { text: cleaned, count } = removeEmojis(original);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
              doc.positionAt(0),
              doc.positionAt(original.length)
            );
            edit.replace(doc.uri, fullRange, cleaned);
            await vscode.workspace.applyEdit(edit);
            await doc.save();

            totalRemoved += count;
            filesChanged++;
          }
        }
      );

      vscode.window.showInformationMessage(
        `✔ Done! Removed ${totalRemoved} emojis across ${filesChanged} file${filesChanged !== 1 ? 's' : ''}.`
      );
    })
  );

  // 4. Toggle auto-remove on save
  context.subscriptions.push(
    vscode.commands.registerCommand('emojiRemover.toggleAutoRemove', async () => {
      const config = vscode.workspace.getConfiguration('emojiRemover');
      const current = config.get<boolean>('autoRemoveOnSave', false);
      await config.update('autoRemoveOnSave', !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Emoji Remover: Auto-remove on save is now ${!current ? 'ON 🟢' : 'OFF 🔴'}`
      );
    })
  );

  // --- Auto-remove on save ---
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(event => {
      const config = vscode.workspace.getConfiguration('emojiRemover');
      if (!config.get<boolean>('autoRemoveOnSave', true)) return;

      const excluded = config.get<string[]>('excludedLanguages', ['markdown', 'plaintext']);
      if (excluded.includes(event.document.languageId)) return;

      const original = event.document.getText();
      if (!hasEmojis(original)) return;

      const { text: cleaned } = removeEmojis(original);
      const fullRange = new vscode.Range(
        event.document.positionAt(0),
        event.document.positionAt(original.length)
      );

      event.waitUntil(
        Promise.resolve([new vscode.TextEdit(fullRange, cleaned)])
      );
    })
  );

  // --- Update status bar whenever active editor changes ---
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      updateStatusBar(editor?.document);
      updateDiagnostics(editor?.document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateStatusBar(event.document);
        updateDiagnostics(event.document);
      }
    })
  );

  // Init on startup
  updateStatusBar(vscode.window.activeTextEditor?.document);
  updateDiagnostics(vscode.window.activeTextEditor?.document);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function removeFromDocument(
  document: vscode.TextDocument,
  editor: vscode.TextEditor
) {
  const original = document.getText();
  const { text: cleaned, count } = removeEmojis(original);

  if (count === 0) {
    vscode.window.showInformationMessage('No emojis found in this file. 👍');
    return;
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(original.length)
  );

  await editor.edit(editBuilder => {
    editBuilder.replace(fullRange, cleaned);
  });

  updateStatusBar(document);
  diagnosticCollection.delete(document.uri);

  vscode.window.showInformationMessage(
    `✔ Removed ${count} emoji${count !== 1 ? 's' : ''} from ${document.fileName.split('/').pop()}`
  );
}

function updateStatusBar(document: vscode.TextDocument | undefined) {
  const config = vscode.workspace.getConfiguration('emojiRemover');
  if (!config.get<boolean>('showStatusBar', true)) {
    statusBarItem.hide();
    return;
  }

  if (!document) {
    statusBarItem.hide();
    return;
  }

  const count = countEmojis(document.getText());

  if (count > 0) {
    statusBarItem.text = `$(warning) ${count} emoji${count !== 1 ? 's' : ''} in file`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

function updateDiagnostics(document: vscode.TextDocument | undefined) {
  if (!document) {
    diagnosticCollection.clear();
    return;
  }

  const text = document.getText();
  if (!hasEmojis(text)) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  // Mark lines that contain emojis
  const diagnostics: vscode.Diagnostic[] = [];
  const lines = text.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!hasEmojis(line)) continue;

    const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
    const diagnostic = new vscode.Diagnostic(
      range,
      'Line contains emoji — may appear AI-generated to code reviewers.',
      vscode.DiagnosticSeverity.Warning
    );
    diagnostic.source = 'Emoji Remover';
    diagnostics.push(diagnostic);
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

export function deactivate() {
  diagnosticCollection?.dispose();
  statusBarItem?.dispose();
}
