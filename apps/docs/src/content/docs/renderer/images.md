---
title: images.ts
description: The canvas substrate's decoded-image cache, keyed on (tileId, assetId), loading what is new and dropping what is gone.
sidebar:
  order: 14
---

**Written from:** `packages/tileset/src/render/images.ts`, and the call sites in
`render/Tileset.svelte`. There is no test file.

## Overview

The image bank holds the decoded pictures that the canvas painter draws from. When the DOM
substrate shows a tile, it hands a URL to an `<img>` element and the browser does the rest. A
canvas cannot do that: it can only draw an image that has already been downloaded and decoded. So
this module does that work explicitly.

It keeps one decoded image per distinct tile asset, not one per cell, so a grid of thousands of
cells still loads only a handful of pictures. When the set of assets in use changes, it loads the
new ones, forgets the ones no longer needed, and asks for a repaint whenever something becomes
ready. It sits at the draw end of the pipeline, file → load → generate → **draw**, and only the
canvas substrate uses it.

## In detail

### Purpose

`drawImage` needs a decoded bitmap. `ImageBank` turns a `key → src` map into a `key →
HTMLImageElement` map of images that are ready to draw, and reports changes through callbacks. It
is "plain, callback-driven, and rune-free", for the same reason `measure.ts` gives: it typechecks
with the rest of the package and keeps reactive state in the component.

### Public surface

`ImageBank` is **not** exported from `render/index.ts`. It is internal to the package.

| Member | Type | Meaning |
| --- | --- | --- |
| `ready` | `Map<string, HTMLImageElement>` (readonly) | Decoded and ready. A missing key is either not loaded yet or failed. |
| `sync(wanted, onChange, onError)` | `(ReadonlyMap<string,string>, () => void, (key, cause) => void) → void` | Brings the bank in line with `wanted`. |

### Inputs → outputs

`sync` runs three passes:

1. **Drop from `ready`** every key whose wanted `src` differs from the one it was loaded with,
   including keys no longer wanted. This sets `changed`.
2. **Forget** in-flight and failed records for keys no longer wanted.
3. **Load** every wanted key whose `src` is neither current nor known to have failed with that
   same `src`. A new `Image` is created with `decoding = "async"`, and `decode()` is awaited.
   - On success, if this `src` is still the current one for the key, it goes into `ready` and
     `onChange()` fires.
   - On failure (again only if still current), the `src` is recorded as failed and
     `onError(key, cause)` fires. A failed `src` is not retried until it changes.

If pass 1 removed anything, `onChange()` fires once at the end.

### Invariants

- **Keyed on `(tileId, assetId)`**, so the number of images is the number of distinct
  `TileAsset`s in use. The comment notes this is also why losing `loading="lazy"` costs little.
- **Safe to call on every change.** An unchanged key is left alone, so a re-render never
  re-decodes.
- **Superseded loads are ignored.** Both the success and the failure path check that the `src` is
  still current before acting.
- **R3 / S6 (cited):** a failed cell draws nothing and the failure is reported. There is no
  placeholder.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:597` | `const bank = new ImageBank()`, one per component. |
| `render/Tileset.svelte:645-661` | An `$effect`, canvas only, calls `bank.sync(sources, () => bankVersion++, onError)`. `onError` turns the key back into a pair with `parseAssetKey` and reports it through `onAssetError`. |
| `render/Tileset.svelte:887` | The paint effect reads `bank.ready`, and reads `bankVersion` so that it re-runs when a decode lands. |

Callees: the browser's `Image` and `HTMLImageElement.decode()`.

### Tests

No test file.

### Gotchas & rejected alternatives

- **No `crossOrigin`, on purpose.** Nothing reads the canvas back (no `getImageData`, no
  `toDataURL`), so a tainted canvas costs nothing. Requesting CORS would make every asset on a
  server without the header fail outright, and the comment says this path "must not be stricter
  than" the DOM substrate's `<img>`.
- **A deleted Tile must not pin its bitmap** for the session, and an asset replaced in place must
  not keep drawing the old picture. Both are handled by pass 1.

### Review notes

- No test file. The supersession checks and the "do not retry a failed `src`" rule are
  untested.
