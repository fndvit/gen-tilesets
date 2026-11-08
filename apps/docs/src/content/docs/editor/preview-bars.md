---
title: preview/PreviewTopBar, WidthChoices
description: The preview's one bar. It shows the width and one button per breakpoint bound at the left; the Grid toggle, the size presets with Fill and the background swatch at the right.
sidebar:
  order: 55
---

**Written from:** `apps/editor/src/lib/preview/PreviewTopBar.svelte`,
`apps/editor/src/lib/preview/WidthChoices.svelte`, and their call sites in `App.svelte`.

## Overview

The preview column is one top bar over the picture area (Figma *UI top*, in frame `Preview`
502:956). Figma also has a bottom bar, *UI Bottom*, for the breakpoints; Pol moved them into the
top bar (Stage 2): "So there is only the top UI". The bar stays put; only the picture scrolls.

- **Left, where the width is.** "Current preview size: 860 px". Hovering it explains that a
  resize changes nothing in the file, how far the picture is zoomed to fit, and which rules hold.
  Then "Breakpoints" and one button per bound the file's rules name. The black one is the range
  the width is in: the smallest bound at or above it. Pressing one shows the preview at exactly
  that bound. The breakpoints are not drawn when the file has no rules.
- **Right, what to show:** a **Grid** toggle, the size presets **360 / 768 / 1024 / 1440** and **Fill**, and a
  framed swatch that opens the colour picker for the background. There is no reset button (Pol,
  P2 review); white is picked like any other colour.

All of it is preview state ([view.svelte.ts](/editor/preview-width/)) and writes no field.

## In detail

### Public surface

| Component | Props |
| --- | --- |
| `PreviewTopBar` | `rules?: readonly ResponsiveRule[]`: the breakpoint buttons and the hint's "Holding" line. |
| `WidthChoices<T>` | `choices: { value: T; label: string }[]`, `chosen: T \| undefined`, `onChoose(value)`, `label` (the group's name), `divided?` (rules between cells, for the breakpoints). |

### Behaviour

- **`WidthChoices` is a group of `aria-pressed` buttons**, not a radio group: each is an action
  ("show at this width"), and a dragged width matches none. The matching one is ink, has
  `cursor: default` and does nothing when pressed again. Others invert on hover and go
  `--color-pressed` while pressed (Block F's chip rule). The focus ring sits inside the cell, in
  paper on an ink cell.
- **Sizes** (tokens): presets and breakpoints `--width-chip-w` × `--width-chip-h` (60 × 44, not
  Figma's 92 × 64 for the breakpoints, so the one bar keeps one height), swatch `--swatch-w` wide with a
  `--swatch-rule-w` frame, top bar at least `--preview-bar-h` (56). All above the 24px target.
- **Chosen preset:** the one equal to `preview.requested`; Fill when it is `null`.
- **Black breakpoint:** `activeBound(boundsOf(rules), preview.width)`.
- **Swatch:** a native `<input type="color">` covering a framed square painted in the colour,
  transparent itself. It touches the presets, as in Figma (`.sizes` groups them, Stage 2 P4), so
  the two wrap together.
- **Hints are hover-only**, like every `ui/Hint`: the readout's hint is its `aria-describedby`, and
  the readout is not a tab stop.
- **Grid toggle:** an `aria-pressed` button bound to `preview.showGrid` (ink while the grid shows);
  it shows and hides [PreviewGrid](/editor/preview-grid/).
- **Reflow:** the bar, its two halves and the button rows wrap on a narrow column, so nothing scrolls
  sideways at 320px. At 1024 and 600 the bar takes two rows (114px); Pol accepted it in P4.

### Callers

`App.svelte`: `<PreviewTopBar {rules} />` above the picture area, inside `section.preview`.
