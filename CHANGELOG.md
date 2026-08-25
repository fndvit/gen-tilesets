# Changelog

What was built, in the order it happened, and what each thing cost. Moved out of `CLAUDE.md`
on 2026-08-21 so that file could become a standing brief rather than a running narrative.

**This is history, and it goes stale.** Where it describes a rule, the spec section it cites
is authoritative. Where it describes a decision, `DECISIONS.md` or `/adr` is.

---

## 0.1.1 — the README the package page shows

Documentation only. Nothing under `packages/tileset/src/` moved, so generated output is
byte-identical to `0.1.0` and no consumer's picture changes.

Published anyway, because **the package page renders the README from the published tarball**.
`v0.1.0` was tagged at `87153f9`; the README that explains how to render an exported tileset
landed in `d6687ce`, one commit later. Everyone reading
`github.com/fndvit/gen-tilesets/pkgs/npm/gen-tilesets` was therefore being shown a first snippet
that imported `cellBox` and `cellAt` — a pairing with, between them, exactly one runtime caller in
this repository, and that one the editor's brush. A consumer following it imports machinery they
will never call, from a subpath the snippet gets right only by accident.

**The opening snippet is now the two imports the demo actually uses**, and the surface behind it is
split by subpath rather than listed as one: `generate`/`selection`/`validate`/`migrate` on the root
entry, `cellBox`/`cellAt` on `/render`. `## The renderer` said "exported as pure functions" without
saying from where, which sends a reader to the root entry and a resolution error.

**`How to use it` is six numbered steps**, from creating the token to tiles on screen. The step
that was missing entirely is the one in the middle: press **"Download tileset.zip"** in the editor.
The guide described the archive's shape without ever saying where the archive comes from.

Two things the steps now state that the prose only implied:

- **`tiles/` moves as one folder.** Showing a single asset's destination reads as an instruction to
  place files individually, which is the one thing that must not happen — the export writes each
  file at the path it read back out of `meta.src`, so flattening the folder breaks the JSON's
  pointers silently.
- **The editor's asset store is session-scoped.** After a reload the export throws rather than
  shipping an incomplete folder. That is correct behaviour and it looks like a bug, so it is
  documented where the author meets it.

**A plain Vite + Svelte variant**, derived from `apps/demo` — the only working consumer in this
repository, and not a SvelteKit app. It differs in three places, and one of them is a slash:
SvelteKit's `base` carries no trailing slash while `import.meta.env.BASE_URL` does, so the two
providers concatenate differently and copying one into the other yields `//tiles/…`.

---

## 0.1.0 — the package becomes installable

The engine and renderer stopped being a workspace-internal package and became one another fndvit
project can install. Four things changed; the generated output is byte-identical, because nothing
under `src/` moved.

**Renamed `@tileset/core` → `@fndvit/gen-tilesets`.** Not a preference. GitHub Packages resolves a
package by its scope and requires the scope to equal the org, so the org name is the package name.
61 references across ~48 files, almost all editor imports. The two private apps followed
(`@fndvit/tileset-editor`, `@fndvit/tileset-demo`) for consistency only.

**A build step, and two export maps.** `svelte-package` emits `dist/` — `.js`, `.d.ts`, and a
`Tileset.svelte` with its `.d.ts`. The top-level `exports` still point at `src`, and
`publishConfig.exports` overrides them at publish time, so the workspace keeps compiling source
with no build step while consumers get built output. The alternative — `exports` pointing straight
at `dist` — publishes the identical tarball and costs a build before every `pnpm dev`.

Two things fell out of this that are worth knowing:

- **Svelte 5 needs no preprocessor for `lang="ts"`.** `vitePreprocess()` returns the script
  unchanged; the compiler strips the types itself. So this package has no `svelte.config.js`, and
  the published component ships `lang="ts"` — verified by building a throwaway consumer with a
  bare `svelte()` plugin and no config of its own.
- **`svelte-check` now runs in the package**, not just the two apps — the first type coverage
  `Tileset.svelte` has ever had inside its own package. It needed `src/**/*.svelte` added to
  `tsconfig.json`'s `include`, without which it finds no input and `--fail-on-warnings` fails on
  that warning alone.
- **The build was quietly doubling the test run.** `svelte-package` stages a compiled copy of the
  package in `.svelte-kit/__package__/` and leaves it there, and Vitest's default `include`
  matched its `.test.js` files: after any build, 11 test files ran as 22 and 284 tests as 568,
  the second half against an artifact that goes stale as soon as a source file changes. They
  passed, so nothing went red — the failure mode was a green run covering code nobody edited.
  `vitest.config.ts` now excludes the directory and `build:prune` deletes it.

**CI, where there was none.** `.github/workflows/ci.yml` runs `pnpm test`, `pnpm typecheck` and the
package build on every push. `.github/workflows/publish.yml` publishes on a `v*` tag using the
Actions `GITHUB_TOKEN` — `packages: write` is already granted for its own repo, so there is no
personal token to mint or rotate.

Version moved `0.0.0` → `0.1.0`, which also moves what the editor stamps into `engineVersion`;
`apps/editor/vite.config.ts` reads it from the manifest (**E2**), so that followed on its own.

---

## V1 — the engine, the renderer, and the editor

**The engine and the renderer are built.** All nine engine units pass — hash core, attribute
table, the weight walk, `TileState`, Selection and Source presets, mapping, Blend/Target, and
`generate()` — as do `cellBox` / `cellAt` and a `<Tileset>` that resolves each cell to a
`Drawable` and nothing more. `pnpm test` and `pnpm typecheck` are green from the repo root.

Three additions to the package's exported surface, all recorded in `DECISIONS.md`:

- **`selection()`** — `02` §12, `09` §6.2, **E8**. The overlay's cell set, so the editor
  implements no Selection's test.
- **`SelectionRegistration.coordinateBound`** — `04` §4.4, `09` **E12**. Which Selections a
  resize orphans, declared rather than listed in the editor. **X5**'s reasoning transplanted.
- **`<Tileset>` exposes its render box element** — `08` §7. The editor needs it to convert a
  pointer event into render space, which `07` §8.2 assigns to the caller. **R5** was untouched
  *by this* — ADR-006 is what later contradicted it. See *The seams* below.

**The editor is complete.** All twelve steps of the plan, 0–11, are done:

| Done | Step                                                                             |
| ---- | -------------------------------------------------------------------------------- |
| ✅   | 0 · `selection()` · 1 · new document, memorable seed · 2 · `yOffset`             |
| ✅   | 3 · preview width (**E11**) · 4 · tile library, drops, ids · 5 · operation stack |
| ✅   | 6a–6c · the create-operation workflow, all four steps, and its commit           |
| ✅   | 7 · the `cellList` brush (§7.3) · 8 · the Selection overlay (**E7**, **E8**)    |
| ✅   | 9 · seed, both salts, the load flags, and the load preview (§8.1's four rows)   |
| ✅   | 10 · undo (**E6**) and **E12**'s confirmation, with §9.4's orphan advisories    |
| ✅   | 11 · export (**E14**) — `tileset.json` and its asset folder, as a zip          |

`fflate` is the repo's only runtime dependency, taken on at Step 11 because a browser cannot
write a folder unaided — and cannot read one back unaided either, which is what import uses it for.

### Five additions after the plan

The first three were planned together and sorted by difficulty; the fourth and fifth came out of
using them. All are done, `pnpm test` and `pnpm typecheck` are green, and the reasoning for each is
in `DECISIONS.md` or `/adr`.

1. **Operations are editable in place.** The four-step panel reopens an existing Operation and
   commits through `replaceOperation`, preserving its id, index, `salt` and `reseedOnLoad`.
   Before this a parameter change meant delete-and-rebuild, and **G3** keys randomness to the
   `operationId`, so the rebuilt Operation moved every cell it touched. `fromOperation` is the
   inverse of `toOperation`; the overlay's shadow config now *replaces* by id rather than
   appending, or an edit-draft would put two Operations with one id in a stack.
2. **`scale`, a fifth attribute — ADR-005, and `schemaVersion` is now 2.** Uniform, default `1`,
   bounding `none`, folded into the same matrix as `S(scaleX · scale, scaleY · scale)` at
   ordinal 1 in `07` §10.1. It composes with the axes rather than replacing them, so `03` §5.4's
   flip argument is untouched. Two Operations cannot substitute: **G3** hashes them on different
   channels, so the axes disagree under any stochastic Source. The bump is justified by
   `Operation.target`'s admissible set widening — **not** by `TileState`'s shape, which `06` §4.2
   puts outside `schemaVersion`'s remit. ADR-005 carries that correction.
3. **`validate()` ships, and with it import.** The full module of `06` §5–§10: all fifteen codes,
   strict unknown keys at every depth, registry-driven parameter validation, JSON Pointer paths.
   Import reads the exported `.zip` **or the folder it unzips to**, matches assets by reading
   `meta.src` back, refuses on any `ValidationError` (§12.4), and reports a missing picture as an
   advisory rather than a refusal. It is a new `Import` section at the end of the sidebar, and it
   is undoable.
4. **`migrate()`, and with it the v1 → v2 path** — `06` §4.3, §4.5, and §12's discharged
   `[EXTENSION POINT]`. It runs **before** `validate()`, because §9.2 forbids validation from
   coercing anything and rewriting a version is a coercion; `validate()` is untouched and still
   knows one version. The table's only row is *nothing to do*: ADR-005's sole reach into the file
   was widening an enum, so every legal v1 file was already a structurally legal v2 file. Old
   exports open with an advisory. `SCHEMA_VERSION_UNKNOWN` means what `09` §12.4 says it means —
   a file from a **newer** build — and the editor branches on `migrate()`'s outcome rather than
   inferring it from an error code.
5. **The operation stack is re-sortable — `moveOperation(id, index)` and ▲/▼ on each row, D44.**
   Order *is* the program (`02` §9) and there was no way to change it; getting it wrong meant the
   delete-and-rebuild that addition 1 removed, with the same **G3** cost. The transition touches no
   field of any Operation — G3 already guarantees each "retains its own randomness as it moves", so
   only the composition changes. **Arrows rather than a drag**, against `09` §7.6's preference for
   the palette bar: that argument is about fixed-height segments, and a stack row varies in height
   (`.flags`, and addition 1's panel renders *inside* the row), is dense with controls a pointer
   capture would swallow, and needs the arrows anyway as its keyboard path. One click is also one
   undo entry, where a drag pushes one per boundary crossed.

### The seams, and what they cost — ADR-006 and two decisions after it

Adjacent tiles showed hairlines of the backdrop. Two fixes shipped before the real one and the
geometry was never wrong: `cellBox` derives both sides of every seam from one expression and has
a test asserting it. What remained were causes correct arithmetic does not reach — an asset that
antialiases its own outer edge, and **any ancestor transform**, which re-rasterizes the subtree
and defeats every snap below it. `PreviewFrame` does that to itself with its display zoom, and on
a host page it arrives as a parent's `transform`, `filter`, or animation the component has no say
in. A grid of separate elements cannot promise seamlessness on a page we do not control.

1. **ADR-006 — a canvas substrate, and the renderer measures.** `edges.ts` computes one array of
   **integer device-pixel** edges per axis, so cell `x`'s right edge and cell `x+1`'s left edge
   are *the same array element* — a gap is unrepresentable, not merely unlikely. Device pixels
   rather than CSS pixels, because that also lands the asset's own boundary on the device grid.
   `<Tileset>` takes `substrate?: "canvas" | "dom"`, and **the render box *is* the `<canvas>`**:
   one element, no per-cell nodes, no boundary for a backdrop to show through. `"dom"` keeps the
   `<img>`-per-cell path from the same snapped edges and is what SSR emits.
   **This contradicts `07` **R5** and §5.3's flat "no measurement is required"** — read the ADR's
   cost table before citing either, and before citing **S5**, `08` §4.2, or `07` §6.4. Not given
   up: `cellBox`, `cellAt`, `originX`, `originY`, `scaleFactor`, `naturalRatio`, **R10**, **R9**,
   **R7**/**D11**, **R3**, **S6**, and **R15**'s two tables.
2. **`substrate` defaults to `"canvas"`** — `DECISIONS.md`, not the ADR. The tie-breaker is who a
   wrong default hurts: a consumer needing SSR knows it at build time, where a consumer silently
   given `"dom"` gets hairlines attributed to anything but the tileset. Reversing it is one word
   and no migration — `substrate` writes no field and is not in `TilesetFile`.
3. **A quarter-turned cell is drawn into the cell rect's *pre-image*.** The seams that survived
   ADR-006 appeared **only under a rotation that varies**: snapping two axes against different
   fractional origins makes the snapped rect non-square by one device pixel, and a quarter turn
   transposes its extents. `blitRect` in `edges.ts` supplies the transposed rect, spent by both
   substrates; `coverRect` follows it. `07` §6.2 is untouched — the same matrix, a different rect.
   Non-multiples of 90° are deliberately left alone (`07` §7.1 makes spilling the point).
   `sincos` came with it, so a quarter turn is *exactly* axis-aligned rather than 6.12e-17 off.

**A reference image of the destination page**, added after the plan from using the editor. It is
a **viewing control** in the same category as the backdrop colour — **E11**, it changes what the
author looks at and writes no field; `09` §4.1 puts such state beside the file, never in it and
never in `meta` (**E4**). So `schemaVersion` does not move, `validate()`'s key set is untouched,
nothing joins the export zip, and there is no transition and no undo entry for it. Drawn at `Wpx`,
proportional, never cropped or fitted; the viewport reserves the union of it and the render box.
`reference.ts`, `ReferenceLayer.svelte`, `ReferenceControls.svelte`, and four pieces of state in
`PreviewFrame.svelte`. It is the only thing in the preview stack that names a `z-index`, because
it is the only layer that may need to go *underneath* the picture.
