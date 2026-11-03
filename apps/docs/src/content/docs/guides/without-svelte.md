---
title: Without Svelte
description: The renderer as a plain class, in a plain page, in Observable Framework, and wrapped for React.
sidebar:
  order: 6
---

`<Tileset>` is a thin wrapper over a plain class, and the class is exported. A plain HTML page,
Observable Framework or another framework uses the same implementation:

```js
import { TilesetRenderer } from "@vit-foundation/gen-tilesets/render";

const renderer = new TilesetRenderer(element, { file, options }); // draws into element
renderer.update({ options: { ...options, seed: "b" } });          // any change; omitted fields keep their value
renderer.box;                                                     // the render box, for pointer conversion
renderer.destroy();                                               // removes everything it added
```

`file` and `options` are exactly `<Tileset>`'s props, so every other guide applies unchanged.
`TileDecorationRenderer` is `<TileDecoration>` the same way:
`new TileDecorationRenderer(element, { style, rows, columns, cellSize, options })`. Nothing on this
page imports `svelte`, and the built renderer has no bare imports, so it loads without a bundler.

## Observable Framework

Add the package to the project (`npm install @vit-foundation/gen-tilesets`) and put the editor's
export zip in `src/` as it is. A page:

````md
```js
import {loadTilesetFile} from "@vit-foundation/gen-tilesets";
import {TilesetRenderer} from "@vit-foundation/gen-tilesets/render";

// The editor's export, as it comes: tileset.json beside a tiles/ folder.
const zip = await FileAttachment("atlas.zip").zip();
const file = loadTilesetFile(await zip.file("tileset.json").json());
// Each asset's meta.src is a path inside the zip. A zip entry has no MIME type,
// and a browser will not draw an SVG blob without one, so set it.
const TYPES = {svg: "image/svg+xml", png: "image/png", webp: "image/webp", jpg: "image/jpeg"};
// One blob URL per file, shared by every tileset on the page.
const urls = new Map();
const provider = (ref) => {
  const path = ref.meta.src;
  if (!urls.has(path)) {
    const type = TYPES[path.split(".").pop()];
    urls.set(path, zip.file(path).arrayBuffer().then((bytes) => URL.createObjectURL(new Blob([bytes], {type}))));
  }
  return urls.get(path).then((src) => ({src}));
};
```

```js
// `invalidation` is per block, so the block that displays the tileset passes its own.
function tileset(options, invalidation) {
  const host = html`<div>`;
  const renderer = new TilesetRenderer(host, {file, options: {provider, ...options}});
  invalidation.then(() => renderer.destroy());
  return host;
}
```

```js
display(tileset({substrate: "canvas"}, invalidation));
```
````

Three things are specific to Framework:

- **Use the zip, not a `tiles/` folder.** Framework publishes only files that a page names
  literally. The asset paths are chosen at runtime, so a folder of tiles would not be copied. The
  provider may return a promise, so reading from the zip on demand is fine.
- **Set the MIME type.** Without it, every SVG fails to decode (`EncodingError`) and nothing draws.
  The failure reaches `options.onAssetError` and nowhere else.
- **Pass the displaying block's `invalidation`.** Framework gives each block its own. The helper's
  block never re-runs, so a renderer tied to the helper's `invalidation` would never be destroyed,
  and its observers would keep running on detached boxes.

## The stylesheet

The renderer needs `tileset.css`. **You don't have to do anything:** when a renderer is built, it
injects the rules into the page (or the shadow root), unless they already reach it. Link the file
yourself when you want the rules in place before any script runs, or when a strict CSP blocks inline
styles:

- **With a bundler** (Vite, webpack): `import "@vit-foundation/gen-tilesets/tileset.css";`. With
  TypeScript, that line needs a declaration for `*.css` in your project. Vite's templates already
  have one (`/// <reference types="vite/client" />`).
- **In Observable Framework**, copy `node_modules/@vit-foundation/gen-tilesets/dist/render/tileset.css`
  into `src/` and add `<link rel="stylesheet" href="./tileset.css">` to the page. Framework turns a
  CSS `import` from `node_modules` into a module import that the browser refuses.
- **Anywhere else**, serve the file and `<link>` it.

The renderer recognises a linked copy of the same version and adds nothing. `injectStyles(element)`
and `TILESET_CSS` are exported for a host that wants the rules in a specific place first.

**Under a strict CSP** (`style-src` without `'unsafe-inline'`), the injected `<style>` is blocked.
The renderer adopts a constructed stylesheet instead. That stylesheet cascades after yours, so an
override needs one more class or attribute than the rule it overrides. Under such a policy, tilesets
with responsive rules also lose the height they reserve before measurement. Linking the stylesheet
avoids both problems.

## A wrapper for another framework

A wrapper is about ten lines: build on mount, `update()` on change, `destroy()` on unmount. In React:

```tsx
import { useEffect, useRef } from "react";
import type { TilesetFile } from "@vit-foundation/gen-tilesets";
import { TilesetRenderer, type TilesetOptions } from "@vit-foundation/gen-tilesets/render";

export function Tileset({ file, options }: { file: TilesetFile; options?: TilesetOptions }) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<TilesetRenderer | null>(null);
  useEffect(() => {
    renderer.current = new TilesetRenderer(host.current!, { file, options });
    return () => renderer.current?.destroy();
  }, []);
  useEffect(() => renderer.current?.update({ file, options }), [file, options]);
  return <div ref={host} data-tileset-wrapper="" style={{ display: "contents" }} />;
}
```

`update()` with unchanged values regenerates nothing, so an inline `options={{…}}` that is a new
object on every render costs a comparison, not a redraw. The wrapper works under `StrictMode`, which
mounts, destroys and remounts every effect. Keep both attributes on the host:

- **`display: contents`**, so the host has no box of its own and the tileset sizes against your
  layout. A plain block `<div>` collapses in a shrink-to-fit parent such as a flex row.
- **`data-tileset-wrapper`.** `options.avoid` selectors resolve in the nearest ancestor of the
  tileset that the package did not add. Without the attribute, that ancestor is this `<div>`, which
  holds no headings, so nothing would be avoided. The attributes you can select on are listed on the
  [DOM hooks](/renderer/dom-hooks/) page.
