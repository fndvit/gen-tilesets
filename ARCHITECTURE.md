# Architecture

How the system is built. For *why* a rule exists, follow the citation — `/spec` is
authoritative and this document restates nothing normative.

## The shape of it

One pure engine and one renderer, published together as `@fndvit/gen-tilesets`. The editor is a
consumer of that package with no privileged access: its preview is an ordinary `<Tileset>`.

```
TilesetFile ──migrate()──> validate() ──> generate(config, seed, loadSalt)
   │                                            │
   │  layout                                    ▼
   │                                    Grid<TileState>
   ▼                                            │
cellBox / edges ────────────────────────────────┤
                                                ▼
                          AssetProvider: (tileId, assetId) -> Drawable
                                                │
                                                ▼
                                    <canvas> or one <img> per cell
```

`generate()` is a pure function of `(config, seed, loadSalt)` and nothing else (`02` **G1**).
It never sees a pixel, a viewport, or an asset (`02` §4.2, **G5**). Everything on the left of
the arrow is design-space; everything on the right is render-space, and `07` §5 is the only
place they meet.

## Workspaces

| Path | Package | What |
| --- | --- | --- |
| `packages/tileset` | `@fndvit/gen-tilesets` | Engine and renderer. Ships unbuilt TypeScript through `exports`. |
| `apps/editor` | `@fndvit/tileset-editor` | The authoring tool. Svelte 5, Vite, `fflate`. Dev server 5174. |
| `apps/demo` | `@fndvit/tileset-demo` | A fixture page for the renderer. Port 5173. |

pnpm workspace. Root scripts: `pnpm test`, `pnpm typecheck`, `pnpm citations` — all recursive
except the last.

`@fndvit/gen-tilesets` is at `0.0.0`. Everything `05` §10 says about version bumps describes a
future state; `05` §10.3 puts all of V1 at `0.x`, where no bump kind binds. **ADR-004 is the
release valve that makes vector tables generatable before then, and it expires at 1.0.0.**

## `packages/tileset/src` — the engine

| Module | What |
| --- | --- |
| `index.ts` | Public entry. Nothing reachable from here touches the DOM, a measurement, or an asset. |
| `types.ts` | Every noun. Key names transcribed verbatim from `06` §3, §5–§8. |
| `generate.ts` | `generate(config, seed, loadSalt) → Grid<TileState>`. Per cell, in stack order, asset resolution last (`02` §9). |
| `hash.ts` | Positional hashing — `hash`, `hashU32`, `mixLoad`, `stage1`, `selectionChannel`. Portability rules in `02` §6.6 are the contract, not the function choice. |
| `ctx.ts` | The closed `EvalCtx` a Source receives (**O4**). Deliberately narrow — it is the doorway a pixel measurement would enter through. |
| `attributes.ts` | The attribute table: domain, default, bounding. `bound`, `writeAttribute`. |
| `assets.ts` | The weight walk — resolves a cell's `assetId`. Order-independent (`03` §4.2). |
| `mapping.ts` | Numeric and tile mapping — gives units to a Source's bare `[0,1)`. |
| `selection.ts` | `selection(config, operationId, …) → (x,y) => boolean`. Exists so the editor implements no Selection test (**E8**). |
| `validate.ts` | Fifteen error codes, strict at every depth, never coerces. Separate from `generate()`, which trusts its input (**C5**). |
| `migrate.ts` | The v1 → v2 table and its walk. Runs **before** `validate()`, because rewriting a version is a coercion (`06` §9.2). |
| `dev.ts` | Development-build detection. A **provisional** answer to `08` Q3, which is still open. |
| `registry/` | `registry.ts` (name → type, no public registration API), `sources.ts`, `selections.ts`, `blends.ts`. |

**`vignette` is registered nowhere on purpose.** `04` §5.2 lists five Sources and specifies
four; implementing it would mean coining a formula in code, which `04` §5.3 rejects. See the
header of `registry/sources.ts` and `spec/FREEZE.md` A-5.

## `packages/tileset/src/render` — the renderer

| Module | What |
| --- | --- |
| `Tileset.svelte` | The one entry point (**S1**). Takes a `TilesetFile` and calls `generate()` itself — nothing accepts a bare grid. |
| `geometry.ts` | The ideal fractional mapping: `cellBox`, `cellAt`, `originX/Y`, `scaleFactor`. Pure, no measurement. |
| `edges.ts` | ADR-006. One array of **integer device-pixel** edges per axis, so a seam between two cells is *the same array element* and a gap is unrepresentable. Also `blitRect` for quarter turns. |
| `transform.ts` | Scale-then-rotate about the centre (**D11**). `sincos` makes quarter turns exact rather than `6.12e-17` off. |
| `measure.ts` | `ResizeObserver` width and DPR. **This is ADR-006's concession** — `07` **R5** says the renderer never measures. Read the ADR's cost table before touching it. |
| `images.ts` | Decoded bitmaps for the canvas substrate. |
| `provider.ts` | Resolves `(tileId, assetId)` → `Drawable`. Keyed on the **pair**, never on `assetId` alone. |

### Two substrates

`substrate?: "canvas" | "dom"`, defaulting to `"canvas"`.

- **canvas** — the render box *is* the `<canvas>`. One element, no per-cell nodes, so no
  boundary exists for a backdrop to show through. No host-page CSS can open a gap.
- **dom** — one `<img>` per cell, placed from the same snapped edges. Correct on its own, and
  it is what SSR emits.

The default is `"canvas"` because of who a wrong default hurts: a consumer needing SSR knows
it at build time, where a consumer silently given `"dom"` gets hairlines attributed to
anything but the tileset (`DECISIONS.md` D41).

## `apps/editor/src` — the editor

State is the file itself. There is no second document model (**E3**).

| Module | What |
| --- | --- |
| `session.svelte.ts` | The live `$state` document and **the only write path**. `file` is readable but not assignable; `apply()` is the only mutator, so **E5** is structural rather than a rule to remember. Undo lands inside `apply()`. |
| `document.ts` | Every transition — `TilesetFile → TilesetFile`. Includes `moveOperation`. |
| `history.ts` | Whole-file snapshots (**E6**). No inverse operations, because there is nothing beside the file to roll back. |
| `draft.svelte.ts` / `drafting.svelte.ts` | The create/edit-operation draft. Split for a tooling reason — see below. |
| `assets.ts` | The editor's asset store and its provider. Blobs plus object URLs, session-scoped. |
| `export.ts` / `download.ts` / `import.ts` | `tileset.json` plus an asset folder, as a zip (**E14**), and its inverse. Import matches assets by reading `meta.src` back, never by parsing a path. |
| `orphans.ts` | The destructive re-derive: at-risk before, orphaned after (**E12**). |
| `reseed.ts` / `seed.ts` | Seed, both salts, the load flags, and the memorable seed generator. |
| `paint.ts` | The `cellList` brush and client → render-space conversion. |
| `reference.ts` | Reference-image geometry. A **viewing control** — writes no field, joins no export. |
| `derive.ts` | The one derivation in editor code: `columns = ceil(referenceWidth / cellSize)`. |
| `controls/affordance.ts` | `ParamSpec` → control. Total by construction (**E9**). |

Components live in `lib/` and `controls/`. `App.svelte` holds the shell and the shadow config
the overlay resolves against.

### Why `draft.svelte.ts` and `drafting.svelte.ts` are separate

Not a design preference — a tooling constraint. `apps/editor/vitest.config.ts` drops the
Svelte plugin deliberately: Vitest 2 bundles Vite 5 and the plugin needs Vite 8, so a module
holding a rune cannot be imported by a test. `drafting.svelte.ts` holds the `$state`;
`draft.svelte.ts` holds the logic and is therefore testable. **`.svelte` components cannot be
unit-tested at all**, which is why logic is pulled into plain `.ts` wherever it matters.

## Testing

20 test files, all Vitest. They assert **properties**, never fixed expected values — the five
vector tables of `05` §11 and `07` §11.3 do not exist yet. Do not mistake `geometry.test.ts`
or `hash.test.ts` for them; see `spec/FREEZE.md` before generating any.

About half the invariants have no test at all, and some of those never will — an invariant
that constrains how decisions get made cannot be asserted by a running program.
`spec/INVARIANTS.md` is the census that keeps *untestable* and *absent* distinguishable.

`pnpm citations` resolves every `§`, invariant, ADR and decision id cited in source against
the documents. It exists because a renumbered section silently redirects a citation that still
parses and still reads plausibly (`spec/CONVENTIONS.md` §11.4).
