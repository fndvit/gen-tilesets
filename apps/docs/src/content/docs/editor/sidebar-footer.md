---
title: sections/SidebarFooter.svelte
description: The sidebar's fixed black footer. Seed, asset rerolls, the load preview, undo, import, new document and download, until Stage 2 designs it.
sidebar:
  order: 45
---

**Written from:** `apps/editor/src/lib/sections/SidebarFooter.svelte`, and its call site in
`App.svelte`.

## Overview

The black block at the bottom of the sidebar, Figma's *Fixed*. It never scrolls or collapses.
Figma does not design its contents yet (Stage 2), so for now it holds the session controls built
from existing primitives:

- **Seed:** the text field and a magenta re-seed button.
- **Assets:** reroll which variant each cell shows.
- **Assets on load:** Fixed or Reseed.
- **Fresh load:** preview another visitor's load. It is disabled when nothing reseeds on load.
- **Undo, Import, New, Download tileset.zip.**

The footer is also where a dropped `tileset.zip` or folder goes. Reports never take footer space:
an export error, or the note that the document draws nothing, appears in a
[`Popup`](/editor/ui-popup/) after the download.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `loadSalt` | `number` (bindable) | §8.5's load-preview value. App holds it because `<Tileset>` reads it. |
| `onNew` | `() => void` | App's `newTileset` (confirmed, not undoable). |

### Inputs → outputs

| Control | Writes |
| --- | --- |
| Seed field (`.t-body`, so the case shows as typed) | `setDefaultSeed(value)` on every `input` |
| Re-seed `IconButton` (seed tone) | `rerollSeed()` |
| Assets `IconButton` (seed tone) | `rerollAssets()` |
| Assets on load `Toggle` | `setReseedAssetsOnLoad(on)` |
| Fresh load `IconButton` (seed tone, disabled unless `loadVaries`) | `loadSalt = drawLoadSalt()`; writes no field |
| Undo | `session.undo()`, disabled unless `canUndo` |
| Import | [`ImportPanel`](/editor/import-panel/), with the footer as its drop `target` |
| New | `onNew()` |
| Download tileset.zip | `exportZip(file)`; "Building…" while it runs |

The Fresh load hint carries the inert-flags advisory: Operations that reseed on load over a
source that is not random (`inertFlags`).

### Theme

The root has `.theme-inverted` (`tokens.css`): ink becomes white, paper black, and the bar colours
swap. Every primitive inside renders inverted with no style of its own. The drag-over state draws
a 2px ink (white) outline inside the block.

Padding is 12px above and 10px at the sides, and `--footer-pad-bottom` (36px) below, so a band of
black sits under the last row (Pol, Block F review).

### Invariants

- **One action exports the file and its folder together** (**E14**).
- **`loadSalt` writes no field** (§8.1) and moves only on this button (**R12**).
- **Advisories never block** (**E16**). The empty-document note is shown after the export, which
  still happens.
- **The seed field has no preview seed beside it** (§5): it writes `config.defaultSeed`.

### Callers / callees

Caller: `App.svelte` (`<SidebarFooter bind:loadSalt onNew={newTileset} />`). Callees: `FieldRow`,
`IconButton`, `Toggle`, `Button`, `Popup`, `ImportPanel`; `document.ts` (`setDefaultSeed`,
`rerollSeed`, `rerollAssets`, `setReseedAssetsOnLoad`); `reseed.ts` (`loadVaries`, `inertFlags`,
`drawLoadSalt`); `download.ts` (`exportZip`); `export.ts` (`drawsNothing`).

### Tests

None for the component. `reseed.test.ts` and `export.test.ts` cover what it calls.

### Review notes

- Every keystroke in the seed field is its own undo entry, as before the redesign.
- Salt values (`assetSalt`, `loadSalt`) are no longer displayed (Block B decision).
