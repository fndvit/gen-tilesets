---
title: ImportPanel.svelte
description: Opens an exported tileset.zip or its unzipped folder. Migrates, validates, re-attaches the pictures and swaps the document, or refuses and changes nothing.
sidebar:
  order: 43
---

**Written from:** `apps/editor/src/lib/ImportPanel.svelte`, and the call site in
`lib/sections/SidebarFooter.svelte`. The
pure half it calls is [import.ts](/editor/import/).

## Overview

Import is the Import button in the sidebar footer. It opens a file picker for the `tileset.zip`
the editor exported earlier. The author can also drop that zip, or the folder it unpacks to, on
the footer.

The panel reads the archive, upgrades an older tileset file to the current format, and checks
it. If anything is wrong it changes nothing and lists the problems in a popup once the attempt
ends. The report never takes space in the footer. The document on screen stays
as it was. If the file was written by a newer build, it says so and tells the author to update
the editor. If the file is good, the panel re-attaches the pictures and opens the document.
Anything worth knowing, such as an upgrade that happened or pictures that could not be read, is a
notice in the preview's stack, not the popup. A picture the archive did not carry is reported once,
by the preview, as an asset failure ("no file attached").

In the editor's pipeline (**import** → document → draft/history → preview → export), this is the
entry point. It is the inverse of the download button.

## In detail

### Purpose

The component turns a dropped zip, a picked zip, or a dropped folder into an `Archive` (a map
of path to bytes), then runs the sequence read → parse → **migrate** → **validate** → attach →
swap. Nothing before the last two steps touches editor state, so every refusal leaves the author
exactly where they were. It calls [`migrate`](/api/index/functions/migrate/) and
[`validate`](/api/index/functions/validate/) itself rather than the package's
`loadTilesetFile`, because it needs the migration steps for its advisory and the structured
[`ValidationError`](/api/index/interfaces/validationerror/) list to show each error at its path.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `target` | `HTMLElement \| null` | `null` | The element that takes drops (the footer). Listeners are attached in an `$effect`. |
| `over` | `boolean` (bindable) | `false` | Whether a drag is over `target`, for the caller to style. |

It reads and writes module state directly:
[`session`](/editor/session/), [`drafting`](/editor/drafting/) and the asset store in
[assets.ts](/editor/assets/).

### Inputs → outputs

#### Getting to an `Archive`

| Gesture | Path |
| --- | --- |
| Drop with any directory entry | `fromFolder(entries)` |
| Drop of files only | `fromZip(files[0])`; other files are ignored |
| Import button (`accept=".zip,application/zip"`) | `fromZip(file)`, then the input is cleared so the same file can be chosen again |

- `fromZip` uses `unzipSync` from `fflate` and drops directory entries (paths ending `/`).
- `fromFolder`: if exactly one directory was dropped, its **contents** are the root, so the
  folder's own name is not in the paths. Otherwise each entry is walked with an empty prefix.
- `entriesOf` calls `webkitGetAsEntry()` on every item **before the first `await`**, because a
  `DataTransferItem` is invalidated once the handler yields.
- `walk` calls `readEntries` until it returns an empty batch. A single call returns at most one
  batch, and stopping there would silently drop files from a large directory.

#### `open(archive)`

1. `readArchive(archive)` → `{ file, assets }`. Its `missing` list is not used: a `meta.src` the
   archive did not carry leaves the asset without a file, so it fails to draw and §12.3's
   failure notice says so.
2. `migrate(file)`. On `"newer"`, set `newer = outcome.declared` and stop.
3. Take `outcome.file` if `"migrated"`, else the raw file. `"unrecognized"` has no branch and
   falls through to `validate()`, which reports it at `/schemaVersion`.
4. `validate(file)`. Any error: set `errors` and stop.
5. Wrap each asset's bytes in a `File` (`nameOf`, `mimeOf`) and `await replaceAll(incoming)`.
6. `session.open(file as TilesetFile)` and `drafting.discard()`.
7. `notices.clear()`, then `notices.push` each of `importNotices({ upgrades, failed })`
   (`advisories.ts`): the upgrade advisory for the migration steps, and a failure for pictures
   that could not be read. A new document starts with no notices, then gets its own.

`run()` resets all three outputs, sets `busy` (the button reads "Importing…"), and catches any
throw (a bad zip, a missing `tileset.json`) into `failure`. When it ends with anything to report,
it opens the [`Popup`](/editor/ui-popup/). An import that opened never opens it. Closing the
popup calls `reset()`.

#### What it shows

Refusals are in the popup, titled "Import refused".

| State | Shown |
| --- | --- |
| `failure` | "Not opened. Nothing in the current document has changed." and the message |
| `newer` | "written by a newer build (schemaVersion N). Update the editor, not the file." |
| `errors` | "Not opened. …" and the first 12 errors as `path CODE message`, then "…and N more" |

### Invariants

- **No partial import** (cited as **C6**, §12.4). On any `ValidationError`, the file is not opened,
  nothing is repaired, and `<Tileset>` is never mounted on it (**S3**).
- **Migrate before validate.** Rewriting `schemaVersion` is a coercion, and validation never
  coerces.
- **"Update the editor" only for a newer file.** It is held in its own state rather than read
  out of `SCHEMA_VERSION_UNKNOWN`, which also fires for absent or fractional versions. The
  comment records that reading it from the code once told an author with an *old* file that
  their editor was at fault.
- **Missing pictures are not a refusal.** A document whose pictures are absent is still legal,
  and refusing "would throw away the operations, the seed and the layout over a picture". They
  surface as §12.3 asset failures in the preview, so each picture is reported once.
- **The draft is discarded on open**, because it names ids the incoming document may not have.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/sections/SidebarFooter.svelte` | `<ImportPanel target={root} bind:over />` in the actions row |

Callees: [`migrate`](/api/index/functions/migrate/), [`validate`](/api/index/functions/validate/)
; `unzipSync` (`fflate`); `replaceAll` (`assets.ts`); `importNotices` (`advisories.ts`);
`notices.clear`, `notices.push` (`notices.svelte.ts`); `readArchive`, `nameOf`, `mimeOf`
(`import.ts`); `session.open`, `drafting.discard`; `ui/Button`, `ui/Popup`.

### Tests

No test file for the component. `import.test.ts` covers the panel's whole non-DOM path: its
`describe("the import path, end to end through a zip")` block (line 155) runs unzip →
`readArchive` → `migrate` → `validate` through a real `fflate` zip, which its comment calls
"everything `ImportPanel.svelte` does before it touches the asset store or the session". Other
blocks pin `readArchive`, `nameOf` and `mimeOf`. The folder walk, `replaceAll` and the swap are
not tested.

### Gotchas & rejected alternatives

- **Refusals only after an attempt, in a popup** (Pol, 2026-11-04). They never take footer space.
- **An import that opened has nothing to answer**, so its notes are notices beside the picture
  (Stage 2 W3), not a popup. The "Imported, with notes" popup was removed.
- **Same gesture as the tile library.** A drop target plus a hidden picker, on purpose: the two
  surfaces that take files from the author should take them the same way.
- **A refused file costs nothing.** Every early `return` in `open()` is before `replaceAll` and
  `session.open`.

### Review notes

- Undo after an import restores the previous document, but `replaceAll` has already cleared the
  asset store and revoked the old object URLs, so the restored document's pictures are gone.
  `session.svelte.ts` documents this gap in its `open()` comment; nothing on screen tells the
  author. (The footer's comment calls import undoable; that is true of the document only.)
- The header comment's opening says the editor "takes the exported `.zip` or the unzipped folder".
  The picker only accepts `.zip`; a folder can only be dropped. Not wrong, but the button does not
  offer the folder path.
