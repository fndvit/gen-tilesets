# `@fndvit/gen-tilesets`

The engine and the renderer. Ships unbuilt TypeScript through `exports` — consumers compile it.

```ts
import { generate, selection, validate, migrate } from "@fndvit/gen-tilesets";
import { cellBox, cellAt } from "@fndvit/gen-tilesets/render";
import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
```

## The engine

`generate(config, seed, loadSalt) → Grid<TileState>` is a **pure function**. Given the same
triple it returns a structurally identical result on any machine, in any runtime, at any time
(`02` **G1**).

It never receives a viewport, a device pixel ratio, a `cellSize`, an asset URL, or wall-clock
time (`02` §4.2, **G5**). Randomness is **positional hashing**, not a sequential PRNG, so resize
is stable and per-operation reroll is possible (`02` §6.1).

`generate()` **trusts its input.** `validate()` is a separate function and is not on the
critical path (**C5**). `migrate()` runs *before* `validate()`, because rewriting a version is a
coercion and `validate()` never coerces.

## The renderer

`<Tileset file={...} seed? loadSalt? provider? onAssetError? substrate? />` — one component, one
entry point (**S1**). It takes a parsed `TilesetFile` and calls `generate()` itself; nothing
here accepts a bare grid.

`substrate` defaults to `"canvas"`, where the render box **is** the `<canvas>` — one element, no
per-cell nodes, so no host-page CSS can open a seam between adjacent tiles. `"dom"` keeps one
`<img>` per cell from the same snapped edges and is what SSR emits. See ADR-006.

`cellBox` and `cellAt` are exported as pure functions rather than component methods, because
there is exactly one coordinate mapping and every overlay shares it (**R1**).

## Layout

See `/ARCHITECTURE.md` for the module map. Specs are in `/spec`; `02`–`08` bind this package.

`vignette` is specified in `04` §5.2 and deliberately **not registered** — see the header of
`src/registry/sources.ts`.

## Scripts

`pnpm test` · `pnpm test:watch` · `pnpm typecheck`

Tests assert **properties**, never fixed expected values. The vector tables of `05` §11 and
`07` §11.3 do not exist yet — read `/spec/FREEZE.md` before generating any.
