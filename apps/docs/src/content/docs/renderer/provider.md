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
key that every per-asset cache in the renderer uses. It also holds the renderer's own helpers for
calling a provider and for remembering which pictures failed to load. It sits between generation and drawing:
file → load → generate → **resolve** → draw.

## In detail

### Purpose

A `TileState` carries identifiers only. Resolution happens in the renderer, through a provider the
host passes in `options.provider`. This file fixes three things: the shape of what a provider
returns, the default way `meta.src` is read (and the loud failure when it is missing), and the
`(tileId, assetId)` key. It also holds the helpers `<Tileset>` uses to call a provider, to remember
what each key resolved to, and to track DOM load failures, so that logic can be tested as plain
`.ts`.

### Public surface

All re-exported from `render/index.ts:155-163`.

| Export | Kind | Meaning |
| --- | --- | --- |
| [`Drawable`](/api/render/interfaces/drawable/) | interface | `{ src: string }`. An object, not a bare string, so a later DPR-aware key can be added without breaking every provider. |
| [`AssetRef`](/api/render/interfaces/assetref/) | interface | `{ tileId, assetId, meta }`. `meta` is that `TileAsset`'s block, verbatim, and the renderer never reads it. |
| [`AssetProvider`](/api/render/type-aliases/assetprovider/) | type | `(ref: AssetRef) => Drawable \| Promise<Drawable>` |
| [`defaultProvider`](/api/render/variables/defaultprovider/) | `AssetProvider` | `{ src: meta.src }`. `<Tileset>`'s default. |
| [`prefixedProvider`](/api/render/functions/prefixedprovider/) | `(prefix: string) → AssetProvider` | `defaultProvider` with a base path joined in front. |
| [`assetKey`](/api/render/functions/assetkey/) | `(tileId, assetId) → string` | `` `${tileId}\0${assetId}` `` |
| [`parseAssetKey`](/api/render/functions/parseassetkey/) | `(key) → { tileId, assetId } \| null` | The inverse. `null` for a string that is not a key. |

Exported from the module but **not** from `render/index.ts`, so internal to the renderer:

| Export | Signature | Meaning |
| --- | --- | --- |
| `resolveDrawable` | `(provider, ref, report) → Drawable \| Promise<Drawable>` | Calls `provider(ref)` once and makes every failure reach `report`. |
| `recordLoadFailure` | `(failed, key, src) → Map<string, string> \| null` | The next key → failed-`src` map, or `null` if this `src` already failed for this key. |
| `loadBlocked` | `(failed, key, value, settled?) → boolean` | Whether a key's cell is not mounted at all: its provider rejected, or its `src` already failed to load. `settled` is `{ src: string \| undefined; rejected: boolean }`, what a promise settled to. |
| `DrawableCache` | class | `resolve(provider, ref, report)` is `resolveDrawable` remembered per key across re-derivations; `retain(live)` forgets every key not in `live`. |

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
- **`resolveDrawable(provider, ref, report)`** handles both ways a provider can fail:
  - **It throws.** The throw is reported on a microtask, not at once, because the caller is a
    `$derived`, and a host whose `onAssetError` writes `$state` (the editor's does) died with
    Svelte's `state_unsafe_mutation`. The throw is returned as a rejected promise, so the DOM
    `{#await}` still takes `{:catch}`. That promise is marked handled, because a key whose cells
    are all culled has no `{#await}` to handle it.
  - **It returns a promise that rejects.** Reported when it rejects. Before, only a synchronous
    throw was reported, so a lazy provider's failure was silent on both substrates.

  The promise handed back is the provider's own, not the reporting chain, so consumers still see
  the rejection and draw nothing (**R3**).
- **`recordLoadFailure(failed, key, src)`** returns a copy of `failed` with `key → src`, or `null`
  when `failed.get(key) === src`, so each failure is reported once and `$state` does not churn.
- **`loadBlocked(failed, key, value, settled?)`** is `false` for `undefined`. For a promise, whose
  `src` is not on the promise, it reads `settled`, which the component records as the promise
  settles: no `settled` (still pending) is `false`, a rejected one is `true`, and otherwise it is
  `failed.get(key) === settled.src`. For a plain drawable it is `failed.get(key) === value.src`.
  The whole `.cell` is unmounted, not only its `<img>`, because since 0.8.0 the drawn tile is the
  unit of hitting and an empty cell would still take a host's clicks.
- **`DrawableCache.resolve(provider, ref, report)`** returns the remembered value for
  `assetKey(ref.tileId, ref.assetId)` when both the provider and `ref.meta` are the same
  *identities* it was resolved from, and otherwise calls `resolveDrawable` and remembers the result.
  A reseed or a column change re-derives the drawables without touching an asset, so a failing
  provider is reported **once**, not on every reseed. This is **R2** held across derivations, not
  only within one.
- **`DrawableCache.retain(live)`** deletes every key `live.has` rejects. `<Tileset>` passes the
  keys the config holds, not the ones on the grid, so an asset culled for a frame keeps its
  resolution and does not report its failure twice.

### Invariants

- **The key is the pair, never `assetId` alone.** Asset ids are unique only within their Tile, so
  two Tiles may both hold `a1`. A provider keyed on `assetId` alone would resolve one to the
  other's picture "correctly and silently".
- **Resolution never substitutes.** A missing `meta.src` throws rather than passing `undefined`
  on, which would look like a *missing* file rather than a *malformed* one.
- **`\0` is unambiguous** because identifiers are limited to `[A-Za-z0-9_-]+` (cited as **C10**).
- **A load failure is a fact about one `src`.** The DOM substrate's record is keyed by `src` as
  well as by key, as canvas's `ImageBank` is. It used to be a set of keys, only added to, so an
  asset whose `<img>` failed once stayed unmounted even after the host changed `provider` or
  `file`. A new `src` for the key is a new attempt.
- **Every `onAssetError` report is asynchronous.** A host has one timing to allow for.
- **A key resolves again only when what it was resolved from changed:** the provider's identity
  or the `meta` object's identity. `<Tileset>` shares one frozen empty `NO_META` for assets without
  a `meta`, so they keep their identity across derivations.
- **`readSrc` is synchronous**, so `prefixedProvider` does not have to await a value already in
  hand by composing through the async-capable public type.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/options.ts:32, 214` | `defaultProvider` is `DEFAULT_OPTIONS.provider`. |
| `render/Tileset.svelte:395, 419, 457, 913, 1259` | `assetKey` for `metaByKey`, the `drawables` memo, `loadFailed`, the canvas draw list, and the DOM `{#each}`. |
| `render/Tileset.svelte:720, 1003` | `parseAssetKey` to recover the pair from a bank key for `onAssetError` and for the asset-size warning. |
| `render/Tileset.svelte:413-428` | `resolutions = new DrawableCache()`; the `drawables` memo calls `resolutions.retain(metaByKey)`, then `resolutions.resolve(provider, ref, reportAssetError)` for each key. |
| `render/Tileset.svelte:458` | `recordLoadFailure` in `handleLoadError`, from an `<img>`'s `onerror` or a failed size check. |
| `render/Tileset.svelte:1260` | `loadBlocked(loadFailed, key, drawables.get(key), settledFor(key, …))` to leave a cell unmounted when its `src` already failed or its provider rejected. |
| `apps/editor/src/assets.ts:37, 147, 250, 271, 287` | `assetKey` for the editor's asset store; the file also imports `AssetProvider`, `AssetRef`, `Drawable`. |
| `apps/editor/src/assets.ts:188, 198` | `parseAssetKey` in `heldTileIds` / `heldAssetIds`. |
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
- `resolveDrawable` passes a drawable through with no report; reports a synchronous throw only
  after a microtask, returns a rejected promise, and raises no `unhandledRejection` when nothing
  awaits it; reports a rejecting promise once and still hands back the same rejection; reports
  nothing for a promise that resolves.
- `recordLoadFailure` records once per `src` and records a new `src` for the same key;
  `loadBlocked` blocks only the `src` that failed and never a pending promise or `undefined`; it
  blocks a settled promise whose `src` failed or that rejected, and not one whose `src` is
  different.
- `DrawableCache` resolves a key once while its provider and `meta` are unchanged (one report for
  a throwing provider); resolves again for a new provider or a new `meta`; and calls the provider
  again after `retain` has forgotten the key.

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
