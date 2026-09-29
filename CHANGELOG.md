# Changelog

What was built, in the order it happened, and what each thing cost. Moved out of `CLAUDE.md`
on 2026-08-21 so that file could become a standing brief rather than a running narrative.

**This is history, and it goes stale.** Where it describes a rule, the spec section it cites
is authoritative. Where it describes a decision, `DECISIONS.md` or `/adr` is.

---

## 0.5.0 — one style, many decorations

**The case.** A page wants more than one tileset: a couple of tailor-made ones, plus a dozen small
tile blocks scattered around it — a 2x2 in a corner, a stepped 3x4 beside a heading. They are one
visual language and differ only in **how many cells they occupy**.

Each of those needed its own file, because `rows`/`columns` are `TilesetConfig` fields and
`cellSize`/`referenceWidth` are `Layout` fields. A dozen decorations was a dozen copies of one
`tiles` array and one set of assets, which drift apart the first time one is edited — the same
duplicated-payload pain `RESPONSIVE-HOSTING.md` §4 names as C2's gate, arriving from a different
direction.

**What was already true.** The data model is size-independent everywhere except two Selections.
`rect` and `cellList` are declared `coordinateBound` and are orphaned by a resize; `all`,
`checkerboard`, `everyNth` and `random` are rule-based and survive one. Everything else — `tiles`,
every `TileAsset`, `defaultSeed`, `assetSalt`, every mapping, blend and target — needs no rewrite
at another size. So "the same Operations at another size" was expressible in the *model* all
along; it was not expressible in the *file*, because the size sits inside the thing being shared.

**What was added is that expression and nothing more.** `decorationFile(style, {rows, columns,
cellSize})` overrides four numbers and passes every other field through **by reference** — twelve
decorations hold one `tiles` array between them, which is the whole point and is asserted by
identity rather than by deep equality, so a later `structuredClone` added for tidiness cannot
quietly cost it.

**No engine change, no schema change, and no output change for any existing file.** `generate()`,
`hash.ts`, every registry and `validate.ts` are untouched. This is additive.

### Variation is the `seed` prop, which already existed

Two spots of the same size differ because they are generated under different seeds — `generate()`
is pure in `(config, seed, loadSalt)`, so one string re-rolls every Operation *and* the asset walk
through `effectiveSeeds`. Nothing in `decoration.ts` touches a salt, and there is no per-spot mask:
emptiness comes from a `{tileId: null}` palette entry, so a spot's **silhouette** is a function of
its seed. That is what replaces a hand-painted `cellList` per decoration, and it is only affordable
because the hashing is positional — a bigger spot *extends* the picture instead of reshuffling it,
which `decoration.test.ts` pins cell by cell.

### It lands on the zero-bleed case on purpose

`referenceWidth` is derived as `columns * cellSize` and `yOffset` is forced to 0. In a page-scale
tileset `referenceWidth` is stored precisely *because* it differs from `columns * cellSize` — `02`
§7.2 calls the difference the intentional bleed — but a small block of whole cells in a margin has
no design for a bleed to belong to, and `yOffset` would shave the top of an edge the page can see.

Three exactnesses follow by construction: `originX` is exactly 0, `s` is exactly 1, and
`presentScale` is exactly 1 at integer DPR. **`SUBPIXEL-GEOMETRY.md`'s subject is absent here
rather than minimised** — the full-bleed case `ARCHITECTURE.md` says "is served by no substrate
here" is served by there being no bleed to fit. Asserted with strict equality in
`decoration.test.ts` and measured in Chromium at DPR 1 and 2, where every box came out
`columns * 44` by `rows * 44` CSS px with a backing store exactly `dpr` times that.

### The check is separate, and loud in the right build

`decorationStyleErrors(style)` returns one message per Operation whose Selection is
`coordinateBound`. It is a **separate function** for exactly `06` **C5**'s reason: `decorationFile`
trusts its input as `generate()` does, and the check is what makes that trust earned.
`<TileDecoration>` runs it under `DEV` and throws, the same development-loud / production-trusting
arrangement `<Tileset>` has with `assertValidFile` — verified to fold out of a production build,
where the message string is absent from the bundle.

It reads the **registry flag**, never a list of names, for the reason `selections.ts` gives on the
declaration itself: the registry is open, so a name table here would misclassify anything
registered later, and in the safe-looking direction. It returns `string[]` rather than
`ValidationError[]` because `ErrorCode` is a closed union and a coordinate-bound Selection is
perfectly valid in a *tileset* — the failure belongs to the decoration contract, not to the schema,
so it stays out of the schema's vocabulary.

### `<TileDecoration>` is not a second entry point

**S1** is intact: `<Tileset>` remains the one thing that draws and the one thing that calls
`generate()`. `<TileDecoration>` derives a file above it and renders it, exactly as the editor's
preview does. What it earns its place with is the **box** — `columns * cellSize` px, the same
product written into `referenceWidth`. That is one number in two places, and a host that gets them
to disagree reintroduces a bleed silently: the grid still draws, just not at the tile size the
author asked for. `max-width: 100%` is on it deliberately, because a 6-column decoration at 96px
overflows a phone and a sideways-scrolling page is a worse failure than smaller tiles.

`decorationFile` is exported for a host that would rather own the box itself.

### The fixture, and what it caught

`apps/demo/src/Decorations.svelte` is a third fixture and the first that is a **use case** rather
than a geometry instrument: nine decorations off one style, on a light backdrop because a
decoration in a margin is the case where the page's own background shows on all four sides of the
grid.

Two things were found by looking at it in a browser rather than by reasoning:

- **The atlas's asset ids are not the obvious sequence.** `t1`–`t4` run `a1, a3, a4, a5, a6` — there
  is no `a2` — and only `t5` runs `a1..a5`. Assuming otherwise produced four 404s and an
  `EncodingError` per spot, reported through `onAssetError` and visible **nowhere else**, because
  **R3** substitutes nothing and the cell simply drew empty. That is the asset rules working as
  designed, and a good argument for wiring `onAssetError` in anything real.
- **`onAssetError` fires once per cell, so a failure list keyed on the message throws.** The same
  missing asset arrives dozens of times across nine decorations, and `{#each failures as f (f)}`
  then dies with `each_key_duplicate`, taking the page with it. The fixture dedupes: the fact is
  *which* asset failed, not how many cells noticed. `apps/demo/src/App.svelte` had the same
  latent bug, hidden only because its assets all resolve, and now dedupes the same way.

The fixture is **a new picture on every reload**. `App.svelte` draws a `loadSalt` once per page
load and hands it to the fixture, and the style sets `reseedOnLoad` on both Operations and
`reseedAssetsOnLoad` — without those flags the salt reaches nothing (`hash.ts` `pickSeed`). The
per-spot seeds still separate spots within a load. This is the existing **R12** mechanism used as
intended; `<TileDecoration>` still defaults `loadSalt` to 0 and the package is unchanged.

Verified by packing the tarball with `pnpm pack` and installing it into a throwaway Vite 8 +
Svelte 5 app: `svelte-check` reports 0 errors and 0 warnings and `vite build` succeeds over
`@fndvit/gen-tilesets/TileDecoration.svelte`. Worth recording that **`npm pack` is the wrong tool**
for that check — it does not apply pnpm's `publishConfig` substitution, so its tarball carries the
workspace's source-pointing export map and *every* subpath fails to resolve, including the ones
that were already correct.

---

## 0.4.0 — a gradient that reaches both ends of its range

**The bug**, found in the demo fixture. A `gradient` at `angle: 90` over ten rows, mapped
continuously onto `scale` with `range: [0, 1]`, produced this:

| row | 0 | 1 | 2 | ... | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- |
| scale | 0.05 | 0.15 | 0.25 | | 0.85 | 0.95 |

Row 0 was not 0, so its tiles were visible when they should have vanished; row 9 was not 1, so
adjacent tiles missed touching by five percent of a cell. **R7** makes `scale = 1` occupy exactly
the cell box, so 1 is the value at which neighbours meet — and it was unreachable.

**Two independent causes.**

*It measured the grid's outer edges while sampling cells.* The domain was the projection of
`(0, 0) .. (columns, rows)` and the sample was a cell centre, `(x + 0.5, y + 0.5)` — so
`t = (y + 0.5) / rows`. Ten rows have ten cells but only **nine gaps** between their indexes;
dividing by ten left exactly half a cell unreachable at each end. The inset went as `0.5 / N`, worst
on the small grids where it shows most.

*The domain was the whole grid, never the Selection.* `EvalCtx` carried only `rows`/`columns`, so a
Source structurally could not see the Selection. A seven-row `rect` band inside that ten-row grid
received only the slice `t` in `[0.05, 0.65]` of a grid-wide sweep, so `range: [0.3, 1]` with
`steps: 7` came out as five distinct bands — two of them duplicated — topping out at **0.767**
instead of 1.

**The fix.** `gradient` now projects plain **cell indexes**, and takes its domain from the first and
last cell index of `ctx.extent`:

    xs = [ex, ex + ew - 1]        // not [0, columns]
    p0 = project(x, y)            // not project(x + 0.5, y + 0.5)

The half-cell offset was not merely unnecessary but counterproductive: it is a constant added to the
sample and to both ends of the domain, where it cancels — so carrying it bought nothing and lost
last bits, since it added the constant only to subtract it again.

**It holds at every angle, not just the axis-aligned ones.** The sampled cells form a lattice inside
the domain box, a linear functional attains its extremes over a box at the box's corners, and those
corners *are* lattice points — real cells that really get sampled. Pinned over fifteen angles
including diagonals, with strict equality rather than `toBeCloseTo`.

**`sincos` moved down to `src/angle.ts`**, out of `render/transform.ts`, because the engine cannot
import from `render/` and copying the quadrant table would leave two to drift. It is not a
tidy-up: `cos(90deg)` is `6.12e-17`, and with `Math.cos` a vertical sweep's endpoints come out
`2.47e-17` and `0.9999999999999994` — the same defect two decimal orders down — while a single-row
extent gets a spurious non-zero span and sweeps a band with nothing to sweep across.
`render/transform.ts` re-exports it, so no import site changed.

**Selections declare an extent.** A third declaration on `SelectionRegistration` beside
`stochastic` and `coordinateBound`, for the reason those two already give: the registry is open, so
a table of names in the editor would silently misclassify anything registered later. `rect` returns
its own four numbers **unclamped**; `cellList` returns the bounding box of the painted cells; the
four procedural Selections declare nothing and get the grid — which is the split `04` §4.4's
`coordinateBound` table already draws, arrived at independently. `operationCtx` resolves it once per
Operation, so `generate()` and `selection()` cannot disagree about it.

**G2 is intact, and the distinction is the point.** G2's argument is that a gradient normalized over
*the visible region* would drift its midpoint off the viewport centre by exactly the bleed. A
Selection is not a viewport — it is something the author drew. Because `rect`'s extent is unclamped,
a rect dragged past the grid edge still sweeps its whole declared width, its midpoint stays put, and
the clipped columns still consume their share of the range; the visible part of such a rect
deliberately does *not* reach the ends. A gradient over `selection: {type: "all"}` is unchanged in
domain and moves only by the endpoint fix.

**X6 opened from `[0, 1)` to `[0, 1]`**, which is the real cost and was paid rather than dodged. The
two ways round it are worse: nudging the endpoint to just under 1 leaves `scale` at
`0.9999999999999999`, which is not 1 for `isIdentityTransform`'s exact comparison and so silently
reintroduces seams on a whole row; and normalizing over cell edges to keep `t < 1` is the defect
being fixed. Two sites in `mapping.ts` relied on the strictness:

- the stepped `index = floor(t * steps)` reached `steps` at `t = 1` and overshot `max` by a whole
  step — `[0, 270]` with `steps: 4` would emit 360deg, which `rotation` wraps to 0deg, the *lowest*
  value in the set. Clamped.
- the palette walk's `cumulative > target` was never strictly true for the last entry at `t = 1`, so
  it fell out of the loop and returned `null` — which means *clear this cell*. The top row of every
  palette gradient would have been blanked rather than taking its last entry. It now falls back to
  the last **positive-weight** entry, so a trailing zero-weight entry still cannot win.

`random` and `valueNoise` still return `[0, 1)`; a closed interval is a superset, so neither moved.

**Both mapping branches now return `max` exactly at the top**, rather than the arithmetic that
should equal it. `min + (steps - 1) * (max - min) / (steps - 1)` is `max` algebraically and is not
`max` in floating point — over `[0.3, 1]` with `steps: 7` it comes out `0.9999999999999998`. That is
invisible for most Targets and is not invisible for `scale`, where a value one ulp short takes the
matrix path instead of the pixel-snapped box, and the matrix path is where seams come from.

**The demo fixture needed no edits** and becomes the regression case: its `op3` now yields
`0, 1/9, ... , 1` and its `op2` yields `0.3, 0.4167, 0.5333, 0.65, 0.7667, 0.8833, 1.0` — one band
per row, reaching 1.

**One public-API note.** `operationCtx` now resolves the Selection registration, so it throws
**X7**'s unknown-type error where it previously could not. Neither in-tree caller changes behaviour
— `generate()` and `selection()` both resolve the same registration a line earlier and already threw
first — but a consumer calling `operationCtx` directly on an unvalidated config sees the throw move
one call earlier.

**This is an output change for every gradient config**, not only the ones with a `rect`. At `0.x`
that is a version bump and this entry, per `CLAUDE.md`.

---

## 0.3.0 — one uniform square cell, and a third substrate

**The bug.** `edges.ts` snapped every grid line to a whole device pixel independently. Seams
measured 0%, and that half was right. But a *cell* pairs `xEdges[x]` with `yEdges[y]` — two members
of two independently snapped sequences — so it came out 133x132 where the ideal cell is square, and
**R8**'s centre-crop answered that half pixel with a flat chord tangent to the curve: up to
**19.5px on a 190px cell, a 39x amplification**.

**The fix**, in `render/uniform.ts`, and it changes no crop code:

    cellDev = round(scaleFactor * cellSize * dpr)      // one integer, both axes

A cell is square by construction, so `coverRect` and `object-fit: cover` crop a square asset by
nothing. The crop was never wrong — the rect it was handed was.

**`substrate` gains `"svg"`**, and all three now draw from the same cell. `"canvas"` (default)
rasterises at exactly `columns * cellDev` and presents at the ideal fractional width, so the residual
becomes one isotropic resample where no internal edge can seam; `"dom"` gives the residual to the
box; `"svg"` has no residual and pays at every shared edge instead — visibly, so it is documented
rather than defaulted.

**`"dom"` cuts at the sides, and never gutters.** `round` leaves the residual's *sign* free, and that substrate is
the one that can feel it: it has no presentation to cancel the quantisation with, so at some widths
the grid overhung its box and was clipped (wanted) and at others it fell short and showed the page
backdrop down each side (not). Swept over 3,000 widths of the 76-column zero-bleed footer preset,
**about half of them guttered** — up to 19 device px per side. `domGeometry` rounds the cell **up**
and floors the `y` origin, so the grid always covers its box and **R9** clips the overhang: 0 of
3,000 widths gutter at every DPR. The cost is a shift rather than a saving — the clip's range goes
from a signed `[-19, +19]` device px per side to `[0, 38]`, so the worst-case cut doubles. A second
function rather than a parameter on `uniformGeometry`, because the difference belongs to the
presentation and not to the caller; `"canvas"` and `"svg"` are byte-for-byte unchanged.

**And `"dom"` no longer cuts the bottom row**, which `ceil` exposed rather than caused. The box
declared its height from `naturalRatio` — the *ideal*, unquantised height — while the grid inside it
was quantised, and because the grid is top-anchored the whole vertical disagreement landed on one
edge: up to `rows` device px off the bottom row, **60% of it** at 1000px and DPR 1. Horizontally the
same residual is centred and each side gets half; vertically there is no second edge to share with.
So after measurement the box drops the declared ratio and takes its height from
`domGeometry.gridHeightDev` — the last horizontal edge — through one in-flow child, exactly as the
canvas wrapper takes its height from its canvas. **Layout change:** a `"dom"` box is now up to `rows`
device px taller than `naturalHeight` (and at a fractional `yOffset`, up to half a device pixel
shorter). `08` **S8** has always made `naturalHeight` a default rather than a constraint, and host
CSS still overrides the height, but a host that measured the old number will see a different one.

**Breaking:** `xEdges`, `yEdges`, `snappedGrid`, `drawList`, `blitRect`, `DrawItem` and
`SnappedGrid` are removed from `@fndvit/gen-tilesets/render`. `snap` and `coverRect` stay. Added:
`uniformGeometry`, `uniformDrawList`, `domGeometry`, `parseAssetKey`, and the asset-rule checks in
`render/warn.ts`.
`blitRect` has no successor — it transposed the fill rect under a quarter turn, and a square rect
quarter-turned is the same rect.

**`apps/demo` gains a second fixture**, `Square2x2.svelte`: 2x2 solid-colour square tiles at a
~350 device px cell, in an absolutely-positioned box, with a substrate selector and a 0.1px width
control. It is the opposite regime from the footer preset — a sub-pixel error costs *more* as cells
grow, so this is where geometry shows and the footer is where softness and seams do. Its readout
prints the package's own exported geometry beside the **measured** rect of the render box, because
the last instrument was wrong in half its panels while it was being trusted (`SUBPIXEL-GEOMETRY.md`,
attempt 12) and **R1** forbids a second copy of the mapping.

**And the host draws a real export.** `apps/demo/public/atlas/` is a committed export of the footer
preset, fetched and passed through `loadTilesetFile` exactly as a consumer's would be, so the demo
now exercises the documented loading path rather than an object literal. The inline `fixture.ts` and
its five tiles are gone with it — nothing imported them once both fixtures read the archive.

**Fixed, and unrelated to the above:** `assetKey` joins with `\0`, but two call sites split on
`" "`. `assetId` came back `undefined`, the guard returned, and **a failed image decode reported
nothing through `onAssetError`**. `parseAssetKey` is now its inverse, with a round-trip test.

This changes drawn output for every config, which at `0.x` is a bump and a line here.

---

## 0.2.0 — one call to load a file, and a development build that tells you when you didn't

Setup was three hand-written files and roughly eighty lines before the README's "two imports, and
no more" bought anything. Two of those files were boilerplate this package should have owned.

**`loadTilesetFile(raw)` replaces the twenty lines every consumer copied.** `0.1.1`'s README told
the reader to write a `parseTilesetFile` and closed by admitting it: "yours to copy for now. If
enough consumers write the same twenty lines it belongs in the package, but adding it is a feature
and a version bump, not a doc change." This is that version bump.

The sequence is the value, not the saved keystrokes. `migrate()` runs **before** `validate()`,
because rewriting a `schemaVersion` is a coercion and `06` §9.2 forbids `validate()` from coercing
— and left in a README that ordering is unenforceable. Reverse the two calls and nothing complains:
the file is validated against a version it does not yet claim, and the failure is silent. Inside a
function it is a property of the package.

It corrects the snippet it replaces in one respect. The README threw a bespoke error on `migrate()`'s
`"unrecognized"` outcome; `loadTilesetFile` falls through to `validate()`, which reports it at
`/schemaVersion` as `SCHEMA_VERSION_MISSING` or `SCHEMA_VERSION_UNKNOWN` like any other error. That
is what `migrate.ts` always said should happen and what the editor already did — one error format
instead of two. `"newer"` still gets its own throw, because it is the one case where the advice is
*update the code, not the file*.

`assertValidFile` is exported alongside it, and `migrate()`/`validate()` are untouched. A host that
needs the migration steps or the structured `ValidationError[]` — the editor wants both, for `09`'s
**E16** advisory and for reporting each error at its path — keeps using them directly.

**`<Tileset>` now validates its `file` in a development build, and throws.** This softens
**S3**, which said the component validates nothing, full stop. `08` §3.4 gave the reason: "a
component that validated would be doing at sixty frames per second what belongs at load, once."
That is an argument against validating **per frame**, and a `$derived` keyed on `file` does not —
it runs when the file changes, at the same cadence as `generate()`. The cost the objection names is
not the cost this pays.

**C5** is untouched: `generate()` still trusts its input, and validation is still a separate
function. What it buys is that skipping the loader stops being silent. Undefined behaviour was the
one failure in this package that reported nothing, which sits badly next to *failure is loud* — and
the throw names the offending paths and the fix, so it teaches the API instead of just refusing.
In production the posture is unchanged: an invalid file is still undefined behaviour.

Every derived in the component reads the checked file rather than the prop, which makes
"assert before generating" structural. The alternative — a `$derived` existing only for its throw,
read back with a discarded `void` — is the line a later refactor deletes as dead.

**`src/dev.ts` was rewritten, because its central claim was false.** Its comment said both branches
were "statically analysable, so a bundler can eliminate the assertions from a production build."
They were not: `DEV` was computed in a `try`/`catch` IIFE, which no bundler folds. That cost nothing
while `DEV`'s only consumer was one inline comparison in `registry/sources.ts`. It stopped being
free the moment `<Tileset>` imported `assertValidFile`, which reaches the whole of `validate.ts`.

Measured on `apps/demo` built for production: **68.77 kB before, 58.56 kB after**, 3.2 kB of it
gzipped — ten kilobytes of validator that could never run. The fix is that both reads of
`import.meta.env` are inline. Hoisting them into a `const` costs the entire ten kilobytes back,
because the substitution puts an object *literal* there and esbuild folds the expression it can see
rather than propagating through a binding. `dev.ts` records that, and how to re-measure: build
`apps/demo` and grep the output for `SCHEMA_VERSION_MISSING`. If it is there, the fold broke.

`08` **open question 3** now has its component half, but is **not** closed — the detection is still
two sniffed bundler signals, defaulting to off, and still the provisional answer it says it is.

**`prefixedProvider(prefix)` retires the second copied file.** `defaultProvider` already shipped
with identical logic and was already the component's default, so the README's provider snippet was
a re-typing of it that changed one thing: the base path. Both now share one `meta.src` read and one
throw site.

Its join is normalised, which is the part worth having. SvelteKit's `base` carries no trailing
slash and Vite's `import.meta.env.BASE_URL` always does, a difference `0.1.1` explained twice in
prose and left to the caller to get right. Writing a test for it caught a bug in the first
implementation: treating an empty prefix as *no* prefix returned the bare relative path for
`prefixedProvider("/")` — reintroducing the 404 the function exists to prevent, in Vite's default
configuration. The separator is now always emitted.

**Cost.** Two new exports on the root entry, one on `/render`, and no removals. `packages/tileset/src/`
changed, but nothing in the generation path did: no hash, no channel, no attribute. Generated
output is byte-identical to `0.1.1`. Steps 5 and 6 of the README lose about seventy lines of
copy-paste between them, and the walkthrough is still six steps.

`src/load.test.ts` and `src/render/provider.test.ts` are new — the latter covering
`defaultProvider`, which had shipped with no test at all. The component's branch cannot be
unit-tested here (Vitest 2 bundles Vite 5, the Svelte plugin needs Vite 8), which is why the
assertion lives in a `.ts`. `apps/editor`'s `newDocument` gained the `validate()` assertion it
never had: the starting document being legal is now load-bearing at runtime, since an invalid one
would throw on the editor's first paint rather than drawing `08` §3.4's blank preview.

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
