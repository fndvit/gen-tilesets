---
title: starters.ts
description: The ready-made content the editor ships, templates and the tile gallery. The manifest's shape and parser, and the loaders that fetch a template or gallery pictures on demand.
sidebar:
  order: 84
---

**Written from:** `apps/editor/src/starters.ts`, `starters.test.ts`, and the files under
`apps/editor/public/` (`starters.json`, `templates/collage/`). The
[New tileset](/editor/new-tileset/) popup and the [Tile gallery](/editor/tile-gallery/) use it,
through [starters-client.ts](/editor/starters-client/).

## Overview

The editor ships content a new user can start from, so nobody needs their own pictures to try it:

- **Templates** are whole tilesets that New can open. The first is **Collage**.
- **The tile gallery** is a set of single pictures the user can add as a tile group, or as
  variants of one.

Both are listed in one file, `starters.json`. This module describes that file, checks it, and
fetches what it points at. Nothing is downloaded when the editor starts. The list is fetched when
a popup that needs it opens. A template's files are fetched when it is chosen, and a gallery
picture's full file when it is added. Until then, the popups show small committed thumbnails.

## In detail

### The content on disk

```
apps/editor/public/
  starters.json
  templates/collage/
    tileset.json            the template, in export layout
    tiles/tN/aN.svg         21 pictures
    thumb.webp              192 × 120, the template's picture
    thumbs/tN-aN.webp       104 × 104, one per gallery picture
```

Collage comes from `../tileset-files/picsBackground`. Its `tileset.json` was migrated with the
package's own `migrate()` (2 → 4, which changed only `schemaVersion`). No version number was
written by hand (**E2**). It has 6 tile groups, 21 pictures and 5 operations.

The gallery points into Collage's files rather than copying them. The manifest is what keeps the
two apart: when the gallery grows past Collage, its new entries point somewhere else.

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `MANIFEST_PATH` | const | `"starters.json"`, relative to the app's base URL. |
| `TemplateEntry` | interface | `{ id, label, path, thumb, summary }`. `path` is the template's folder and ends in `/`. `summary` is the muted line, e.g. "6 tile groups · 5 operations". |
| `GalleryEntry` | interface | `{ id, label, src, thumb }`. `label` ("Blue 1") is the cell's **accessible name only**; the cells show no visible label (Pol, 2026-11-09). |
| `Manifest` | interface | `{ templates, gallery }`. |
| `Fetch` | type | The part of `fetch` the loaders use. The real one fits. |
| `parseManifest(json)` | function | Checks the shape and returns only the typed fields. Throws on anything malformed, naming the field: `starters.json: templates[0].label must be a non-empty string`. A repeated id and a template `path` without a trailing `/` are refused too. |
| `loadManifest(fetch, base)` | async function | Fetches `base + "starters.json"` and parses it. Throws on HTTP failure or bad JSON. |
| `loadTemplate(entry, fetch, base)` | async function | Returns an `Archive`, the same map an exported zip unpacks to, so it opens through `prepareArchive` and `adopt`. Throws on any failed fetch, naming the URL. |
| `GalleryFiles` | interface | `{ files: File[], failures: string[] }`. |
| `once(load)` | function | A loader that runs once and is then shared; a **rejected** load is forgotten, so the next call retries. [starters-client.ts](/editor/starters-client/) holds the manifest in one, and the Tile gallery holds My tiles' shelf in another. |
| `loadGalleryFiles(entries, fetch, base)` | async function | The picked pictures as `File`s in pick order, named `<id><ext>` ("t1-a1.svg"). A failed picture is a line in `failures`, named by its label, and the rest still arrive. |

`base` is the app's base URL ending in `/`, i.e. `import.meta.env.BASE_URL` at the call site.

### How `loadTemplate` knows what to fetch

It fetches `tileset.json` first and puts it alone in an `Archive`. Then it asks
[`readArchive`](/editor/import/) which pictures are **missing** from it, and fetches each one
once. That reuses import's walk of `meta.src`, so a template fetches exactly what an import
would look for, and there is no second walk to drift.

### Failure is loud

- **A template** is a document. A missing picture would open it with a hole the author did not
  make and cannot repair. So any failed fetch throws, and the caller reports it in the "Import
  refused" popup. Nothing is substituted.
- **The gallery** adds pictures one by one, like a drop of several files. A failure is per
  picture. If every picture fails, the caller shows a popup; if some do, the attach-failure
  notice names them (DESIGN_SYSTEM.md, Tile gallery).

### Re-encoding the pictures

Collage's original SVGs each wrap one embedded PNG (294–852 px, 10.8 MB in total; `t6/a1` is a
flat colour with no picture). Each PNG was re-encoded as **WebP, quality 90, at the same pixel
size**, and only the data URI changed; the SVG markup is untouched. The total is 0.86 MB, and
`public/` is 984 KB with the thumbnails.

How it was checked, so it can be repeated for new pictures:

1. Compare the decoded original and re-encoded pixels with `pixelmatch`, threshold 0.1, at the
   PNG's native size (the strictest case, since Collage draws cells at 80 px) and again scaled
   to 160 px. An image is accepted only if **0.1 % of its pixels or fewer** differ. All 20 passed
   at q90 with 0 %. (Lossless WebP was also checked by rendering each SVG before and after in
   headless Chromium: 0 pixels differed.)
2. A stricter measure, since threshold 0.1 forgives small shifts: q90 changes most pixels
   slightly. PSNR was 40–51 dB, and the worst channel change was 28/255 (`t4/a1`).
3. Pol compared every picture side by side and chose q90 (S3a). Lossless WebP was
   pixel-identical but 5.7 MB, and was rejected for size.

The scripts live in a session scratchpad, not the repo. They use `sharp`, `pixelmatch`, `pngjs`
and `playwright-core`, all already in `node_modules`.

**Thumbnails:** a gallery thumbnail is Chromium's render of the original SVG, scaled to 104 px
square (52 px at 2×), WebP q85. The template's thumbnail is the editor's own **Export image** of
Collage at the design width, 2×, centre-cropped to 192 × 120 (96 × 60 at 2×). It is never drawn
live, because that would fetch the whole template to show a picture.

### Tests: `starters.test.ts`

- `parseManifest` accepts a good manifest and drops unknown keys. It refuses, naming the field: a
  non-object, missing `templates`, a missing label, an empty string, a path without `/`, and a
  repeated id.
- `loadManifest` fetches under the base URL, and throws on a 404 and on bad JSON.
- `loadTemplate` builds an archive that `prepareArchive` readies. It fetches a shared picture
  once, and throws naming the missing URL.
- `once` shares one run between concurrent and later calls, and retries after a rejection.
- `loadGalleryFiles` keeps pick order, names files by id, and reports a 404 by label while the
  rest arrive.
- **The committed starters**, read from `public/` through the same loaders: every template is at
  the current `SCHEMA_VERSION`, validates, needs no upgrade, has every picture and its thumbnail,
  and its `summary` matches its counts. Every gallery picture and thumbnail exists. A future
  schema bump fails here until the template is migrated again, with `migrate()`.

### Gotchas & rejected alternatives

- **Rejected: fetching at startup.** The editor's whole build is a few hundred KB, and Collage is
  about 1 MB.
- **Rejected: naming gallery files by the source basename.** Every group has an `a1.svg`, so a
  failure notice could not say which picture it meant.
- **Rejected: a name field in `TilesetFile`.** It has none, so a template's name lives in the
  manifest's `label`, and its id in the folder name.
