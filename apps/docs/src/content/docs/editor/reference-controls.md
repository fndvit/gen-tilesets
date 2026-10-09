---
title: ReferenceControls.svelte
description: The reference image's control row. Pick or replace a picture of the destination page, match its width, nudge it, fade it, and put it in front or behind.
sidebar:
  order: 55
---

**Written from:** `apps/editor/src/lib/ReferenceControls.svelte` and the call site in
`lib/PreviewFrame.svelte`.

## Overview

These controls sit in a row above the preview, under the width presets. They manage an optional
**reference image**: a screenshot or mock-up of the page the tileset is meant for. With one
loaded, the author can see the tileset over or under the real page and judge it in place.

With no image, the row is a "Reference image…" button and a line saying the image can also be
dropped on the preview and is kept for the session only. With an image, the row shows its name
and size, a button that sets the preview to the image's own width so the two line up pixel for
pixel, a vertical offset box, an opacity slider, a front/behind toggle, a replace button and a
remove button.

In the editor's pipeline (import → document → draft/history → **preview** → export), this is a
viewing aid. It writes nothing to the document.

## In detail

### Purpose

The component is the affordances only; [PreviewFrame](/editor/preview-frame/) holds the state and
[reference.ts](/editor/reference/) the reasoning. It sits beside the width and backdrop controls
because it is the same kind of control: it changes what the author is looking at and **writes no
field** (**E11**).

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `reference` | `Reference \| null` | required | `{ url, name, width, height }` from `reference.ts`, or none. |
| `error` | `string \| null` | required | A refused file's reason, shown rather than swallowed. |
| `onPick` | `(file: File) => void` | required | A file was chosen. |
| `onClear` | `() => void` | required | Remove the reference. |
| `onMatchWidth` | `() => void` | required | Set `Wpx` to the image's intrinsic width. |
| `width` | `number` | required | The current `Wpx`, to tell whether it already matches. |
| `opacity` | `number` | required | Current opacity. |
| `inFront` | `boolean` | required | Current side. |
| `yOffset` | `number` | required | Current offset in frame px. |
| `onOpacity` | `(next: number) => void` | required | |
| `onInFront` | `(next: boolean) => void` | required | |
| `onOffset` | `(next: number) => void` | required | |

### Inputs → outputs

- A hidden `<input type="file" accept="image/*">`; its first file goes to `onPick`, then the input
  is cleared so re-picking the same file after a refusal fires again.
- `matched` is `Math.round(width) === reference.width`. The match button is disabled and reads
  "1:1" when matched, else "match <width>".
- **y:** `<input type="number" step="10">`; any finite `parseFloat` goes to `onOffset`.
- **opacity:** `<input type="range" min="0.1" max="1" step="0.05">` → `onOpacity`.
- **side:** toggles `onInFront(!inFront)`, labelled "in front" / "behind".
- ⟲ re-opens the picker; ✕ calls `onClear`.
- `error` renders "Reference image: <error>".

### Invariants

- **Writes no field** (**E11**). Every value is handed back to the frame through a callback.
- **Validation is by decoding, not by MIME type.** The comment: the same acceptance as the tile
  library; a file either produces a picture with an intrinsic size or it is refused (by `measure`
  in `assets.ts`, called through `loadReference`).
- **1:1 is the honest comparison.** At `Wpx` equal to the image's width, one image pixel is one
  design pixel.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/PreviewFrame.svelte:41` | import |
| `lib/PreviewFrame.svelte:394`–`409` | every prop wired to the frame's local state; `onMatchWidth` sets `requested = reference.width` |

Callees: the `Reference` type from `reference.ts` only.

### Tests

No test file.

### Gotchas & rejected alternatives

- **The opacity slider bottoms out at 0.1**, not 0. The source gives no reason for the floor.
- **Dropping is handled by the frame, not here.** The text says "Drop it on the preview"; the drop
  listener is on `PreviewFrame`'s track.

### Review notes

- The `y` box applies any finite value but has no draft-text model; an emptied or invalid box is
  not reverted on blur. (inconsistency, minor)
