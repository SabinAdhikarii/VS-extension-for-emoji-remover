# Emoji Remover — VS Code Extension

> Keep your code clean and professional. Remove AI-generated emoji from comments, strings, and variable names in one click.

---

## Why this exists

AI coding tools (Copilot, Cursor, ChatGPT, etc.) frequently inject emoji into generated code — in comments, docstrings, log messages, even variable names. This is an instant signal to code reviewers that the code is AI-generated. **Emoji Remover** strips them silently so your commits stay clean.

---

## Features

| Feature | Description |
|---|---|
| **Remove from file** | Strip all emoji from the current open file |
| **Remove from selection** | Strip emoji from highlighted text only |
| **Remove from workspace** | Batch clean every source file in your project |
| **Auto-remove on save** | Silently clean files every time you save |
| **Status bar warning** | Shows emoji count in bottom bar with a click-to-fix shortcut |
| **Inline diagnostics** | Underlines emoji-containing lines with a warning |

---

## Usage

### Keyboard shortcut
`Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac) — removes emojis from the active file.

### Command Palette
Open with `Ctrl+Shift+P` → type **Emoji Remover**:
- `Emoji Remover: Remove Emojis from File`
- `Emoji Remover: Remove Emojis from Selection`
- `Emoji Remover: Remove Emojis from Entire Workspace`
- `Emoji Remover: Toggle Auto-Remove on Save`

### Right-click context menu
Right-click in the editor → **Remove Emojis from File** or **Remove Emojis from Selection**.

---

## Settings

Go to **Settings** → search `emojiRemover`:

| Setting | Default | Description |
|---|---|---|
| `emojiRemover.autoRemoveOnSave` | `false` | Auto-clean on every save |
| `emojiRemover.showStatusBar` | `true` | Show emoji count in status bar |
| `emojiRemover.preserveInStrings` | `false` | Skip string literals (keep intentional UI emoji) |
| `emojiRemover.excludedLanguages` | `["markdown","plaintext"]` | Languages to ignore during auto-save |

---

## Installation (from source)

```bash
git clone https://github.com/your-username/emoji-remover
cd emoji-remover
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

### Package as `.vsix`
```bash
npm run package
# Produces emoji-remover-1.0.0.vsix
```
Install it via `Extensions → … → Install from VSIX`.

---

## What gets removed

- All Unicode emoji (Emoji_Presentation and Extended_Pictographic blocks)
- Flag sequences (e.g. 🇳🇵 🇬🇧)
- ZWJ sequences (family emoji, profession combos)
- Skin tone modifiers
- Variation selector-16 orphans left after removal

Markdown and plaintext files are excluded from auto-save by default (so your docs can still have emoji).

---

## License
MIT
