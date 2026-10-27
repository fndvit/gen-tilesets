---
title: images.ts
description: The canvas substrate's decoded-image cache, keyed on (tileId, assetId), loading what is new and dropping what is gone.
sidebar:
  order: 14
---

**Written from:** `packages/tileset/src/render/images.ts`, `images.test.ts`, and the call sites in
`render/Tileset.svelte`.

## Overview

The image bank holds the decoded pictures that the canvas painter draws from. When the DOM
substrate shows a tile, it hands a URL to an `<img>` element and the browser does the rest. A
canvas cannot do that: it can only draw an image that has already been downloaded and decoded. So
this module does that work explicitly.

It keeps one decoded image per distinct tile asset, not one per cell, so a grid of thousands of
cells still loads only a handful of pictures. When the set of assets in use changes, it loads the
new ones, forgets the ones no longer needed, and asks for a repaint whenever something becomes
ready.

It also checks that each picture has a natural size. An SVG with only a `viewBox` has none, and
the canvas cannot draw it at the right size, so it is refused on both substrates and reported
through `onAssetError`. It sits at the draw end of the pipeline, file → load → generate → **draw**, and only the
canvas substrate uses it.

## In detail

### Purpose

`drawImage` needs a decoded bitmap. `ImageBank` turns a `key → src` map into a `key →
HTMLImageElement` map of images that are ready to draw, and reports changes through callbacks. It
is "plain, callback-driven, and rune-free", for the same reason `measure.ts` gives: it typechecks
with the rest of the package and keeps reactive state in the component.

### Public surface

`NO_NATURAL_SIZE`, `requireNaturalSize` and the `Probe` type are exported from `render/index.ts`,
so the editor refuses at attach exactly what the renderer refuses at draw. `NaturalSizeChecks` and
`ImageBank` are internal to the package.

| Export | Type | Meaning |
| --- | --- | --- |
| `NO_NATURAL_SIZE` | `string` | The refusal message: *has no natural size. An SVG needs `width` and `height` attributes, not only a `viewBox`.* Shared by the DOM path and the bank. |
| `requireNaturalSize(img, probe?)` | `(HTMLImageElement, Probe \| null) → Promise<void>` | Resolves if a loaded `img` has a natural size, rejects with `NO_NATURAL_SIZE` if not. `probe` defaults to the global `createImageBitmap` where it exists, and to `null` (no probe) where it does not. |
| `Probe` | type | `(img: HTMLImageElement) → Promise<{ close(): void }>`: what `requireNaturalSize` asks, `createImageBitmap` in a browser. |
| `NaturalSizeChecks` | class | `check(src, img)` runs `requireNaturalSize` once per `src` and returns the same promise after. The constructor takes the check, for tests. |
| `ImageBank` | class | The cache below. `new ImageBank(checks?)` takes a `NaturalSizeChecks`, a fresh one by default. |

| `ImageBank` member | Type | Meaning |
| --- | --- | --- |
| `ready` | `Map<string, HTMLImageElement>` (readonly) | Decoded and ready. A missing key is either not loaded yet or failed. |
| `sync(wanted, onChange, onError)` | `(ReadonlyMap<string,string>, () => void, (key, cause) => void) → void` | Brings the bank in line with `wanted`. |

### Inputs → outputs

`sync` runs three passes:

1. **Drop from `ready`** every key whose wanted `src` differs from the one it was loaded with,
   including keys no longer wanted. This sets `changed`.
2. **Forget** in-flight and failed records for keys no longer wanted.
3. **Load** every wanted key whose `src` is neither current nor known to have failed with that
   same `src`. A new `Image` is created with `decoding = "async"`, `decode()` is awaited, and
   then `checks.check(src, img)`.
   - On success, if this `src` is still the current one for the key, it goes into `ready` and
     `onChange()` fires.
   - On failure of either (again only if still current), the `src` is recorded as failed and
     `onError(key, cause)` fires. A failed `src` is not retried until it changes.

If pass 1 removed anything, `onChange()` fires once at the end.

**`requireNaturalSize(img, probe)`** throws `NO_NATURAL_SIZE` at once if `naturalWidth` or
`naturalHeight` is 0. It returns without probing if `probe` is `null`, or if the picture is larger
than **300 × 150** in either dimension, the CSS default object size: a larger picture has a natural
size by construction. Otherwise it awaits `probe(img)` and closes the bitmap. A picture is refused
only when all three hold:

- it fits in 300 × 150;
- the probe rejects with an `InvalidStateError`;
- the error's message matches `/(natural|intrinsic) dimensions/i` (read by shape, not
  `instanceof Error`).

Any other probe failure, or no probe at all, passes: it is a question about the probe, not the
picture.

### Invariants

- **Keyed on `(tileId, assetId)`**, so the number of images is the number of distinct
  `TileAsset`s in use. The comment notes this is also why losing `loading="lazy"` costs little.
- **Safe to call on every change.** An unchanged key is left alone, so a re-render never
  re-decodes.
- **Superseded loads are ignored.** Both the success and the failure path check that the `src` is
  still current before acting.
- **R3 / S6 (cited):** a failed cell draws nothing and the failure is reported. There is no
  placeholder.
- **A picture with no natural size is refused on both substrates.** The editor runs this same
  function at attach (`apps/editor` `assets.ts` `measure`, **E13**), so a host gets a hole and an
  `onAssetError` naming the fix, whichever substrate it chose.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:625-626` | `new NaturalSizeChecks()` and `new ImageBank(sizeChecks)`, one per component, so a `src` is probed once across both substrates. |
| `render/Tileset.svelte:709-724` | An `$effect`, canvas only, calls `bank.sync(sources, () => bankVersion++, onError)`. `onError` turns the key back into a pair with `parseAssetKey` and reports it through `onAssetError`. |
| `render/Tileset.svelte:950-951` | The paint effect reads `bank.ready`, and reads `bankVersion` so that it re-runs when a decode lands. |
| `render/Tileset.svelte:451-452`, `1284` | DOM substrate: an `<img>`'s `onload` calls `checkLoaded(cell, src, img)`, which runs `sizeChecks.check(src, img)` and sends a refusal to `handleLoadError`. |
| `apps/editor/src/assets.ts` `measure` | Imports `requireNaturalSize` from `@fndvit/gen-tilesets/render` and fails the attach when it rejects. |

Callees: the browser's `Image`, `HTMLImageElement.decode()` and `createImageBitmap`.

### Tests: `images.test.ts`

The probe is injected, because Node has no `createImageBitmap`.

- `requireNaturalSize` passes a picture the probe accepts and closes the bitmap; refuses a
  150 × 150 picture whose probe rejects with Chromium 153's verbatim `InvalidStateError` (a
  viewBox-only SVG), and likewise 300 × 100, 50 × 150 and 300 × 150; never probes a picture larger
  than the default object size (301 × 150, 4000 × 3000); passes an `InvalidStateError` whose message
  does not name missing dimensions; refuses a `0 × 0` picture without probing; passes when the
  probe fails for another reason or is `null`.
- `NaturalSizeChecks` probes each `src` once, however many cells load it.

`ImageBank` itself is not tested.

### Gotchas & rejected alternatives

- **No `crossOrigin`, on purpose.** Nothing reads the canvas back (no `getImageData`, no
  `toDataURL`), so a tainted canvas costs nothing. Requesting CORS would make every asset on a
  server without the header fail outright, and the comment says this path "must not be stricter
  than" the DOM substrate's `<img>`.
- **Why `naturalWidth` cannot detect it.** Measured in Chrome 154: a viewBox-only SVG reports
  150 × 150, a default, not 0, but `drawImage` with a source rect lays the art out at the
  destination size and reads the source in 150-unit coordinates. A 48 px cell showed a 15 px
  tile; a non-square one, cover-cropped, drew nothing. `createImageBitmap(img)` refuses exactly
  this case, so it is the probe. Measured in Chromium 153, every SVG without natural dimensions
  reports at most 300 × 150 (150 × 150 for a square `viewBox`, 300 × 100 wide, 50 × 150 tall,
  300 × 150 with no `viewBox`) and is refused with *"The image element contains an SVG image
  without natural dimensions, and no resize options are specified."*
- **Why the size gate and the message match.** A picture over 300 × 150 is never probed: that
  keeps the probe cheap (a photo is not decoded a second time) and keeps out Chromium's other
  `InvalidStateError`, *"the ImageBitmap could not be allocated"*. Matching the message is brittle,
  but fails safe: if the wording changes, detection stops and nothing is refused.
- **Rejected: telling an SVG apart by its `src`.** An object URL carries no extension, and
  re-fetching to sniff the type costs a request per asset.
- **Rejected: rasterising onto an offscreen canvas.** It works, but costs memory per asset and
  softens the tile in cells larger than the raster, to accept a file the editor will not.
- **Rejected: `createImageBitmap(img, { resizeWidth, resizeHeight })`.** In Chrome 154 it produced
  a bitmap that drew nothing, and a resize option is exactly what Chromium's check exempts, so as a
  probe it never fires.
- **Rejected: drawing without a source rect when the crop is the whole image.** It fixes only a
  square SVG.
- **A deleted Tile must not pin its bitmap** for the session, and an asset replaced in place must
  not keep drawing the old picture. Both are handled by pass 1.

### Review notes

- No test file. The supersession checks and the "do not retry a failed `src`" rule are
  untested. **Partly addressed in 0.8.1:** `images.test.ts` covers the natural-size check;
  `ImageBank`'s supersession and no-retry rules are still untested.
