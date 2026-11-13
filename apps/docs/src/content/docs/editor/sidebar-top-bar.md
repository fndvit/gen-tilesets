---
title: sections/SidebarTopBar.svelte
description: The sidebar's top bar, with New, Import, Export, Undo and "?", aligned with the preview's top bar.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/SidebarTopBar.svelte`, `export-next.ts`, and its call site in
`App.svelte`.

## Overview

The document's actions, on the same ground and in the same grid row as the preview's top bar
(`App.svelte` shares the row with a subgrid). The two bars are therefore always the same height,
and one hairline runs under both.

- Left: **New** (opens App's [New tileset](/editor/new-tileset/) popup), **Import** ([import panel](/editor/import-panel/)),
  and **Export**, the area's one primary, a [Split button](/editor/ui-split-button/).
- Right, grouped in `.history`: **Undo** (E6), then **"?"**, an [Icon button](/editor/ui-icon-button/)
  with the `help` icon, labelled "Show the tour" (`aria-haspopup="dialog"`). It starts a replay of
  the [tour](/editor/tour-dialog/) through `onTour`, passing itself so focus returns to it. "?"
  sits with Undo, not with the document's actions, because it changes nothing in the file. One
  group, so the two stay together; its `margin-left: auto` keeps it at the right when it wraps onto a
  row of its own (320px).

**Undo has two forms.** Above 40rem it is a tertiary Button with its word. At 40rem and below it
is an Icon button labelled "Undo", because at 375px the bar has no room for "?" beside the word
(O1). Both are rendered, each in a `display: contents` span, and a media rule sets the other to
`display: none`, which takes it out of the Tab order and the accessibility tree. Rejected: a
`matchMedia` rune choosing one, which is more code and can disagree with the CSS breakpoint for a
frame. Both have the same `disabled` and `onclick`.

The document's actions come first (Pol, X1), so Export's menu opens left-aligned under it,
inside the sidebar.

Export's main part is §11.1's: the file and its asset folder together (E14), in one click. Its
menu repeats that as Tileset (.zip) (`archive`) and adds Image (.png)… (`image`), which opens
[Export image](/editor/export-image/). While the zip is written the main part reads "Exporting…"
and both parts are disabled. A failure, zip or image, is reported in one popup titled "Export
failed" after the attempt, never in the bar. When the export succeeds but
the document draws nothing (`drawsNothing`), §12.2's fifth advisory is pushed as the
`exportedEmpty` notice (`advisories.ts`) into the preview's stack instead: the export happened,
so there is nothing to answer. The bar
also takes dropped zips and folders for Import, and outlines itself in the accent while one is
over it.

### After a zip export: "Your tileset is downloading"

Batch 03, T-08 (B-030). When `exportZip` succeeds, a [Popup](/editor/ui-popup/) opens that says in
general terms what to do with the file: that `tileset.zip` holds `tileset.json` and a `tiles/`
folder, then three steps: install the package (the command, with a **Copy** button), put both in
the site's public files, load the file and draw it. Under them, a link, "Read the getting-started
guide", opens the guide in a new tab. The command, the link, the copy and the "Don't show again"
flag are [export-next.ts](/editor/export-next/)'s.

- **Only the zip opens it**, from the main part or from the menu's Tileset (.zip). Export image
  never does: a PNG is a picture, not something to install.
- **A Popup, not a Dialog**: it informs and asks nothing. Its actions are **Don't show again**
  (tertiary) and **Close**. Per Pol's D-06 B it shows on every export until Don't show again,
  which `hideStore()` keeps in `localStorage`, so it holds across reloads.
- **Copy** says "Copied" (with `check`) or "Couldn't copy", and a `role="status"` region says the
  same once, since a label that changes under focus is not reliably announced. The state resets
  to "Copy" each time the window opens. The command is selectable text (`user-select: all`), so a
  refused clipboard still leaves a way to copy it.
- **Focus returns to Export** when it closes (`refocusExport`), by hand. The main part is
  disabled while the zip is written, which drops focus to the body, so the dialog's own focus
  return would land nowhere. The split is wrapped in a `display: contents` span only to find its
  first button.
- The link is the editor's first text link: ink, underlined (1px, thicker on hover), so it is told
  from text by more than colour (WCAG 1.4.1).

### Props

| Prop | Type | Meaning |
| --- | --- | --- |
| `onNew` | `() => void` | Opens the [New tileset](/editor/new-tileset/) popup (App's `askingNew`). |
| `draft` | `boolean` | Whether the preview draws a draft (App's `drawn !== null`), passed to Export image for its advisory. |
| `onTour` | `(trigger: HTMLElement) => void` | "?" was pressed. App keeps `trigger` as `tourTrigger` and sets `touring = "replay"`. No guard against a second tour is needed: while one runs, the editor is inert behind its modal dialog. |

These actions used to sit in the [sidebar footer](/editor/sidebar-footer/), which now holds only
the seed controls.
