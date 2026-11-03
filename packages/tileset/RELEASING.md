# Releasing `@vit-foundation/gen-tilesets`

Maintainer notes. Not shipped in the tarball (`files` is `["dist"]`).

## Publishing

`git tag vX.Y.Z && git push --tags` — `.github/workflows/publish.yml` runs the tests, the
typecheck and `svelte-package`, packs the tarball with `pnpm pack` and publishes it to
npmjs.com with `npm publish`. pnpm packs because only pnpm applies `publishConfig.exports`; npm
publishes because npm's **trusted publishing** is how the job authenticates — the package's
npmjs.com settings trust `fndvit/gen-tilesets`'s `publish.yml`, and the job proves its identity
with a GitHub OIDC token. No npm token, no secret to rotate, and npm attaches provenance.

Trusted publishing can only be configured on a package that already exists, so the very first
version under this name (0.10.0) was published by hand: `pnpm pack` in this directory, then
`npm publish vit-foundation-gen-tilesets-0.10.0.tgz --access public` from an account in the
`vit-foundation` npm org. Versions up to 0.9.0 are on GitHub Packages as `@fndvit/gen-tilesets`.

Bump the version in `package.json` first: the tag does not set it, and a tag whose version is
already published fails. **The package page's README is the one in the published tarball** — a
README change reaches nobody until a new version ships.

## Verifying a release

The workspace consumes source; the tarball carries `dist`. A publishing mistake is therefore
invisible in `pnpm dev`. Verify by installing the tarball into throwaway apps:

1. `pnpm build && pnpm pack` in this directory.
2. **SvelteKit 2**: a fresh app, `pnpm add <path-to-tgz> svelte`, the README's Svelte snippet with
   `prefixedProvider(base)`, a `tileset.json` and `static/tiles/` in the export's layout.
   `svelte-check` must report 0 errors and 0 warnings, and `vite build` must succeed. Put the same
   page on `/deep/…` and check that the images load (with the default provider they 404 there,
   which is what `prefixedProvider` exists to fix).
3. **Plain Vite 8 + Svelte 5**, with **no `svelte.config.js`** and no aliases: `vite build` and
   `svelte-check` clean. Under `--base=/deep/`, image URLs must be `/deep/tiles/…`, not
   `/deep//tiles/…`.
4. **No Svelte**: a Vite + React app with the wrapper from the *Without Svelte* guide, under
   `StrictMode` — both substrates, exactly two boxes on the page, `tsc` with
   `skipLibCheck: false`. Optionally an Observable Framework project with the zip-provider page.
5. Check the canvas has opaque pixels and the DOM substrate's cells have loaded `<img>`s.
6. `dist/render/` must have no bare import, so the renderer loads without a bundler.

The development-only file check must leave a production build: `apps/demo` compiled for
production should contain no string from `validate.ts`. `src/dev.ts` records how to re-measure
it, and why the expression is shaped the way it is.

## Decisions not obvious from the manifest

**`exports` points at `src`; `publishConfig.exports` points at `dist`.** pnpm replaces `exports`
and `types` in the published manifest, so the workspace compiles source — `apps/editor` and
`apps/demo` build with no `dist` on disk at all — while the tarball carries built `.js` and
`.d.ts`. *Rejected:* pointing `exports` straight at `dist`. It publishes the same tarball but
breaks `pnpm dev` until someone remembers to build, and it makes the engine the editor previews
with a stale artifact rather than the source.

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
`07` §11.3 do not exist yet.
