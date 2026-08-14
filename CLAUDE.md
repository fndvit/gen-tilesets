# Tileset generator

A procedural tileset generator: a pure engine, `generate(config, seed) → Grid<TileState>`,
and a Svelte renderer that owns layout, scaling, clipping and asset resolution.

There is one engine. It publishes as a package and consumers pin a version, so any change
to generated output is a versioning problem, not a conformance one (`05` **X9**).

## Where things are

| Path               | What                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `/spec`            | The specification. Read `/spec/README.md` first — not all of it binds equally. |
| `/adr`             | Reversed or contested decisions. Five files: 001, 002, 004, 005, 006.         |
| `/attic`           | The authoring-phase audit and its harvests. Historical. **Do not cite it.**    |
| `DECISIONS.md`     | Append-only. **Only what the spec does not answer.** See below.                |
| `packages/tileset` | Engine and renderer. `@tileset/core`.                                          |
| `apps/editor`      | The editor. Built — dev server on 5174.                                        |
| `apps/demo`        | A fixture page for the renderer. Port 5173.                                    |

## Rules

- **Open a document before making any claim about it.** A claim about another file is stale
  by default. Every known-false statement in this package was written by someone describing
  a document they had not just read.
- **Section numbers are append-only** — `01` §11.4. New sections take the next unused number.
  Nothing is renumbered; a removed section keeps its number as a tombstone.
- **Never regenerate a vector table to make a test pass** — ADR-004. An unexpected diff means
  output moved without anyone intending it, which is the point of the table.
- **Terminology is fixed.** `TileState` not `CellState`, `Tile` not `TileType`, `TileAsset`
  not `Variant`. The rejected names and why they lost are in `01` §10.1. Drift here is the
  cheapest thing to preserve and the most expensive thing to lose.
- **`generate()` trusts its input** (`06` §10, **C5**). Validation is a separate function and
  is not on the critical path.

## Current state

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

### Four additions after the plan

The first three were planned together and sorted by difficulty; the fourth came out of using
them. All are done, `pnpm test` and `pnpm typecheck` are green, and the reasoning for each is in
`DECISIONS.md` or `/adr`.

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

### Next, in order

1. **The five vector tables** — unblocked since units 1–9 passed, and now that the editor
   exercises the engine there are real configs to draw them from. ADR-004 governs. The transform
   table gains `scale` rows; existing rows must be identical at `scale = 1`. It also records the
   quarter turns as `sincos` now returns them — exact, not 6.12e-17 off. Nothing was regenerated
   to accommodate that, because no table exists yet.
2. **Reference configs** — `05` §11.1, once `vignette` exists to exercise.
3. **E15's development assertion**, now that `validate()` exists to make it available.

## `DECISIONS.md`

Append-only, one entry per answer, and it records **only what the specification does not
answer.** Where the spec answers a question, the citation belongs in the code instead.

Read it before re-deciding anything about the editor — it is where the reasoning lives for the
brush's stroke gesture, the shadow config the overlay resolves against, the id scheme, the
refusal on deleting a referenced Tile, the preview-width zoom, what an edit-in-place preserves,
what an import reads, why `substrate` defaults to `"canvas"`, and where a reference image lives.
Forty-three entries, `D1`–`D43`.

**Every entry has a permanent `D<n>`; cite it by that.** Ids are never reused and never
renumbered — `01` §11.4's rule, applied here because code cites this file and, before the ids
existed, some of those citations named a `Q7`/`Q8` numbering it never carried. `Q<n>` in this
repository always means the **spec's** open-questions list (`09` §15), never a decision.

The header carries two rules worth knowing before appending: a constant with no authority earns
a **comment at the constant, not an entry** (the rule that said otherwise is retired, and the
five entries it produced are not a precedent), and an entry **graduates out** — into the spec
once it is part of the engine's contract, into an ADR if it reverses one, into a code comment if
it is editor-internal — so the file tracks unsettled reasoning rather than growing without
bound. There was a second `apps/editor/DECISIONS.md`; its two entries are now D25 and D26.

`/adr` is the other half, and **two of the five reversed a specification decision**: **ADR-005**
added `scale` against `03` §5.4's rejection of it and `03` **D7**'s closure of the attribute set,
and **ADR-006** gave up **R5** and `08` **S5**. Each carries its own cost table; that table is
the thing to read, because both left spec prose standing that is now false in the letter.

## Deferred on purpose

Not open questions. Do not rediscover them as such.

- **Vector tables** — all five, still ungenerated. Units 1–9 pass, so they are now unblocked.
  The existing tests assert *properties*, never fixed expected values; do not mistake
  `geometry.test.ts` or `hash.test.ts` for the tables. Generate under ADR-004.
- **Reference configs** — `05` §11.1, once the Sources they exercise exist.
- **Author-controlled cropping** — `08` §13's `[EXTENSION POINT]`, a `meta` key carrying a
  source rect. It must ship with a default equal to the centre square or its arrival breaks
  **R14**. *(Transforms, centre-crop under **R8**, and `onAssetError` are built — this bullet
  used to claim otherwise.)*
- **Reordering the operation stack** — `document.ts` notes that `moveOperation(id, index)` drops
  in beside the existing transitions with nothing else to change. Editing did not need it, and
  `replaceOperation` preserving the index is what keeps the two separate questions.
- **The invariant census and `pnpm invariants`** — at 1.0 planning, not before.

Two gaps found while building, flagged rather than worked around:

- **`vignette` is specified in `04` §5.2 and not registered.** Four Sources appear in the
  editor where five should. When it is registered it appears there with nothing written for it.
- **`.svelte` components cannot be unit-tested.** `apps/editor/vitest.config.ts` drops the
  Svelte plugin deliberately — Vitest 2 bundles Vite 5, the plugin needs Vite 8 — so a module
  holding a rune cannot be imported by a test. That is why `drafting.svelte.ts` holds the
  `$state` and `draft.svelte.ts` holds the logic.
