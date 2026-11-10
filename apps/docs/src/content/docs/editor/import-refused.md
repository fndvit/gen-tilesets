---
title: ImportRefused.svelte
description: The "Import refused" popup, for a tileset that was not opened. Shared by Import and the New tileset popup's templates.
sidebar:
  order: 86
---

**Written from:** `apps/editor/src/lib/ImportRefused.svelte`, and the call sites in
`lib/ImportPanel.svelte` and `lib/sections/NewTileset.svelte`.

## Overview

When a tileset cannot be opened, nothing on screen changes, and this popup says why. It was part
of the [import panel](/editor/import-panel/). It became its own component when templates arrived
(B-016): a template opens through the same steps as an import, so it fails the same ways and
should be reported the same way.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `open` | `boolean` (bindable) | Whether the popup shows. |
| `failure` | `string \| null` | A thrown message: a bad zip, no `tileset.json`, a picture that would not load. |
| `newer` | `number \| null` | The version a file from a newer build declared. |
| `errors` | `ValidationError[]` | The validation errors. |
| `subject` | `string \| undefined` | What was not opened, when the gesture does not say: a template's label. |
| `onClose` | `() => void` | Clears the caller's report. |

### What it shows

| State | Shown |
| --- | --- |
| `failure` | "Not opened. Nothing in the current document has changed." and the message in mono |
| `newer` | "This file was written by a newer build (schemaVersion N). Update the editor, not the file." |
| `errors` | "Not opened. …" and the first 12 errors as `path CODE message`, then "…and N more" |

With a `subject`, "Not opened." becomes "Collage was not opened.", and "This file" becomes
"Collage".

### Invariants

- **No partial import** (**C6**, §12.4): the popup only ever reports; the caller has changed
  nothing.
- **"Update the editor" only for a newer file**, from `newer`, never read out of a
  `SCHEMA_VERSION_UNKNOWN` error.

### Callers

`lib/ImportPanel.svelte` (no `subject`) and `lib/sections/NewTileset.svelte` (the template's
label). Callee: `ui/Popup`.
