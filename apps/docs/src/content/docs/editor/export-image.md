---
title: sections/ExportImage.svelte
description: Export image, a Form popup that writes the saved tileset as a PNG at a chosen size, background and density.
sidebar:
  order: 82
---

**Written from:** `apps/editor/src/lib/sections/ExportImage.svelte`, and its call site in
`SidebarTopBar.svelte`.

## Overview

Export's menu item Image (.png)… opens this form (item 1). It writes the tileset as a PNG with
the package's [`renderImage`](/renderer/image/): an offscreen render at the chosen width and
density, so the same choices give the same PNG on any screen. The choices themselves are
[image-export.ts](/editor/image-export/)'s, tested.

**It draws the saved file, never the draft** (Pol, X0), with the file's `defaultSeed`, the load on
screen (`preview.loadSalt`), and the editor's asset provider. **Hidden operations are left out**
(batch 02 T-02, D-03 A: the image is a picture of the preview): it draws `withoutHidden(file,
preview.hidden, <id of the operation open for editing>)` from [visibility.ts](/editor/visibility/),
which keeps the open one, as the preview does.

## In detail

### Props

| Prop | Type | Meaning |
| --- | --- | --- |
| `open` | `boolean` (bindable) | Shows the form. |
| `draft` | `boolean` | Whether the preview draws a draft; shows the advisory. |
| `onFailed` | `(message: string) => void` | A failed render's message, for the top bar's "Export failed". |

### The form

A [Popup](/editor/ui-popup/) with `closable` (a ✕) and `initialFocus` (the chosen size):

1. **Size**, a [Radio list](/editor/ui-radio-list/) of `sizeRows(file.responsive, referenceWidth)`:
   Design width, then each breakpoint bound.
2. **Background** (Preview colour, with a swatch of `preview.background` / Transparent) and
   **Density** (1× / 2×, 2× by default), two [segmented controls](/editor/ui-toggle/) sharing the
   row 3:2 and wrapping to one column on a narrow screen.
3. While `draft`, the inline advisory "Draft not included: this is the saved tileset".
4. **File**: the name and the PNG's pixel size, from `pixelSize` (computed only while open: it
   builds a model, and the file changes on every edit). They are two unbreakable parts, so a
   narrow screen wraps between them, never inside the size.
5. Cancel, and Download PNG, which reads "Exporting…" and is disabled while the PNG is drawn.

### Behaviour

- **Remembered size:** the size of the last download is module state, so it lasts the session; the
  form opens on it while that bound still exists, else on Design width (`rememberedSize`). The row
  picked since opening is held apart and cleared on close, so opening needs no effect.
  Background and density stay as left, because the form is mounted with the top bar.
- **Download:** the file, size, width, density and name are read once at the click (the radios
  stay live while the PNG is drawn), then `renderImage` and `saveBlob`, then the form closes.
- **Failure:** the form closes and `onFailed` opens "Export failed" with `renderImage`'s message,
  which names every picture that failed. Nothing is written.
- Esc, Cancel or ✕ close it, and the native dialog returns focus to Export's chevron.

### Callers / callees

Caller: `lib/sections/SidebarTopBar.svelte`. Callees: `renderImage`, `editorProvider`
(`assets.ts`), `saveBlob` (`download.ts`), `image-export.ts`, `preview` (`view.svelte.ts`),
`Popup`, `RadioList`, `Toggle`, `Advisory`, `Button`.

No unit test (a `.svelte` file); the X3b-3 and X4 browser probes cover it.

### Against the screen

At the preview's width and the screen's DPR, the PNG has the on-screen box's size and its pixels
(mean difference under 1/255). The one difference is at vertical seams: Chrome snaps the
presented canvas to the device grid, while `renderImage` draws it at the exact fractional bleed
offset, so a seam's anti-aliased pixel sits about 0.6 device px to the right in the PNG (X4).
