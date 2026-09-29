# `@fndvit/gen-tilesets`

The engine and the renderer. The **only published package** in this repository.

To **render** a tileset you need two imports, and no more:

```ts
import { loadTilesetFile } from "@fndvit/gen-tilesets";
import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
```

```svelte
<Tileset file={loadTilesetFile(raw)} />
```

That is the whole of it at the site root. `<Tileset>` calls `generate()` itself and resolves assets
through a default provider; off the root you add one more import, `prefixedProvider`, and that is
still the whole of it. The rest of the surface is for a host that builds *tooling* on top — an
overlay, a brush, a validator — and it lives on two different subpaths:

- `@fndvit/gen-tilesets` — the engine: `generate`, `selection`, `loadTilesetFile`, and the
  `validate`/`migrate` pair it is built from.
- `@fndvit/gen-tilesets/render` — the geometry: `cellBox`, `cellAt`.

`cellAt`'s only caller in this repository is the editor's brush, and `cellBox` has no caller
outside this package at all. Reach for them when you are building an editor, not to draw a
picture.

## How to use it

Six steps, from nothing to tiles on screen. Every snippet in steps 5 and 6 is copied out of a
working app — see *Verified* at the end.

### 1. Get a token

The package is published privately to **GitHub Packages** under the `fndvit` org, so installing it
needs a token.

On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic)**, with the
`read:packages` scope. It must be a **classic** token — GitHub Packages' npm registry does not
accept fine-grained ones. Then put it in your shell profile:

```sh
export GITHUB_TOKEN=ghp_…
```

Org members with read access to this repository get read access to the package automatically, so
there is no per-person grant to request.

### 2. Install the package

Add this to the consuming project's `.npmrc` — **commit it**; the token comes from the
environment, never from the file:

```ini
@fndvit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
pnpm add @fndvit/gen-tilesets@0.1.1 svelte
```

- **Pin the exact version.** `0.x` promises nothing about output stability (`/CLAUDE.md`), so a
  range is a promise this package does not make.
- **Peers.** `svelte@^5` is a peer dependency, and the consuming app needs
  `@sveltejs/vite-plugin-svelte`. Nothing further: the published `exports` declare the `svelte`
  condition, so a bare `svelte()` plugin with **no `svelte.config.js` at all** resolves and
  compiles `Tileset.svelte`. This is verified, not assumed — see *Publishing* below.
- **CI in the consuming repo** needs the same `.npmrc` plus a token in its secrets.

### 3. Export the tileset from the editor

In the editor, the export button is pinned below the sidebar's sections, labelled
**"Download tileset.zip"**. Press it and you get `tileset.zip` — always that name.

One thing to know before you press it: the editor's asset store is **session-scoped**. If you
reloaded the page since attaching your images, the export throws rather than shipping a folder
that is quietly missing files; re-import your last zip first, then export.

The archive holds two things:

```
tileset.json
tiles/<tileId>/<assetId>.<ext>
```

Nested, not a flat folder, because `TileAsset.id` is unique only *within its Tile* — two Tiles may
each hold an asset called `a1`, and a flat folder would silently overwrite one with the other.

**Every `meta.src` in the JSON is a path relative to the archive root**, with no leading slash:
`tiles/water/a1.svg`. That one detail drives everything below.

### 4. Unzip it and move the two halves into your project

They go to different places, and only one of them is served. **`tiles/` moves whole, as a single
folder — you never place assets one by one:**

```
tileset.zip
├── tileset.json   →  move the file    →  <your-app>/src/lib/tileset.json
└── tiles/         →  move the folder  →  <your-app>/static/tiles/
```

So the archive's `tiles/water/a1.svg` ends up at `<your-app>/static/tiles/water/a1.svg`, and the
browser fetches it from `/tiles/water/a1.svg`.

| Half | Where | Why |
| --- | --- | --- |
| `tiles/` | `static/tiles/` | must be fetchable by the browser at `/tiles/…` |
| `tileset.json` | `src/lib/tileset.json` | **not** served — you `import` it, so it is bundled, needs no fetch, and cannot 404 |

Keep the folder's internal structure exactly as it came. The export writes each file at the path
it read out of `meta.src`, so the JSON points at `tiles/water/a1.svg`; flattening or renaming
anything inside breaks that silently. Moving the folder as-is is what keeps it true without your
having to think about it.

### 5. Load it — one call

You cannot skip this. `<Tileset>` imports no validator, so in a production build a file
`validate()` would reject is **undefined behaviour** (**S3**, as **C5**). The types push you the
same way: `TilesetFile.schemaVersion` is the literal type `2`, so a JSON import (which widens it to
`number`) never assigns to `TilesetFile` directly. Validation is what earns the cast, and
`loadTilesetFile` is what performs it:

```ts
// src/routes/+page.svelte — or wherever you hold the file
import { loadTilesetFile } from "@fndvit/gen-tilesets";
import raw from "$lib/tileset.json";

const file = loadTilesetFile(raw);
```

It runs `06`'s `migrate()` and then `validate()` — in that order, because rewriting a
`schemaVersion` is a coercion and `validate()` never coerces — and **throws** on either failing. A
file from a newer build of the package gets its own message telling you to upgrade rather than a
list of shape errors against a schema it was not written for.

*In a development build, `<Tileset>` now checks this for you and throws if you skipped it*, naming
the offending paths. In production it does not: the check compiles out entirely, so the cost is
paid where the mistake is made and nowhere else.

**If you need more than a throw**, use the two functions underneath directly. `loadTilesetFile`
discards the migration steps and the structured `ValidationError[]`, which is exactly what an
editing host cannot afford — it wants to show *"upgraded from schemaVersion 1"* as an advisory and
report each error at its own path. That is what `apps/editor` does, and nothing about that path
changed:

```ts
import { migrate, validate } from "@fndvit/gen-tilesets";
```

### 6. Anchor the asset paths, and render

**`provider` is optional.** It defaults to `defaultProvider`, which reads `meta.src` and hands it
to an `<img>`. If your assets are served at exactly the paths `meta.src` names *and* your page is
at the site root, pass nothing — `apps/demo` in this repository does precisely that.

Everywhere else you need a prefix, and the reason is worth knowing because nothing reports it.
`meta.src` is **relative**, so the browser resolves it against the *current page URL*. On `/` that
happens to be right. On `/deep/page` the browser asks for `/deep/tiles/water/a1.svg` and gets a
404 — with no build error and no type error, because nothing here is wrong at compile time.

`prefixedProvider` anchors it:

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  // `AssetRef` is only for the optional `onAssetError` below.
  import { prefixedProvider, type AssetRef } from "@fndvit/gen-tilesets/render";
  import { base } from "$app/paths";
  import raw from "$lib/tileset.json";

  const file = loadTilesetFile(raw);
  const provider = prefixedProvider(base);

  // `onAssetError` is OPTIONAL — everything below is. Drop it and the render is
  // still correct; you just get no report when a picture is missing, because
  // nothing is substituted and nothing returns null. `<Tileset {file}
  // {provider} />` is the whole of the required form.
  let failures = $state<string[]>([]);

  function onAssetError(ref: AssetRef, cause: unknown): void {
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<div class="frame">
  <Tileset {file} {provider} {onAssetError} />
</div>

<!-- Optional, with the handler above: somewhere to show what failed. -->
{#if failures.length > 0}
  <ul>{#each failures as f (f)}<li>{f}</li>{/each}</ul>
{/if}

<style>
  /* The host owns the width. The component declares its own aspect ratio and no
     height, so nothing here sets one and there is no layout shift. */
  .frame { width: 100%; max-width: 900px; }
</style>
```

Use `base` from `$app/paths` rather than a hardcoded `/`. SvelteKit computes it **per route**
(`paths.relative` defaults to `true`), so the same call is correct at any route depth *and* under a
sub-path deployment. You do not need to special-case the root: at `/`, `base` is `""`, and
`prefixedProvider` still anchors to `/tiles/…` rather than handing back the relative path.

Like `defaultProvider`, it **throws** on an absent or non-string `meta.src` rather than
substituting a placeholder, because resolution never substitutes — a missing picture must reach you
through `onAssetError`, not become a wrong picture.

That is the whole integration.

### If you are not using SvelteKit

Plain Vite + Svelte 5 works with the same six steps and no aliases, no `optimizeDeps` entries and
no extra plugins. Two things differ.

**Where the two halves go** — `public/` instead of `static/`, and `tileset.json` anywhere under
`src/`:

```
tileset.json   →  move the file    →  <your-app>/src/tileset.json
tiles/         →  move the folder  →  <your-app>/public/tiles/
```

Again `tiles/` moves whole, so `tiles/water/a1.svg` lands at
`<your-app>/public/tiles/water/a1.svg` and is served at `/tiles/water/a1.svg`.

**The prefix and the import.** Pass Vite's base instead of SvelteKit's, and import the JSON by
relative path rather than through `$lib`:

```ts
const provider = prefixedProvider(import.meta.env.BASE_URL);
import raw from "./tileset.json";
```

The two bases differ by a slash — SvelteKit's `base` carries none, `BASE_URL` always does (`"/"` by
default) — and `prefixedProvider` normalises both, so this is the only change. Vite handles JSON
imports natively, so steps 5 and 6 are otherwise unchanged.

### Five things worth knowing

- **It is deterministic by default.** With no `seed` and no `loadSalt` you get
  `seed = file.config.defaultSeed` and `loadSalt = 0` — the same picture on every load, every
  machine, forever (**S4**). Variation is always something you ask for.
- **If you want per-load variation, draw `loadSalt` in a `load` function.** Never at module scope
  or in component init: both run twice under SSR and give you two different pictures for one page.
  A `load` return value is serialized to the client, so server and hydration agree.
- **`substrate` defaults to `"canvas"`.** All three substrates compute the same uniform square cell,
  so a cell is square by construction, neighbours share an edge, and the centre-crop has nothing to
  remove. Take `"canvas"` unless you need something it cannot do: it is one element with no per-cell
  nodes, so no host-page CSS can reopen a seam, and the residual becomes one isotropic resample of
  one bitmap. Its cost is that it emits an empty box of the right ratio during SSR and fills it after
  mount. Pass `substrate="dom"` if you need the tiles present in the server-rendered HTML or need to
  hit-test individual cells — its cost is that the grid does not fit its box exactly, so it always
  overhangs slightly at the sides and the outer columns are cut; its box is also a few pixels taller
  than the natural height, because it sizes itself to the grid rather than cutting the bottom row.
  Pass
  `substrate="svg"` only if you want maximum crispness and can accept visible seams at every cell
  boundary; it is measured as the seamiest of the three by a wide margin.
- **`onAssetError` is the only report of a missing picture.** Nothing is substituted and nothing
  returns null, so a tile whose file is absent draws an empty cell silently unless you wire this.
- **`<Tileset>` validates its `file` in a development build, and throws.** It is keyed on the file,
  so it runs when the file changes rather than per frame, and it compiles out of a production build
  along with the validator itself. If it fires, the fix is `loadTilesetFile` — the message says so.
  The production posture is unchanged: there, an invalid file is still undefined behaviour.

### Verified

The SvelteKit snippets above were extracted from a SvelteKit 2 app built for the purpose,
installing `@fndvit/gen-tilesets` **from the registry**: `svelte-check` reports 0 errors and 0
warnings, and `vite build` succeeds. The path trap is not hypothetical — the same page on
`/deep/…` with the default provider server-renders `src="tiles/water/a1.svg"` and 404s, and with
`prefixedProvider(base)` renders `src="../tiles/water/a1.svg"`, which resolves to
`/tiles/water/a1.svg` and returns 200.

The **plain Vite variant** was checked separately, against a throwaway Vite 8 + Svelte 5 app
installing the packed tarball with no `svelte.config.js` and no aliases: `vite build` succeeds and
`svelte-check` reports 0 errors and 0 warnings, over a `tileset.json` and a `tiles/` folder in the
export's own layout. The slash claim is measured, not reasoned — under `--base=/deep/`,
`import.meta.env.BASE_URL` is `/deep/`, and `prefixedProvider` trims the trailing slash before
joining, so the result is `/deep/tiles/water/a1.svg` and not `/deep//tiles/…`.

**The development check is measured too, in both directions.** `prefixedProvider`'s join is
covered across `""`, `"/"`, `"/app"` and `"/app/"` by `src/render/provider.test.ts`, and the
`loadTilesetFile` sequence by `src/load.test.ts`. That the check *leaves* a production build is a
build-output assertion rather than a claim: `apps/demo` compiled for production contains no string
from `validate.ts` at all, and the bundle is 58.56 kB where the same build with an unfoldable
`DEV` was 68.77 kB. `src/dev.ts` records how to re-measure it, and why the expression is shaped
the way it is.

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

**One geometry, three presentations.** All three substrates compute the same uniform square cell —
`scaleFactor * cellSize * dpr`, quantised to one integer on both axes. That is what makes the
picture correct: a cell is square by construction, so the centre-crop of **R8** has nothing left to
remove, and neighbours share an edge, so a gap is unrepresentable. They differ only in where the
quantisation residual goes.

| `substrate` | Residual goes to | Take it for |
| --- | --- | --- |
| `"canvas"` (default) | one isotropic resample of one bitmap, where no internal edge exists to seam | **proportion.** No chord, exact quarter turns, no gaps at any cell size, and seamlessness no host CSS can undo |
| `"dom"` | the **box** — sideways the grid overhangs and is clipped, so the outer columns are cut; vertically the box takes its height from the grid, so nothing is | **interactivity**, and SSR. The only one you can hit-test per cell |
| `"svg"` | nowhere — there is no per-cell layout rounding to distribute | **crispness**, if you can accept a backdrop hairline at every shared edge |

`"canvas"` and `"svg"` round the cell to nearest, because the presentation cancels the quantisation
and only its magnitude is left to minimise. `"dom"` rounds **up**: it has no presentation to cancel
anything, so the grid always covers its box and the cut is the whole residual. Rounding to nearest
there left the sign free, and about half of all widths came out a band of page backdrop down each
side instead.

Vertically `"dom"` cuts nothing at all: after measuring, its box takes its height from the grid it
contains rather than from the declared ratio, so the bottom row is always flush. The box can end up
to `rows` device px taller than the natural height — which `naturalHeight` has always called a
default rather than a constraint, and which host CSS can still override.

Two rules about assets follow from the geometry rather than from this package, and both are real:
an asset must carry **at least as many pixels as the largest cell it is drawn into** (upscaling
cannot invent detail), and a curve needs a cell of roughly **40 device pixels or more** before its
antialiased edge stops being a large fraction of the shape. A development build warns about both.
[`SUBPIXEL-GEOMETRY.md`](https://github.com/fndvit/gen-tilesets/blob/main/SUBPIXEL-GEOMETRY.md)
records the whole investigation, including four theories about browser rendering that turned out to
be false.

`cellBox` and `cellAt` are exported from `@fndvit/gen-tilesets/render` — not from the root entry,
which is engine-only — as pure functions rather than component methods, because there is exactly
one coordinate mapping and every overlay shares it (**R1**).

## Decorations

A page usually wants more than one tileset: a couple of tailor-made ones, **plus** a scattering of
small tile blocks around it — a 2x2 in a corner, a stepped 3x4 beside a heading, an L of three
cells under a photo. A dozen of those are one visual language and differ only in how many cells
they occupy.

They do **not** need a dozen files. Author one *decoration style* and place it as many times as
you like:

```svelte
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import TileDecoration from "@fndvit/gen-tilesets/TileDecoration.svelte";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";

  const provider = prefixedProvider(import.meta.env.BASE_URL);
  const style = loadTilesetFile(raw);
</script>

<TileDecoration {style} {provider} rows={3} columns={2} cellSize={44} seed="board-tl" />
<TileDecoration {style} {provider} rows={2} columns={4} cellSize={44} seed="board-br" />
```

Each placement declares `rows`, `columns` and `cellSize`, and shares the style's `tiles`,
`operations` and assets — by reference, so there is nothing to drift. `rows`/`columns`/`layout` in
the style file itself are placeholders that every placement overrides.

**`seed` is what makes two decorations of the same size differ.** `generate()` is pure in
`(config, seed, loadSalt)`, so a distinct string per spot re-rolls every Operation and the asset
walk alike. Two spots with the same size and the same seed are the same picture, deliberately.

### A style must be reusable at any size

One constraint, and it is checkable:

- **No `rect` and no `cellList` Selection.** Both are `coordinateBound` — they hold literal cell
  coordinates, which mean nothing in a 3x2 spot. `decorationStyleErrors(style)` returns one message
  per offending Operation, and `<TileDecoration>` throws on a non-empty result **in a development
  build**, so this fails loudly rather than drawing a plausible wrong picture. Use `all`,
  `checkerboard`, `everyNth` and `random`.
- **Put a `{tileId: null}` entry in a palette.** That is `04` §6.3's "clear this cell", and it is
  where each spot's silhouette comes from — emptiness is *generated* from the seed rather than
  painted per spot, which is what removes the need for a mask. Not enforced: a style without one is
  a solid block, which is a legitimate decoration.
- **`gradient` renormalizes per decoration.** It takes its domain from the Selection's extent,
  which under `selection: {type: "all"}` is the grid — so a ramp authored across 40 columns becomes
  a 3-step ramp in a 3-column spot. Legal and sometimes wanted; know that it is happening.
  `valueNoise` does *not*: it samples grid-absolute coordinates, so its feature size in cells is
  invariant and a decoration keeps the grain of the tileset it was authored beside.

### What you get for free

A decoration is the **zero-bleed** case, and that is not a coincidence — `decorationFile` derives
`referenceWidth` as `columns * cellSize` and zeroes `yOffset`, because a small block of whole cells
in a margin has no design for a bleed to belong to. Three exactnesses follow by construction rather
than by care: `originX` is exactly 0, the scale is exactly 1, and the canvas presentation scale is
exactly 1 at integer DPR. **`SUBPIXEL-GEOMETRY.md`'s whole subject is absent here** rather than
merely small — measured in a browser at DPR 1 and 2, and asserted in `src/decoration.test.ts`
rather than believed.

The box sizes itself to `columns * cellSize` px with `max-width: 100%`, so a decoration wider than
a phone shrinks rather than opening a horizontal scrollbar; the tiles just come out smaller, since
every quantity is a fraction of the box's width.

If you would rather own the box yourself, `decorationFile(style, {rows, columns, cellSize})` is
exported from the root entry and gives you the derived `TilesetFile` to hand to a plain
`<Tileset>`. `<TileDecoration>` is an ordinary consumer of `<Tileset>` and adds no stage to the
pipeline — what it saves you is getting `referenceWidth` and the box width to agree, which is one
number in two places and reintroduces a bleed silently when they disagree.

## Layout

See `/ARCHITECTURE.md` for the module map. The specification is **archived outside this
repository** at `../gen-tileset-spec-archive/` and is no longer maintained — the code is the
authority. Citations like `07` §6.4 point into that archive; `02`–`08` are the documents that
bound this package when it was built.

`vignette` is specified in `04` §5.2 and deliberately **not registered** — see the header of
`src/registry/sources.ts`.

## Publishing

`git tag v0.1.1 && git push --tags` — `.github/workflows/publish.yml` runs the tests, the
typecheck, `svelte-package`, and `pnpm publish` against `npm.pkg.github.com` using the Actions
`GITHUB_TOKEN`. No personal token, no secret to rotate.

Bump the version in `package.json` first: the tag does not set it, and a tag whose version is
already published fails. Note that **the package page's README is the one in the published
tarball** — a README fix reaches nobody until a new version ships.

Two decisions here are not obvious from the manifest:

**`exports` points at `src`; `publishConfig.exports` points at `dist`.** pnpm replaces `exports`
and `types` in the published manifest, so the workspace compiles source — `apps/editor` and
`apps/demo` build with no `dist` on disk at all — while the tarball carries built `.js` and
`.d.ts`. *Rejected:* pointing `exports` straight at `dist`, which is what the first attempt at
this did. It publishes the same tarball but breaks `pnpm dev` until someone remembers to build,
and it makes the engine the editor previews with a stale artifact rather than the source.

**No preprocessor, and no `svelte.config.js`.** `Tileset.svelte` is written `lang="ts"` and is
published that way. Svelte 5's compiler strips TypeScript itself, so `vitePreprocess()` is a
no-op for scripts here — verified directly: it returns the source unchanged, and a throwaway
consumer with a bare `svelte()` plugin compiles the packed component. *Rejected:* carrying a
`svelte.config.js` with `vitePreprocess()` to match the two apps. It preprocesses nothing and
implies a build requirement the package does not have.

`svelte-check` is part of this package's `typecheck` because it is the only type coverage
`Tileset.svelte` gets from inside its own package. `tsconfig.json` must therefore `include`
`src/**/*.svelte` — with only `*.ts` in scope, `svelte-check` finds no input and
`--fail-on-warnings` fails on that warning alone.

`svelte-package` stages a compiled copy of the package in `.svelte-kit/__package__/` and leaves
it behind, where Vitest's default `include` finds its `.test.js` files. `vitest.config.ts`
excludes that directory and `build:prune` removes it; without the exclusion every test runs
twice after a build, the second time against a stale artifact — and passes, which is what makes
it worth guarding.

## Scripts

`pnpm test` · `pnpm test:watch` · `pnpm typecheck` · `pnpm build`

Tests assert **properties**, never fixed expected values. The vector tables of `05` §11 and
`07` §11.3 do not exist yet — read `/spec/FREEZE.md` before generating any.
