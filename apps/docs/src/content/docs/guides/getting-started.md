---
title: Getting started
description: From the editor's export to tiles on screen, in plain JS, Svelte, SvelteKit or Vite.
sidebar:
  order: 1
---

## Install

```sh
npm install @vit-foundation/gen-tilesets
```

**Pin the exact version.** The package is `0.x`, and a minor version may change the generated
output. `svelte@^5.20` is an optional peer dependency, needed only for `<Tileset>` and
`<TileDecoration>`. A Svelte app also needs `@sveltejs/vite-plugin-svelte`. A bare `svelte()` plugin
with no `svelte.config.js` is enough, because the package declares the `svelte` export condition.

## 1. Export the tileset from the editor

In the [editor](https://gen-tilesets-editor.vercel.app), press **Download tileset.zip** below the
sidebar's sections. The editor's asset store lasts only for the session. If you reloaded the page
after attaching your images, the export throws instead of shipping an archive with missing files.
Import your last zip again, then export.

The archive holds two things:

```
tileset.json
tiles/<tileId>/<assetId>.<ext>
```

The folders are nested because an asset id is unique only within its tile. **Every `meta.src` in the
JSON is a path relative to the archive root**, with no leading slash: `tiles/water/a1.svg`.

## 2. Put the two halves in your project

`tiles/` must be fetchable by the browser at `/tiles/…`. Move it as a single folder and keep its
internal structure exactly as it is. The JSON points at those paths, so flattening or renaming
anything inside breaks it without an error.

`tileset.json` is best imported, so it is bundled and cannot 404. It can also be fetched.

| Setup | `tiles/` | `tileset.json` |
| --- | --- | --- |
| SvelteKit | `static/tiles/` | `src/lib/tileset.json` |
| Vite (any framework, or none) | `public/tiles/` | anywhere under `src/` |
| Plain HTML, no bundler | served at `/tiles/` | served, and fetched |

## 3. Load it

```ts
import { loadTilesetFile } from "@vit-foundation/gen-tilesets";
import raw from "./tileset.json";

const file = loadTilesetFile(raw);
```

You can't skip this step. `loadTilesetFile` runs `migrate()` (to upgrade an older file) and then
`validate()`, and **throws** if either fails. A file from a newer version of the package gets a
message telling you to upgrade. The renderer itself does not validate, so in production an invalid
file is undefined behaviour. In a development build, `<Tileset>` and `TilesetRenderer` check the
file and throw if you skipped `loadTilesetFile`, naming the offending paths. That check is compiled
out of production builds.

The types point the same way: `TilesetFile.schemaVersion` is the literal type `4`, and a JSON import
widens it to `number`. Validation is what makes the cast safe.

**If you need more than a throw**, for example to show each error at its own path, call the two
functions directly: `import { migrate, validate } from "@vit-foundation/gen-tilesets"`. The editor
does this.

## 4. Render it

### Vanilla JS

```js
import { loadTilesetFile } from "@vit-foundation/gen-tilesets";
import { TilesetRenderer, prefixedProvider } from "@vit-foundation/gen-tilesets/render";

const file = loadTilesetFile(await (await fetch("/tileset.json")).json());
const renderer = new TilesetRenderer(document.querySelector("#hero"), {
  file,
  options: { provider: prefixedProvider("/") },
});
```

See [Without Svelte](/guides/without-svelte/) for `update()`, `destroy()`, Observable Framework and
wrappers for other frameworks.

### Svelte, SvelteKit

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { loadTilesetFile } from "@vit-foundation/gen-tilesets";
  import Tileset from "@vit-foundation/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type AssetRef } from "@vit-foundation/gen-tilesets/render";
  import { base } from "$app/paths";
  import raw from "$lib/tileset.json";

  const file = loadTilesetFile(raw);
  const provider = prefixedProvider(base);

  // Optional: report missing images.
  let failures = $state<string[]>([]);
  function onAssetError(ref: AssetRef, cause: unknown): void {
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<div class="frame">
  <Tileset {file} options={{ provider, onAssetError }} />
</div>

<style>
  /* The host sets the width. The tileset reserves its own height. */
  .frame { width: 100%; max-width: 900px; }
</style>
```

In a plain Vite app, import the JSON by relative path and pass Vite's base:

```ts
import raw from "./tileset.json";
const provider = prefixedProvider(import.meta.env.BASE_URL);
```

## Anchoring image paths

`provider` is optional. The default, `defaultProvider`, passes `meta.src` straight to the image. That
works only when the page is at the site root. `meta.src` is relative, so the browser resolves it
against the current page URL: on `/deep/page` it requests `/deep/tiles/water/a1.svg` and gets a 404.
Nothing reports this at build time.

`prefixedProvider(prefix)` anchors the paths. It accepts a prefix with or without a trailing slash,
so SvelteKit's `base` (`""` at the root, never a trailing slash) and Vite's `BASE_URL` (`"/"` by
default, always a trailing slash) both work. An empty prefix still anchors to `/tiles/…`. In
SvelteKit, `base` from `$app/paths` is correct at any route depth and under a sub-path deployment.

Both providers **throw** on a missing or non-string `meta.src` instead of substituting a placeholder.
A provider may also return a promise. The zip-based Observable example in
[Without Svelte](/guides/without-svelte/) relies on that. Create the provider once, not inline in
markup.

## Things worth knowing

- **It is deterministic by default.** With no `seed` and no `loadSalt`, you get the file's
  `defaultSeed` and `loadSalt = 0`: the same picture on every load and every machine. Variation is
  always something you ask for.
- **For a new picture on each load, draw `loadSalt` in a `load` function.** Don't draw it at module
  scope or during component init: under SSR both run twice and produce two different pictures for
  one page. A `load` function's return value is serialized to the client, so the server and
  hydration agree.
- **`onAssetError` is the only report of a missing image.** Nothing is substituted, so a tile whose
  file is missing draws an empty cell with no other sign.
- **An SVG asset must declare `width` and `height`**, not only a `viewBox`. An SVG without them has
  no natural size. Its cell stays empty, and `onAssetError` reports why.
- **Asset resolution.** An asset should have at least as many pixels as the largest cell it is drawn
  into, and a curved shape needs a cell of roughly 40 device pixels or more before its antialiased
  edge stops dominating it. A development build warns about both.
- **The styles load themselves.** A Svelte bundler picks up the component's CSS. Without one, the
  renderer adds a `<style>` at mount. See [Without Svelte](/guides/without-svelte/#the-stylesheet)
  for linking it yourself and for strict CSP.
