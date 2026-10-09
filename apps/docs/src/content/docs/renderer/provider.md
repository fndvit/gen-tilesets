---
title: provider.ts
description: How a (tileId, assetId) pair becomes something drawable, the two shipped providers, and the asset key every cache uses.
sidebar:
  order: 13
---

**Written from:** `packages/tileset/src/render/provider.ts`, `provider.test.ts`, and the call
sites in `render/Tileset.svelte`, `render/options.ts`, `apps/editor/src/assets.ts`,
`apps/editor/src/download.ts` and the `apps/demo` pages.

## Overview

The provider is how the renderer finds the picture for a tile. A generated grid says only *which*
tile and *which* of its images belongs in each cell; it never says where the image file is. The
provider is a small function the host supplies that answers that question: given a tile id, an
asset id and the asset's free-form metadata, it returns the image's URL.

This module defines that contract, ships two ready-made providers (one that reads the `src` field
from the metadata, and one that does the same with a base path in front), and defines the string
key that every per-asset cache in the renderer uses. It sits between generation and drawing:
file → load → generate → **resolve** → draw.

## In detail

### Purpose

A `TileState` carries identifiers only. Resolution happens in the renderer, through a provider the
host passes in `options.provider`. This file fixes three things: the shape of what a provider
returns, the default way `meta.src` is read (and the loud failure when it is missing), and the
`(tileId, assetId)` key.

### Public surface

All re-exported from `render/index.ts:149-157`.

| Export | Kind | Meaning |
| --- | --- | --- |
| [`Drawable`](/api/render/interfaces/drawable/) | interface | `{ src: string }`. An object, not a bare string, so a later DPR-aware key can be added without breaking every provider. |
| [`AssetRef`](/api/render/interfaces/assetref/) | interface | `{ tileId, assetId, meta }`. `meta` is that `TileAsset`'s block, verbatim, and the renderer never reads it. |
| [`AssetProvider`](/api/render/type-aliases/assetprovider/) | type | `(ref: AssetRef) => Drawable \| Promise<Drawable>` |
| [`defaultProvider`](/api/render/variables/defaultprovider/) | `AssetProvider` | `{ src: meta.src }`. `<Tileset>`'s default. |
| [`prefixedProvider`](/api/render/functions/prefixedprovider/) | `(prefix: string) → AssetProvider` | `defaultProvider` with a base path joined in front. |
| [`assetKey`](/api/render/functions/assetkey/) | `(tileId, assetId) → string` | `` `${tileId}\0${assetId}` `` |
| [`parseAssetKey`](/api/render/functions/parseassetkey/) | `(key) → { tileId, assetId } \| null` | The inverse. `null` for a string that is not a key. |

The module-private `readSrc(ref)` is the one place `meta.src` is read and the one place its
absence throws.

### Inputs → outputs

- **`readSrc`** throws when `meta.src` is absent, not a string, or empty. The message names the
  pair (`tile/asset`) and says that a misspelled key such as `"scr"` gets this far because
  validation does not look inside `meta`.
- **`defaultProvider(ref)`** returns `{ src: readSrc(ref) }` and ignores the rest of `meta`.
- **`prefixedProvider(prefix)`** trims **one** trailing slash from `prefix` and always adds one
  separator back:

  | `prefix` | `meta.src` | result |
  | --- | --- | --- |
  | `""` | `tiles/a.svg` | `/tiles/a.svg` |
  | `"/"` | `tiles/a.svg` | `/tiles/a.svg` |
  | `"/app"` | `tiles/a.svg` | `/app/tiles/a.svg` |
  | `"/app/"` | `tiles/a.svg` | `/app/tiles/a.svg` |
  | `"//cdn.example.com/"` | `a.svg` | `//cdn.example.com/a.svg` |

- **`assetKey` / `parseAssetKey`** split on the first `\0`. A string with no `\0` gives `null`.

### Invariants

- **The key is the pair, never `assetId` alone.** Asset ids are unique only within their Tile, so
  two Tiles may both hold `a1`. A provider keyed on `assetId` alone would resolve one to the
  other's picture "correctly and silently".
- **Resolution never substitutes.** A missing `meta.src` throws rather than passing `undefined`
  on, which would look like a *missing* file rather than a *malformed* one.
- **`\0` is unambiguous** because identifiers are limited to `[A-Za-z0-9_-]+` (cited as **C10**).
- **`readSrc` is synchronous**, so `prefixedProvider` does not have to await a value already in
  hand by composing through the async-capable public type.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/options.ts:32, 214` | `defaultProvider` is `DEFAULT_OPTIONS.provider`. |
| `render/Tileset.svelte:386, 404, 431, 849, 1195` | `assetKey` for `metaByKey`, the `drawables` memo, `loadFailed`, the canvas draw list, and the DOM `{#each}`. |
| `render/Tileset.svelte:656, 939` | `parseAssetKey` to recover the pair from a bank key for `onAssetError` and for the asset-size warning. |
| `render/Tileset.svelte:412` | Calls the resolved `provider(ref)`, inside a `try`. |
| `apps/editor/src/assets.ts:36, 136, 148, 201, 222, 238` | `assetKey` for the editor's asset store; the file also imports `AssetProvider`, `AssetRef`, `Drawable`. |
| `apps/editor/src/download.ts:21, 45, 69` | `assetKey` for exported bytes. |
| `apps/demo/src/App.svelte:35`, `Hosting.svelte:36`, `Responsive.svelte:30`, `Square2x2.svelte:48`, `Decorations.svelte:42`, `Kelp.svelte:23` | `prefixedProvider(…)`. |

Callees: none.

### Tests: `provider.test.ts`

- `defaultProvider` renames `meta.src` and ignores every other `meta` key.
- It throws `/no string \`meta\.src\`/` for an absent, misspelled (`scr`), non-string, `null` or
  empty `src`, and the message names the pair (`grass/a1`).
- `prefixedProvider` anchors at the root for `""` and `"/"`, joins SvelteKit-style (`/app`) and
  Vite-style (`/app/`) prefixes, never emits `//` for six prefix shapes, and leaves a
  protocol-relative prefix alone. It throws exactly as `defaultProvider` does.
- `assetKey` differs for `("water","a1")` and `("grass","a1")`.
- `parseAssetKey` round-trips a grid of permitted identifiers, the key contains no space, and
  `"grass a1"` and `""` give `null`.

### Gotchas & rejected alternatives

- **An empty prefix still emits the separator.** At the site root SvelteKit's `base` is `""` and
  Vite's `BASE_URL` is `"/"`. Treating `""` as *no prefix* would return the relative path this
  function exists to replace.
- **Only one trailing slash is trimmed**, so a protocol-relative `//host` survives.
- **Rejected: a `basePath` prop on `<Tileset>`.** It overlaps `provider` and would need a
  precedence rule. "One extension point that composes beats two that interact."
- **Why `parseAssetKey` exists.** Two call sites once split the key on `" "`, which it has never
  contained, so `assetId` came back `undefined`, a guard returned early, and a failed image decode
  reported nothing. "Nothing typechecked wrong and nothing threw."

### Review notes

- The test file header says `defaultProvider` "shipped untested". That is history; it is tested
  now. Not wrong, but it reads as a current statement.
