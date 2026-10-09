---
title: reference.ts
description: The reference image. Load a picture of the destination page, and the arithmetic for drawing it at the render box's width.
sidebar:
  order: 15
---

**Written from:** `apps/editor/src/reference.ts`, `reference.test.ts`, and the call sites in
`lib/PreviewFrame.svelte`, `lib/ReferenceLayer.svelte` and `lib/ReferenceControls.svelte`.

## Overview

The reference module lets the author check the tileset against the real page it is meant for.
The author drops in a screenshot of that page, and the editor draws it behind or over the
preview. The author can then judge the fit without exporting anything.

The screenshot is drawn at the same width as the preview, so one pixel of the image matches one
pixel of the design. It is not squeezed to fit the panel. Squeezing would change the scale and
make the comparison misleading.

The reference image is a viewing aid only. It changes nothing in the file, is not exported, is
not undone, and is gone on reload.

In the editor's pipeline, import → document → draft/history → **preview** → export, this belongs
to the preview stage only.

## In detail

### Purpose

`reference.ts` holds the testable part of the reference layer: loading a file into a `Reference`,
and two pure functions for its height and the vertical span the viewport must reserve. The
component that holds the reference in state cannot be imported by a test, so the arithmetic lives
here.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Reference` | `{ url, name, width, height }` | An object URL over the author's file, its name, and its intrinsic size. |
| `loadReference(file)` | `(File) → Promise<Reference>` | Creates a URL and measures it; revokes and rethrows on failure. |
| `layerHeight(frameWidth, ref)` | `(number, Reference) → number` | `frameWidth * ref.height / ref.width`, or `0` if `ref.width <= 0`. |
| `Extent` | `{ top, bottom }` | A vertical span in frame px from the render box's top edge; `top <= 0`, `bottom >= frameHeight`. |
| `frameExtent(frameHeight, imageHeight, yOffset)` | `(number, number, number) → Extent` | `{ top: min(0, yOffset), bottom: max(frameHeight, yOffset + imageHeight) }` |

### Inputs → outputs

- **`loadReference`** reuses [assets.ts](/editor/assets/)' `measure`, so an SVG with only a
  `viewBox` is refused. That would otherwise be drawn at whatever width the layout gave it and
  silently misreport the alignment. On failure the URL is revoked before the error escapes, the
  same as `attach()`.
- **`layerHeight`** is proportional and never cropped. The preview grows to hold the image.
- **`frameExtent`** is the union of the render box and the image layer. With no reference, the
  caller passes height 0 at offset 0 and gets `{ 0, frameHeight }`, *"exactly the height the
  viewport reserved before this existed"*. A negative offset opens room above. The frame is
  pushed down by `-top`, so the image is shown rather than clipped by the track's
  `overflow: hidden`.

### Invariants

- **E11: writes no field.** It is in the same category as the preview's backdrop colour. No
  `schemaVersion` moves, `validate()`'s key set is untouched, nothing joins the export zip, and
  nothing enters the undo stack. Never in the file, never in `meta` (E4).
- **Drawn at `Wpx`, not fitted.** Every horizontal quantity is a fixed fraction of `Wpx`, so the
  render box at `Wpx = 1440` is exactly what a 1440 px viewport shows. A 1440 px screenshot drawn
  at the same width shares that coordinate space. Fitting it to the panel would break the
  correspondence *for a number the author never chose*.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `lib/PreviewFrame.svelte:43` | imports `frameExtent`, `layerHeight`, `loadReference`, `Reference` |
| `lib/PreviewFrame.svelte:235` | `imageHeight = reference === null ? 0 : layerHeight(width, reference)` |
| `lib/PreviewFrame.svelte:244` | `extent = frameExtent(frameHeight, imageHeight, reference === null ? 0 : yOffset)` |
| `lib/PreviewFrame.svelte:249` | `next = await loadReference(file)` |
| `lib/ReferenceLayer.svelte:21` | `type Reference` |
| `lib/ReferenceControls.svelte:8` | `type Reference`; its `:12` shows `measure`'s message when a file is refused |

Callees: `measure` from `assets.ts`; `URL.createObjectURL` / `revokeObjectURL`.

### Tests: `reference.test.ts`

- **`layerHeight`.** It is the intrinsic height at the image's own width, keeps the aspect ratio
  at other widths, and is zero (not infinite) for a zero-width reference.
- **`frameExtent`.** It is the render box alone with no image, reaches past it for a taller image,
  keeps the box's bottom for a shorter one, follows a positive offset down, opens room above for a
  negative offset, and never reports a `top` below the render box's own.

`loadReference` needs a DOM and is untested.

### Gotchas & rejected alternatives

- **Rejected: fitting the image to the panel.** The source cites the worst outcome as *approving
  a picture the file does not produce*.
- **Session-scoped,** like the asset store.

### Review notes

None found.
