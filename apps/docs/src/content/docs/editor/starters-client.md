---
title: starters-client.ts
description: The starters manifest as the running editor fetches it. One shared fetch for New tileset and the Tile gallery.
sidebar:
  order: 87
---

**Written from:** `apps/editor/src/starters-client.ts`, and its call sites in
`lib/sections/NewTileset.svelte` and `lib/tiles/TileGallery.svelte`. No test file: it only binds
[starters.ts](/editor/starters/)'s tested loaders to the browser.

## Overview

[starters.ts](/editor/starters/) is pure: its loaders take a `fetch` and a base URL, so they can be
tested on an in-memory map. This module binds them once for the running app, to the real `fetch`
and Vite's `import.meta.env.BASE_URL`.

The [New tileset](/editor/new-tileset/) popup and the [Tile gallery](/editor/tile-gallery/) both
read the manifest through it, so between them they make one request per session.

## In detail

### Public surface

| Export | Type | Meaning |
| --- | --- | --- |
| `BASE` | `string` | The app's base URL, ending in `/`: where `public/` is served. Thumbnails and pictures are `BASE + path`. |
| `manifest` | `() => Promise<Manifest>` | `once(() => loadManifest(fetch, BASE))`. Fetched on first use, never at startup. A failed fetch is forgotten, so the next call retries. |

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/sections/NewTileset.svelte` | `manifest()` when From template is first chosen; `BASE` for the template thumbnails and `loadTemplate` |
| `lib/tiles/TileGallery.svelte` | `manifest()` when the gallery opens; `BASE` for the cell thumbnails and `loadGalleryFiles` |

Callees: `loadManifest`, `once` ([starters.ts](/editor/starters/)).

### Gotchas & rejected alternatives

- It lived in `NewTileset.svelte`'s `<script module>` until S3c. **Rejected:** a second `once` in
  the gallery, which would fetch the same file twice in a session that uses both popups.
- `fetch` is wrapped (`(url) => fetch(url)`) because the loaders' `Fetch` type takes only a URL.
