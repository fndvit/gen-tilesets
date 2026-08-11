# Tileset generator

A procedural tileset generator: a pure engine, `generate(config, seed) → Grid<TileState>`,
and a Svelte renderer that owns layout, scaling, clipping and asset resolution.

There is one engine. It publishes as a package and consumers pin a version, so any change
to generated output is a versioning problem, not a conformance one (`05` **X9**).

## Where things are

| Path               | What                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `/spec`            | The specification. Read `/spec/README.md` first — not all of it binds equally. |
| `/adr`             | Reversed or contested decisions. Five files.                                   |
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
write a folder unaided.

Import does not ship: it requires `validate()`, which is deferred. Every session starts from a
new document.

### Next, in order

The editor's plan is finished, so what remains is engine work that was blocked on it:

1. **The five vector tables** — unblocked since units 1–9 passed, and now that the editor
   exercises the engine there are real configs to draw them from. ADR-004 governs.
2. **`validate()` and the error vocabulary** — `06` §5–§10. It is what editor *import* is
   blocked on, and the one thing that would make **E15**'s development assertion available.
3. **Reference configs** — `05` §11.1, once `vignette` exists to exercise.

## `DECISIONS.md`

Append-only, one entry per answer, and it records **only what the specification does not
answer.** Where the spec answers a question, the citation belongs in the code instead.

Read it before re-deciding anything about the editor — it is where the reasoning lives for the
brush's stroke gesture, the shadow config the overlay resolves against, the id scheme, the
refusal on deleting a referenced Tile, and the preview-width zoom. Around thirty entries.

## Deferred on purpose

Not open questions. Do not rediscover them as such.

- **Vector tables** — all five, still ungenerated. Units 1–9 pass, so they are now unblocked.
  The existing tests assert *properties*, never fixed expected values; do not mistake
  `geometry.test.ts` or `hash.test.ts` for the tables. Generate under ADR-004.
- **`validate()` and the error vocabulary** — `06` §5–§10. The engine draws now, so this is
  unblocked too, and editor import is blocked on it.
- **Reference configs** — `05` §11.1, once the Sources they exercise exist.
- **Author-controlled cropping** — `08` §13's `[EXTENSION POINT]`, a `meta` key carrying a
  source rect. It must ship with a default equal to the centre square or its arrival breaks
  **R14**. *(Transforms, centre-crop under **R8**, and `onAssetError` are built — this bullet
  used to claim otherwise.)*
- **The invariant census and `pnpm invariants`** — at 1.0 planning, not before.

Two gaps found while building, flagged rather than worked around:

- **`vignette` is specified in `04` §5.2 and not registered.** Four Sources appear in the
  editor where five should. When it is registered it appears there with nothing written for it.
- **`.svelte` components cannot be unit-tested.** `apps/editor/vitest.config.ts` drops the
  Svelte plugin deliberately — Vitest 2 bundles Vite 5, the plugin needs Vite 8 — so a module
  holding a rune cannot be imported by a test. That is why `drafting.svelte.ts` holds the
  `$state` and `draft.svelte.ts` holds the logic.
