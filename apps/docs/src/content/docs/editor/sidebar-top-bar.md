---
title: sections/SidebarTopBar.svelte
description: The sidebar's top bar, with New, Import, Export and Undo, aligned with the preview's top bar.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/SidebarTopBar.svelte`, and its call site in
`App.svelte`.

## Overview

The document's actions, on the same ground and in the same grid row as the preview's top bar
(`App.svelte` shares the row with a subgrid). The two bars are therefore always the same height,
and one hairline runs under both.

- Left: **New** (opens App's [New tileset](/editor/new-tileset/) popup), **Import** ([import panel](/editor/import-panel/)),
  and **Export**, the area's one primary, a [Split button](/editor/ui-split-button/).
- Right: **Undo** (E6).

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

### Props

| Prop | Type | Meaning |
| --- | --- | --- |
| `onNew` | `() => void` | Opens the [New tileset](/editor/new-tileset/) popup (App's `askingNew`). |
| `draft` | `boolean` | Whether the preview draws a draft (App's `drawn !== null`), passed to Export image for its advisory. |

These actions used to sit in the [sidebar footer](/editor/sidebar-footer/), which now holds only
the seed controls.
