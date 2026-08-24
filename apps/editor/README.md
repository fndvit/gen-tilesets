# `@tileset/editor`

The authoring tool. Svelte 5 + Vite. `pnpm dev` → port **5174**.

It is an ordinary consumer of `@tileset/core`: the preview is a plain `<Tileset>`, and the
editor implements no Selection test, no coordinate mapping, and no second renderer. Where it
needs the engine's answer it imports the engine's export — `selection()` exists for exactly
that reason (**E8**).

## The document

**The `TilesetFile` itself is the state** (**E3**). There is no second document model and
nothing that projects to one.

`session.svelte.ts` is **the only write path**. `file` is readable but not assignable from
outside, and `apply()` is the only mutator, so every caller hands over a
`TilesetFile → TilesetFile`. That makes **E5** — the document is never transiently invalid —
structural rather than a rule someone has to remember. Undo lands inside `apply()`, which is
what makes "no editor action is outside the undo stack" true by construction (**E6**).

Transient UI state — the open draft, which panel is expanded, a muted Operation — lives *beside*
the document, keyed by identifiers the file already carries. Never in `meta` (**E4**), never in
the file, and it does not survive a reload.

## A tooling constraint worth knowing

`vitest.config.ts` **drops the Svelte plugin deliberately**: Vitest 2 bundles Vite 5 and the
plugin needs Vite 8, so a module holding a rune cannot be imported by a test. `.svelte`
components therefore cannot be unit-tested at all.

That is why logic lives in plain `.ts` beside the components that use it — `drafting.svelte.ts`
holds the `$state`, `draft.svelte.ts` holds the logic and is tested. Put new logic in a `.ts`
module unless it genuinely cannot leave the component.

## Layout

See `/ARCHITECTURE.md`. `09-editor.md` is authoritative here, except where it reproduces a rule
from another document — there, read the other document.

## Scripts

`pnpm dev` · `pnpm test` · `pnpm typecheck` (tsc + `svelte-check --fail-on-warnings`)
