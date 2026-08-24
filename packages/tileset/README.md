# `@fndvit/gen-tilesets`

The engine and the renderer. The **only published package** in this repository.

```ts
import { generate, selection, validate, migrate } from "@fndvit/gen-tilesets";
import { cellBox, cellAt } from "@fndvit/gen-tilesets/render";
import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
```

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
