---
title: ui/keys.ts
description: Keyboard arithmetic for the primitives, roving index and the Shift slider step.
sidebar:
  order: 71
---

**Written from:** `apps/editor/src/lib/ui/keys.ts` and `lib/ui/keys.test.ts`.

## Overview

`keys.ts` holds the small sums behind the keyboard behaviour of the primitives: which chip, tab or
glyph an arrow key moves to, and how far Shift+arrow moves a slider. It is kept apart from the
components so it can be tested.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `rovingIndex` | `(key, i, n, cols?) => number \| null` | Target index for `key`, or `null` for a key the group ignores (or `n <= 0`). |
| `sliderStep` | `(step, shift) => number` | `step`, or `step * 10` with Shift. |

### Inputs → outputs

| Key | One row (`cols` unset) | Grid (`cols` set) |
| --- | --- | --- |
| ArrowRight / ArrowLeft | next / previous, wrapping | same |
| ArrowDown / ArrowUp | next / previous, wrapping | ±`cols`, clamped to the ends |
| Home / End | 0 / `n - 1` | same |

### Callers / callees

Callers: `lib/ui/Toggle.svelte`, `lib/ui/TabBar.svelte` (which ignores Up and Down),
`lib/ui/GlyphGrid.svelte`, `lib/ui/Slider.svelte` (`sliderStep`), and the Collection tabs in
`lib/tiles/TileGallery.svelte` (which also ignore Up and Down). No callees.

### Tests

`lib/ui/keys.test.ts`: wrapping, Up/Down in a row, grid moves stopping at the edges, Home and End,
unhandled keys and an empty group, and the Shift step.
