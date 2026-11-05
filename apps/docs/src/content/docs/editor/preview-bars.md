---
title: preview/PreviewTopBar, BreakpointBar, WidthChoices
description: The preview's two bars. The top bar shows the width, the Grid toggle, the size presets with Fill and the background swatch; the bottom bar has one button per breakpoint bound.
sidebar:
  order: 55
---

**Written from:** `apps/editor/src/lib/preview/PreviewTopBar.svelte`,
`apps/editor/src/lib/preview/BreakpointBar.svelte`, `apps/editor/src/lib/preview/WidthChoices.svelte`,
and their call sites in `App.svelte`.

## Overview

The preview column is a top bar, the picture area, and a bottom bar (Figma *UI top* and
*UI Bottom*, in frame `Preview` 502:956). The bars stay put; only the picture scrolls.

- **Top bar.** At the left, "Current preview size: 860 px". Hovering it explains that a resize
  changes nothing in the file, how far the picture is zoomed to fit, and which rules hold. At the
  right: a **Grid** toggle, the size presets **360 / 768 / 1024 / 1440** and **Fill**, and a
  framed swatch that opens the colour picker for the background. There is no reset button (Pol,
  P2 review); white is picked like any other colour.
- **Bottom bar.** "Breakpoints" and one button per bound the file's rules name. The black one is
  the range the width is in: the smallest bound at or above it. Pressing one shows the preview at
  exactly that bound. The bar is not drawn when the file has no rules.

All of it is preview state ([view.svelte.ts](/editor/preview-width/)) and writes no field.

## In detail

### Public surface

| Component | Props |
| --- | --- |
| `PreviewTopBar` | `rules?: readonly ResponsiveRule[]`, for the hint's "Holding" line. |
| `BreakpointBar` | `rules?: readonly ResponsiveRule[]`. |
| `WidthChoices<T>` | `choices: { value: T; label: string }[]`, `chosen: T \| undefined`, `onChoose(value)`, `label` (the group's name), `size: "preset" \| "breakpoint"`, `divided?` (rules between cells). |

### Behaviour

- **`WidthChoices` is a group of `aria-pressed` buttons**, not a radio group: each is an action
  ("show at this width"), and a dragged width matches none. The matching one is ink, has
  `cursor: default` and does nothing when pressed again. Others invert on hover and go
  `--color-pressed` while pressed (Block F's chip rule). The focus ring sits inside the cell, in
  paper on an ink cell.
- **Sizes** (tokens): presets `--width-chip-w` × `--width-chip-h` (60 × 44), breakpoints
  `--breakpoint-w` × `--breakpoint-h` (92 × 64), swatch `--swatch-w` wide with a
  `--swatch-rule-w` frame, top bar at least `--preview-bar-h` (56). All above the 24px target.
- **Chosen preset:** the one equal to `preview.requested`; Fill when it is `null`.
- **Black breakpoint:** `activeBound(boundsOf(rules), preview.width)`.
- **Swatch:** a native `<input type="color">` covering a framed square painted in the colour,
  transparent itself.
- **Grid toggle:** an `aria-pressed` button bound to `preview.showGrid` (ink while the grid shows);
  it shows and hides [PreviewGrid](/editor/preview-grid/).
- **Reflow:** the top bar and both button rows wrap on a narrow column, so nothing scrolls
  sideways at 320px.

### Callers

`App.svelte`: `<PreviewTopBar {rules} />` above the picture area and `<BreakpointBar {rules} />`
below it, inside `section.preview`.
