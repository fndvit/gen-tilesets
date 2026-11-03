# gen-tilesets

Procedural tilesets for the web: design one in the editor, export it, and draw it in any page.

![A generated tileset filling a page header](packages/tileset/docs/images/hero.png)

- **[Editor](https://gen-tilesets-editor.vercel.app)**: design which tiles exist and the rules that
  place, rotate, scale and fade them across a grid. Export a zip.
- **[`@vit-foundation/gen-tilesets`](packages/tileset)**: the package that draws the export. It is
  deterministic, scales with its container, changes shape at breakpoints and keeps clear of the text
  laid over it. **Start with [its README](packages/tileset/README.md).**

## What's in this repository

| Path | What |
| --- | --- |
| [`packages/tileset`](packages/tileset) | `@vit-foundation/gen-tilesets`, the engine and renderer. The only published package. |
| [`apps/editor`](apps/editor) | The editor. |
| [`apps/docs`](apps/docs) | The documentation site, including the [guides](apps/docs/src/content/docs/guides). |
| [`apps/demo`](apps/demo) | Fixture pages for the renderer, and the page the README's images are shot from. |

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @vit-foundation/tileset-editor dev   # editor on :5174
pnpm --filter @vit-foundation/tileset-demo dev     # demo on :5173
```

[`ARCHITECTURE.md`](ARCHITECTURE.md) explains how the code is laid out, and
[`CHANGELOG.md`](CHANGELOG.md) what changed per version. Releasing is in
[`packages/tileset/RELEASING.md`](packages/tileset/RELEASING.md).
