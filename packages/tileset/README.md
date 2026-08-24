# `@fndvit/gen-tilesets`

The engine and the renderer. The **only published package** in this repository.

To **render** a tileset you need two imports, and no more:

```ts
import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
import type { AssetRef } from "@fndvit/gen-tilesets/render";
```

`<Tileset>` calls `generate()` itself. The rest of the surface — `generate`, `selection`,
`validate`, `migrate`, `cellBox`, `cellAt` — is for a host that builds *tooling* on top: an
overlay, a brush, a validator. `cellAt`'s only caller in this repository is the editor's brush.
Reach for them when you are building an editor, not to draw a picture.

## Install

Published privately to **GitHub Packages** under the `fndvit` org. Add this to the consuming
project's `.npmrc` — commit it; the token comes from the environment, never from the file:

```ini
@fndvit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
pnpm add @fndvit/gen-tilesets@0.1.0 svelte
```

- **The token.** Each person needs a **classic** personal access token with the `read:packages`
  scope, exported as `GITHUB_TOKEN`. GitHub Packages' npm registry does not accept fine-grained
  tokens. Org members with read access to this repository get read access to the package
  automatically — no per-person grant.
- **Peers.** `svelte@^5` is a peer dependency, and the consuming app needs
  `@sveltejs/vite-plugin-svelte`. Nothing further: the published `exports` declare the `svelte`
  condition, so a bare `svelte()` plugin with **no `svelte.config.js` at all** resolves and
  compiles `Tileset.svelte`. This is verified, not assumed — see *Publishing* below.
- **Pin the exact version.** `0.x` promises nothing about output stability (`/CLAUDE.md`), so a
  range is a promise this package does not make.
- **CI in the consuming repo** needs the same `.npmrc` plus a token in its secrets.

## How to use it

Rendering a tileset the editor exported, in SvelteKit. Every snippet here is copied out of a
working app — see *Verified* at the end of this section.

### What the export gives you

The editor's export is one archive holding two things:

```
tileset.json
tiles/<tileId>/<assetId>.<ext>
```

Nested, not a flat folder, because `TileAsset.id` is unique only *within its Tile* — two Tiles may
each hold an asset called `a1`, and a flat folder would silently overwrite one with the other.

**Every `meta.src` in the JSON is a path relative to the archive root**, with no leading slash:
`tiles/water/a1.svg`. That one detail drives everything below.

### Where the two halves go

They go to different places, and only one of them is served:

| From the archive | Goes to | Why |
| --- | --- | --- |
| `tiles/…` | `static/tiles/…` | must be fetchable by the browser at `/tiles/…` |
| `tileset.json` | `src/lib/tileset.json` | **not** served — you `import` it, so it is bundled, needs no fetch, and cannot 404 |

### Parse it — `migrate()`, then `validate()`

`TilesetFile.schemaVersion` is the literal type `2`, so a JSON import (which widens it to
`number`) never assigns to `TilesetFile` directly. Validation is what earns the cast:

```ts
// src/lib/tileset-file.ts
import { migrate, validate, type TilesetFile } from "@fndvit/gen-tilesets";

/**
 * `migrate()` runs before `validate()`: rewriting a version is a coercion, and
 * `validate()` never coerces.
 */
export function parseTilesetFile(raw: unknown): TilesetFile {
  const outcome = migrate(raw);

  if (outcome.kind === "newer") {
    throw new Error(
      `tileset.json declares schemaVersion ${outcome.declared}, which is newer than this ` +
        `version of @fndvit/gen-tilesets understands. Upgrade the package.`,
    );
  }
  if (outcome.kind === "unrecognized") {
    throw new Error(`tileset.json has no usable schemaVersion (got ${String(outcome.declared)}).`);
  }

  const candidate: unknown = outcome.kind === "migrated" ? outcome.file : raw;

  const errors = validate(candidate);
  if (errors.length > 0) {
    const detail = errors.map((e) => `  ${e.path || "/"} [${e.code}] ${e.message}`).join("\n");
    throw new Error(`tileset.json is not a valid TilesetFile:\n${detail}`);
  }

  return candidate as TilesetFile;
}
```

### Anchor the asset paths — the one thing that will bite you

`meta.src` is **relative**, and the renderer hands it to an `<img>` verbatim. So the browser
resolves it against the *current page URL*. On `/` that happens to be right. On `/deep/page` the
browser asks for `/deep/tiles/water/a1.svg` and gets a 404 — with no build error and no type
error, because nothing here is wrong at compile time.

A `provider` fixes it, and is what the extension point exists for:

```ts
// src/lib/provider.ts
import { base } from "$app/paths";
import type { AssetProvider } from "@fndvit/gen-tilesets/render";

export const tilesetProvider: AssetProvider = (ref) => {
  const src = ref.meta.src;
  if (typeof src !== "string" || src === "") {
    throw new Error(
      `asset ${ref.tileId}/${ref.assetId} has no string meta.src, so it cannot be resolved`,
    );
  }
  return { src: `${base}/${src}` };
};
```

Use `base` from `$app/paths` rather than a hardcoded `/`. SvelteKit computes it **per route**
(`paths.relative` defaults to `true`), so the same provider is correct at any route depth *and*
under a sub-path deployment. It **throws** rather than substituting a placeholder, because
resolution never substitutes — a missing picture must reach you through `onAssetError`, not become
a wrong picture.

### The page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import type { AssetRef } from "@fndvit/gen-tilesets/render";
  import raw from "$lib/tileset.json";
  import { parseTilesetFile } from "$lib/tileset-file";
  import { tilesetProvider } from "$lib/provider";

  const file = parseTilesetFile(raw);

  let failures = $state<string[]>([]);

  function onAssetError(ref: AssetRef, cause: unknown): void {
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<div class="frame">
  <Tileset {file} provider={tilesetProvider} {onAssetError} />
</div>

{#if failures.length > 0}
  <ul>{#each failures as f (f)}<li>{f}</li>{/each}</ul>
{/if}

<style>
  /* The host owns the width. The component declares its own aspect ratio and no
     height, so nothing here sets one and there is no layout shift. */
  .frame { width: 100%; max-width: 900px; }
</style>
```

That is the whole integration.

### Four things worth knowing

- **It is deterministic by default.** With no `seed` and no `loadSalt` you get
  `seed = file.config.defaultSeed` and `loadSalt = 0` — the same picture on every load, every
  machine, forever (**S4**). Variation is always something you ask for.
- **If you want per-load variation, draw `loadSalt` in a `load` function.** Never at module scope
  or in component init: both run twice under SSR and give you two different pictures for one page.
  A `load` return value is serialized to the client, so server and hydration agree.
- **`substrate` defaults to `"canvas"`**, which is the only one that can promise a seamless grid —
  but it emits an empty box of the right ratio during SSR and fills it after mount. Pass
  `substrate="dom"` if you need the tiles present in the server-rendered HTML; it is one `<img>`
  per cell, snapped to the same edges.
- **`onAssetError` is the only report of a missing picture.** Nothing is substituted and nothing
  returns null, so a tile whose file is absent draws an empty cell silently unless you wire this.

### Verified

The snippets above were extracted from a SvelteKit 2 app built for the purpose, installing
`@fndvit/gen-tilesets@0.1.0` **from the registry**: `svelte-check` reports 0 errors and 0
warnings, and `vite build` succeeds. The path trap is not hypothetical — the same page on
`/deep/…` with the default provider server-renders `src="tiles/water/a1.svg"` and 404s, and with
`tilesetProvider` renders `src="../tiles/water/a1.svg"`, which resolves to `/tiles/water/a1.svg`
and returns 200.

`parseTilesetFile` is yours to copy for now. If enough consumers write the same twenty lines it
belongs in the package, but adding it is a feature and a version bump, not a doc change.

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

See `/ARCHITECTURE.md` for the module map. The specification is **archived outside this
repository** at `../gen-tileset-spec-archive/` and is no longer maintained — the code is the
authority. Citations like `07` §6.4 point into that archive; `02`–`08` are the documents that
bound this package when it was built.

`vignette` is specified in `04` §5.2 and deliberately **not registered** — see the header of
`src/registry/sources.ts`.

## Publishing

`git tag v0.1.0 && git push --tags` — `.github/workflows/publish.yml` runs the tests, the
typecheck, `svelte-package`, and `pnpm publish` against `npm.pkg.github.com` using the Actions
`GITHUB_TOKEN`. No personal token, no secret to rotate.

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
