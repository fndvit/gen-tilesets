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

`loadTilesetFile()` is the first two boxes, in that order, throwing on either — the plain
consumer's door. A host that needs the migration steps or the structured errors (the editor needs
both) calls `migrate()` and `validate()` itself. `<Tileset>` re-runs `validate()` on its `file` in
a development build only; in production it trusts it (**S3**).

`generate()` is a pure function of `(config, seed, loadSalt)` and nothing else (`02` **G1**).
It never sees a pixel, a viewport, or an asset (`02` §4.2, **G5**). Everything on the left of
the arrow is design-space; everything on the right is render-space, and `07` §5 is the only
place they meet.

## Workspaces

| Path | Package | What |
| --- | --- | --- |
| `packages/tileset` | `@fndvit/gen-tilesets` | Engine and renderer. **The only published package.** |
| `apps/editor` | `@fndvit/tileset-editor` | The authoring tool. Svelte 5, Vite, `fflate`. Dev server 5174. |
| `apps/demo` | `@fndvit/tileset-demo` | A fixture page for the renderer. Port 5173. |

pnpm workspace. Root scripts: `pnpm test` and `pnpm typecheck`, both recursive. CI runs both on
every push; a `v*` tag publishes the package (`.github/workflows/`). There is no `pnpm citations`
here — `citations.mjs` went with the spec to `../gen-tileset-spec-archive/scripts/`, and the
citations in the source are no longer checked by anything.

`@fndvit/gen-tilesets` is at `0.4.0`. Everything `05` §10 says about version bumps describes a
future state; `05` §10.3 puts all of V1 at `0.x`, where no bump kind binds. **ADR-004 is the
release valve that makes vector tables generatable before then, and it expires at 1.0.0.**

The version is not written down twice: `apps/editor/vite.config.ts` reads it out of
`packages/tileset/package.json` and defines `__ENGINE_VERSION__` from it, which is Invariant
**E2** — the editor stamps the version of the engine it previews with, or it stamps a lie.

### Two export maps, on purpose

`packages/tileset` resolves **two different ways**, and which one you get depends on whether you
are inside this workspace:

| Consumer | `exports` in force | Resolves to |
| --- | --- | --- |
| `apps/editor`, `apps/demo` | top-level `exports` | `src/**/*.ts`, `src/render/Tileset.svelte` — unbuilt |
| anyone installing the tarball | `publishConfig.exports` | `dist/**/*.js` + `.d.ts` — built by `svelte-package` |

pnpm replaces `exports` and `types` at publish time, so the two apps never need a build step and
the tarball never ships TypeScript. `packages/tileset/README.md` records why, and what was
rejected.

## `packages/tileset/src` — the engine

| Module | What |
| --- | --- |
| `index.ts` | Public entry. Nothing reachable from here touches the DOM, a measurement, or an asset. |
| `types.ts` | Every noun. Key names transcribed verbatim from `06` §3, §5–§8. |
| `generate.ts` | `generate(config, seed, loadSalt) → Grid<TileState>`. Per cell, in stack order, asset resolution last (`02` §9). |
| `hash.ts` | Positional hashing — `hash`, `hashU32`, `mixLoad`, `stage1`, `selectionChannel`. Portability rules in `02` §6.6 are the contract, not the function choice. |
| `ctx.ts` | The closed `EvalCtx` a Source receives (**O4**). Deliberately narrow — it is the doorway a pixel measurement would enter through. Carries `extent`, the Selection rectangle a *spanning* Source normalizes over; `rows`/`columns` are the grid and are not interchangeable with it. |
| `attributes.ts` | The attribute table: domain, default, bounding. `bound`, `writeAttribute`. |
| `angle.ts` | `sincos` — degrees, exact on the axes. Shared, because `gradient` needs the same exactness the render matrix does and the engine cannot import from `render/`. `render/transform.ts` re-exports it. |
| `assets.ts` | The weight walk — resolves a cell's `assetId`. Order-independent (`03` §4.2). |
| `mapping.ts` | Numeric and tile mapping — gives units to a Source's bare `[0,1]`. Both branches return `max` exactly at the top, and both have a `t = 1` boundary case since **X6** closed. |
| `selection.ts` | `selection(config, operationId, …) → (x,y) => boolean`. Exists so the editor implements no Selection test (**E8**). |
| `validate.ts` | Fifteen error codes, strict at every depth, never coerces. Separate from `generate()`, which trusts its input (**C5**). |
| `migrate.ts` | The v1 → v2 table and its walk. Runs **before** `validate()`, because rewriting a version is a coercion (`06` §9.2). |
| `dev.ts` | Development-build detection. A **provisional** answer to `08` Q3, which is still open. |
| `registry/` | `registry.ts` (name → type, no public registration API), `sources.ts`, `selections.ts`, `blends.ts`. A Selection declares its `extent` here, beside `stochastic` and `coordinateBound`. |

**`vignette` is registered nowhere on purpose.** `04` §5.2 lists five Sources and specifies
four; implementing it would mean coining a formula in code, which `04` §5.3 rejects. See the
header of `registry/sources.ts` and `spec/FREEZE.md` A-5.

## `packages/tileset/src/render` — the renderer

| Module | What |
| --- | --- |
| `Tileset.svelte` | The one entry point (**S1**). Takes a `TilesetFile` and calls `generate()` itself — nothing accepts a bare grid. |
| `geometry.ts` | The ideal fractional mapping: `cellBox`, `cellAt`, `originX/Y`, `scaleFactor`. Pure, no measurement. |
| `uniform.ts` | **The uniform square cell.** One integer side on both axes, plus the split between raster and presentation, and the draw list. `uniformGeometry` quantises with `round` for `"canvas"` and `"svg"`; `domGeometry` quantises with `ceil` for `"dom"` so its side residual is always a clip and never a gutter, and reports `gridHeightDev` so that box can take its height from the grid instead of cutting the bottom row. Every substrate draws from this module. |
| `edges.ts` | What survives of ADR-006: `snap` and `coverRect`. The per-edge snapping it was built around is gone — see `SUBPIXEL-GEOMETRY.md` attempt 1 before reintroducing it. |
| `warn.ts` | The two asset rules, as development-build warnings. Silent in production. |
| `transform.ts` | Scale-then-rotate about the centre (**D11**). `sincos` makes quarter turns exact rather than `6.12e-17` off. |
| `measure.ts` | `ResizeObserver` width and DPR. **This is ADR-006's concession** — `07` **R5** says the renderer never measures. Read the ADR's cost table before touching it. |
| `images.ts` | Decoded bitmaps for the canvas substrate. |
| `provider.ts` | Resolves `(tileId, assetId)` → `Drawable`. Keyed on the **pair**, never on `assetId` alone. |

### Three substrates

`substrate?: "canvas" | "dom" | "svg"`, defaulting to `"canvas"`.

**One geometry, three presentations.** All three compute the *same* uniform square cell —
`scaleFactor * cellSize * dpr`, quantised to one integer on both axes, so a cell is square by
construction and **R8**'s crop has nothing left to remove. `coverRect` and `object-fit: cover` are
unchanged and still crop; against a square destination they crop by nothing. The substrates differ
only in where the quantisation residual goes, which is a property of the *geometry* and not of the
painter — every substrate faces it.

They also differ in **which way the cell is quantised**, and that is the one thing that is not
shared. `"canvas"` and `"svg"` read `uniformGeometry`, which takes `round`: the presentation cancels
the quantisation exactly, so what is left to minimise is the residual's *magnitude*. `"dom"` reads
`domGeometry`, which takes `ceil` — see its bullet.

- **canvas** — the raster is exactly `columns * cellDev` device px, so the canvas *is* the grid: no
  origin to round, no box to centre in. It is then presented at the **ideal fractional** width, which
  turns the whole residual into one isotropic resample of a single bitmap, where no internal edge
  exists to seam. **The choice for proportion**, and the default. It is also the only substrate that
  can promise seamlessness structurally rather than carefully — adjacent tiles are neighbouring
  pixels of one bitmap, so no host-page CSS can open a boundary. It requires assets carrying at least
  as many pixels as the largest cell they are drawn into.
- **dom** — one `<img>` per cell, from `domGeometry`'s cell. **The choice for interactivity**,
  because a canvas is one element and cannot be hit-tested per cell, and it is what SSR emits: before
  measurement it places cells by percentage, so the initial HTML carries complete geometry. Its cost
  is that the residual goes to the *box*: the grid does not fit it exactly, so the tileset does not
  start on exactly the right cell. The full-bleed case — exact box, every column present — is served
  by no substrate here.

  **What it does guarantee is the direction of the misfit, on the axis the host owns.** Its cell is
  `ceil(idealCell)`, so the grid always covers its box horizontally and **R9** clips the overhang: the
  outer columns are cut, by an amount that varies with width, and no gutter of page backdrop can open
  at the sides. `round` left the residual's sign free, and about half of all widths guttered instead —
  up to 19 device px down each side of a zero-bleed design, which is what made this substrate look
  like it was padding the grid at some widths and cutting it at others. Fixing the sign doubles the
  worst-case side cut, and that trade is the reason `domGeometry` is a second function rather than a
  change to the shared one.

  **Vertically it cuts nothing, because that box is the component's.** After measurement the box drops
  its declared ratio and takes its height from `domGeometry.gridHeightDev` — the last horizontal edge,
  the same expression the cells are placed by — through one in-flow child, exactly as the canvas
  wrapper takes its height from its canvas. Declaring `naturalRatio` while the grid was quantised put
  the *whole* vertical residual on the bottom edge (the grid is top-anchored, so unlike the horizontal
  one it is not split between two edges), which shaved up to `rows` device px off the bottom row. The
  box is now up to `rows` device px taller than `naturalHeight`, which **S8** makes a default rather
  than a constraint; a host that overrides the height gets **R9** back by its own choice.
- **svg** — one inline `<svg>` in design coordinates under a single `viewBox`. One affine transform,
  no per-cell layout rounding, so there is no residual to assign at all, and nothing is measured,
  which makes it the most SSR-complete of the three. **The choice for crispness, if seams are
  acceptable** — and they are the cost: **+52%** backdrop leak through `<image>` edges, the worst
  measured, and plainly visible rather than marginal: in a flat one-colour field the
  other two substrates show no boundary anywhere and this one shows a hairline at every shared edge.

The default is `"canvas"` because of who a wrong default hurts: a consumer needing SSR knows it at
build time, where a consumer silently given `"dom"` or `"svg"` gets a fit that is off by a cell, or
hairlines, attributed to anything but the tileset (`DECISIONS.md` D41).

**Overlays read `cellPlacementPercent`, not `uniform.ts`.** Under the canvas presentation the scale
exactly cancels the quantisation, so a cell lands at `originX + k * s * cellSize` — the ideal
fractional geometry. That is why the editor's two overlays reverted from the snapped edges they read
under ADR-006, and `uniform.test.ts` asserts the identity so the claim is checked rather than
believed.

`SUBPIXEL-GEOMETRY.md` is the investigation record and carries the reasoning, the fifteen attempts,
and the two laws worth knowing before touching any of this: the residual is geometry rather than
paint, and apparent crispness of a curve goes as `1 / cellDev` rather than as the asset-to-cell
ratio. Read it before changing `uniform.ts`, a crop policy, or the substrate default — several
plausible-looking fixes there are measured dead ends, and four of them were confident claims about
browser mechanisms that turned out to be false.

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
