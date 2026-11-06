---
title: sections/SidebarTopBar.svelte
description: The sidebar's top bar, with Undo, New, Import and Export, aligned with the preview's top bar.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/SidebarTopBar.svelte`, and its call site in
`App.svelte`.

## Overview

The document's actions, on the same ground and in the same grid row as the preview's top bar
(`App.svelte` shares the row with a subgrid). The two bars are therefore always the same height,
and one hairline runs under both.

- Left: **Undo** (E6).
- Right: **New** (App's confirmed `newTileset`), **Import** ([import panel](/editor/import-panel/)),
  and **Export**, the area's one primary.

Export is §11.1's: the file and its asset folder together (E14). A failure is reported in a
popup titled "Export failed" after the download, never in the bar. When the export succeeds but
the document draws nothing (`drawsNothing`), §12.2's fifth advisory is pushed as the
`exportedEmpty` notice (`advisories.ts`) into the preview's stack instead: the export happened,
so there is nothing to answer. The bar
also takes dropped zips and folders for Import, and outlines itself in the accent while one is
over it.

These actions used to sit in the [sidebar footer](/editor/sidebar-footer/), which now holds only
the seed controls.
