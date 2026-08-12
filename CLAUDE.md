# Tileset generator

A procedural tileset generator: a pure engine, `generate(config, seed) → Grid<TileState>`,
and a Svelte renderer that owns layout, scaling, clipping and asset resolution.

There is one engine. It publishes as a package and consumers pin a version, so any change
to generated output is a versioning problem, not a conformance one (`05` **X9**).

## Where things are

| Path               | What                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `/spec`            | The specification. Read `/spec/README.md` first — not all of it binds equally. |
| `/adr`             | Reversed or contested decisions. Four files: 001, 002, 004, 005.               |
| `/attic`           | The authoring-phase audit and its harvests. Historical. **Do not cite it.**    |
| `DECISIONS.md`     | Append-only. **Only what the spec does not answer.** See below.                |
| `packages/tileset` | Engine and renderer. `@tileset/core`.                                          |
| `apps/editor`      | The editor. In progress — dev server on 5174.                                  |
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
  pointer event into render space, which `07` §8.2 assigns to the caller. **R5** is untouched.

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

### Next, in order

1. **The five vector tables** — unblocked since units 1–9 passed, and now that the editor
   exercises the engine there are real configs to draw them from. ADR-004 governs. The transform
   table gains `scale` rows; existing rows must be identical at `scale = 1`.
2. **Reference configs** — `05` §11.1, once `vignette` exists to exercise.
3. **E15's development assertion**, now that `validate()` exists to make it available.

## `DECISIONS.md`

Append-only, one entry per answer, and it records **only what the specification does not
answer.** Where the spec answers a question, the citation belongs in the code instead.

Read it before re-deciding anything about the editor — it is where the reasoning lives for the
brush's stroke gesture, the shadow config the overlay resolves against, the id scheme, the
refusal on deleting a referenced Tile, the preview-width zoom, what an edit-in-place preserves,
and what an import reads. Around thirty-five entries.

`/adr` is the other half: **ADR-005** is the one that reversed a specification decision, adding
`scale` against `03` §5.4's rejection of it and `03` **D7**'s closure of the attribute set.

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
