# Responsive hosting

How a tileset behaves in a real page whose text reflows, why a gap painted for a heading does not
stay under that heading, and what the four available answers cost.

This is an **investigation record**, not a contract, and it follows `SUBPIXEL-GEOMETRY.md`'s
convention: `ARCHITECTURE.md` says how the renderer is built, the source comments carry the
rationale at each point of use, and this document carries the part that belongs to no single point
of use. Nothing here is normative. **Sections 3 and 4 are not built** — they describe designs
that were reasoned through and deliberately not implemented, and the reasoning is the payload.
**Section 7 is built** (0.6.0): it is what replaced Route B, and it says why. **Section 8** applies
the same questions to `<TileDecoration>`; §8.2's fix is built (0.7.0), the rest is not. **Section 9
is built** (0.7.0): Route C, as responsive rules, and what it costs that Route E did not.

Every claim about the code below was made with the file open, and cites where.

---

## 1. The problem, stated once

An author designs a tileset against a screenshot of the page it is destined for, and paints gaps
where the hero's text will sit — a `rect` or a hand-painted `cellList` over a `{tileId: null}`
palette, which is the "clear this cell" mechanism (`04` §6.3; `generate.ts:150` explains why this
and not `opacity: 0`). In the editor the gaps hold at every preview width. In a real page they do
not.

**A tileset defines one continuous proportional coordinate system. CSS text defines a second,
discontinuous one. A gap holds exactly where the two coincide.**

*The tileset's system.* `s = Wpx / layout.referenceWidth` — the scale comes from **width alone**,
and height never affects it (`render/geometry.ts:49`). Every quantity in the picture is a fixed
fraction of the box's width. Halve the width and the gap halves in both dimensions, because `s` is
the only thing that changed. There is no other degree of freedom: `Tileset.svelte:231` regenerates
on `file.config`, `seed` and `loadSalt` and on nothing else, so "a viewport resize changes `s` and
nothing else, and every cell keeps its TileState and moves to a new rect".

*The text's system.* Font sizes are `rem`, or they step at media queries, and lines **rewrap**. The
block's height is a step function of its width, not a linear one. Three lines at 1440px is five at
900px and nine at 375px — while the gap reserved for it has scaled to 0.26 of its design size.
The two curves do not merely differ by a constant; one of them is not even monotone in the same
direction.

That is the whole of it. It is not a defect in either system. There are three ways to make the two
coincide, and a fourth that looks like a way and is not.

### What the code fixes in place

Worth having in one list, because each of these closes off an answer someone will reach for:

- **`rows` and `columns` are config fields, fixed.** `generate()` reads them and loops
  (`generate.ts:62`). `cellSize` and `referenceWidth` live in `Layout` and only the renderer reads
  them. The editor *derives* `columns` from `referenceWidth / cellSize` and **displays it, never
  edits it** — `apps/editor/src/derive.ts`, Invariant **E1**.
- **Gaps are `coordinateBound`.** `rect` and `cellList` are flagged so in
  `registry/selections.ts`; the four procedural Selections are not. This is why the editor raises a
  destructive-edit confirmation naming each at-risk Operation when a re-derive would move the grid
  under them (`apps/editor/src/App.svelte:325`).
- **Vertically, the host is on its own.** `07` §7.3: the grid is top-anchored, a box shorter than
  the natural height cuts the bottom rows, a taller one leaves dead space below them. There is no
  cover, no vertical centring, and no substrate provides either. This is why a **tileset-driven
  hero height** is the good case — the box takes `naturalRatio` and the content sits on top. A hero
  that imposes its own height is choosing one of the two bad outcomes.
- **The reserved `layouts` extension point does not solve this.** `06` §12 and `spec/ROADMAP.md`
  §4.2 reserve `layout` becoming `layouts` keyed by `minWidth`, and `PreviewFrame.svelte:85`
  reserves the *word* "breakpoint" for it. But a `Layout` is four fields — `cellSize`,
  `referenceWidth`, `yOffset`, `horizontalAlignment` — and gaps live in `config.operations`. A
  breakpoint that selects a `Layout` changes cell **density**. It cannot move a gap. Anyone who
  reads the roadmap and concludes the problem is already scoped has misread which noun is keyed.

---

## 2. Route A — put the text into the tileset's coordinate system

The cheap one, and the exact one. `container-type: inline-size` on the hero, `<Tileset>` at 100%
width, the text absolutely positioned in **percentages of the same box**, and every font size,
`max-width` and offset expressed in `cqw`.

Then text and tiles scale by the identical factor, and the gap holds at every width in the band —
exactly, with no measurement, no regeneration and no package change. It is the same picture the
editor preview shows, for the same reason: `07` §5.3 makes every quantity a fixed fraction of
`Wpx`, so dragging the preview handle "shows the author the true responsive behaviour of the file
at that width, exactly and with no approximation" (`PreviewFrame.svelte`, header).

**Its limit is readability, not geometry.** At 375px, type authored against a 1440px reference is
at 26% of its design size. The geometry never breaks; the words become unreadable. So Route A does
not remove the need for a second design — it **maximises the width of the band one design covers**,
and therefore minimises how many designs are needed. That is the correct way to value it: not as an
alternative to breakpoints but as the thing that makes breakpoints rare.

The cost, stated honestly: `cqw` typography means the hero's type no longer matches a `rem`-based
scale used elsewhere on the site, and the hero becomes a self-contained scaling island. For a hero
that is usually the right trade, and it is a trade rather than a free lunch.

---

## 3. Route B — DOM-measured reserved gaps

**Not built.** Reasoned through here because it is the only route that survives text the author has
never seen.

### The shape

The host measures its real text elements' client rects against the render box, converts them to
cell coordinates, and appends a clearing Operation to a *copy* of the config before handing the file
to `<Tileset>`:

```ts
cellRectFromClientRect(g: GridGeometry, box: DOMRect, target: DOMRect, padCells?: number): Extent
withClearedRegions(config: TilesetConfig, regions: Extent[]): TilesetConfig
```

The second appends one Operation per region — `selection: {type: "rect", ...}`, `source:
{type: "constant"}`, `target: "tileId"`, `blend: "set"`, `mapping: {palette: [{tileId: null,
weight: 1}]}` — at the end of the stack, which is where a mask belongs.

### Why it does not violate G5

`02` **G5** keeps the engine blind to pixels, and `ctx.ts` describes itself as "the doorway a pixel
measurement would enter through", held shut by **O4**. Route B does not open that door. The
measurement never reaches `ctx`; it reaches the **config**, upstream, in the host — and a config is
a value the host may compute however it likes.

The precedent is already in the repository. `apps/editor/src/paint.ts` converts pointer coordinates
into cells today, using the package's exported `cellAt` and reimplementing nothing (`08` **S10**,
`07` **R1**), and the brush writes the resulting `cellList` into the file. Route B is that same
conversion performed at runtime instead of at authoring time. The novelty is *when*, not *what*.

### The dividend positional hashing pays here

Randomness is addressed by `(x, y)` rather than drawn from a stream — `hash.test.ts:64`, *"is
positional, not sequential"*, with the comment naming resize stability as what it buys. Two
consequences make Route B viable at all:

- **A mask that moves disturbs no other cell.** Hash channels are keyed by `operationId`, a string,
  not by index (`generate.ts:118`), so appending an Operation renumbers nothing — and a `rect`
  Selection with a `constant` Source consumes no hash channel whatsoever.
- **A cell cleared at one width resolves the identical asset when it returns at another.**
  `generate.ts:155` resolves `assetId` from a global `ASSET_CHANNEL` on `(x, y)` alone, downstream
  of every Operation. Uncover a cell and the same tile comes back, not a new draw.

Under a sequential PRNG this idea would be unworkable: every change to the mask would reshuffle
everything after it. Route B is a dividend of a decision made for an entirely different reason, and
that is worth recording as such — it is the kind of thing that only shows up when someone tries to
build the thing the decision quietly permitted.

### What it costs

**Regeneration on resize.** **R12** is not broken: the config genuinely changed, and regenerating on
a config change is the component's contract. But the *property* R12 protects is gone — a full
`O(rows × columns × operations)` generate per resize, on a path that today is a pure rescale. The
mitigation is the nice part: **quantise the measured rect to the cell lattice and regenerate only
when the cell rect changes.** The pixel rect changes on every frame of a drag; the cell rect changes
a handful of times across the whole sweep. The lattice supplies its own hysteresis for free.

**Rounding must have a fixed sign.** Round the gap *outward*, always, plus a cell of padding. This
is `SUBPIXEL-GEOMETRY.md`'s DOM lesson transplanted: `domGeometry` quantises with `ceil` precisely
because a residual whose sign is free produced a page-backdrop gutter at about half of all widths
and a clip at the rest — a defect that only happens sometimes, which is the worst kind to diagnose.
A gap that falls one cell short at some widths and not others is that same failure wearing different
clothes.

**SSR.** The server measures nothing, so the first paint has no gap. The honest arrangement is to
author a static fallback gap in the file and let the measured one refine it: the measurement is a
correction, never the source of truth. (For the `canvas` substrate there is no server-rendered
picture to be wrong; for `dom`, which is the substrate that exists for SSR, there is.)

**The conceptual cost, which is the real one.** Today the file plus a width fully determine the
picture, and the picture at any width is a pure scale of one design. Route B makes the output
width-dependent in a discrete way, and the file stops being the whole story. That bears directly on
the frozen vector tables `05` §11 requires before `1.0.0` and that ADR-004 exists to keep
regeneratable until then: a scale-invariant picture is pinnable by a table, and a viewport-dependent
one needs the viewport in the table.

**Where the code would have to live.** It needs `GridGeometry`, so `render/` — but it produces a
config, which is engine-space. It would be the one function flowing render → engine, against every
arrow in `ARCHITECTURE.md`'s data-flow diagram. That is tolerable only if it is labelled a **host
utility** that sits outside the pipeline rather than a stage within it, and the label would have to
be in the module header, because the import graph would not say it.

### When it is actually right

When the copy is not known at authoring time: CMS-driven, user-generated, or translated. Routes A
and C both require the author to have seen the text block they are cutting a hole for. Route B is
the only one that does not, and for dynamic copy it stops being a luxury and becomes the only
correct answer.

---

## 4. Route C — breakpoints in the file

**Not built.** Two different things wear this name, and conflating them is the trap.

### C1 — `layouts` keyed by `minWidth`

*Superseded in 0.7.0 by responsive rules — §9 — which key shape overrides by the render box's
width. The SSR cost named below is answered there with a container query.*

The reserved extension point. Per-band `cellSize` and `referenceWidth`, so tiles stop being five
pixels wide on a phone. It solves **density**, not gap placement — see §1's last bullet.

One cost is not obvious and is worth naming, because it is paid for a feature that does not fix the
stated problem. Today `naturalRatio(layout, rows)` is a constant with `Wpx` cancelled out
(`render/geometry.ts:226`), which is what lets the box reserve the correct height *before*
measurement and is why the `svg` substrate measures nothing at all. With `layouts`, the ratio
depends on which band you are in — so either the component must measure before it can reserve
height, or the host must declare its band. That is a genuine regression in the SSR story.

### C2 — per-breakpoint *configs*

Variants carrying their own `rows`, `columns`, `operations` and `layout`, over one shared `tiles`
array. This is the honest structural answer to *"a phone hero is a different design, not a squeezed
one"*.

The question to ask of it is **what is actually shared**, and the answer is the tiles and their
assets. That is not nothing: the alternative is two export zips carrying the same forty SVGs, which
drift apart the first time one of them is edited.

Costs, concretely:

- `schemaVersion` 3, with a mechanical `migrate` — wrap the single config in one variant at
  `minWidth: 0`. Clean, and exactly the kind of rewrite `migrate()` exists for.
- `validate()` walks every variant, at full strictness, with error paths that name which.
- `orphans.ts` computes reachability across all variants at once, or **E12** starts lying about what
  a deletion orphans.
- The editor becomes variant-scoped throughout: which variant am I editing, which one is previewed,
  which one does a reseed touch.

Two things fall out pleasingly. `history.ts` snapshots the whole file (**E6**), so undo needs no
change at all. And the preview-width control becomes a **real** breakpoint selector rather than a
viewing aid — which is precisely what `PreviewFrame.svelte:85` anticipated when it reserved the
word.

Crossing a breakpoint at runtime pops visibly. That is correct rather than a defect: it is a
different design, and pretending otherwise by cross-fading would be pretending the two are versions
of one picture.

**Which width selects the variant must be the render box's, not the viewport's.** `08` gives the
component no width prop and no business reading the viewport. An optional host-supplied override is
the escape hatch that keeps SSR and the `svg` substrate working, since the host knows its own media
queries and the component, before measurement, does not.

---

## 5. Route D — the one that looks right and is not

Someone will propose deriving `columns` from the live viewport so the cell keeps a constant CSS
size and the grid reflows, gaining and losing columns as the window moves. Positional hashing
genuinely permits it: `hash.test.ts:64` is exactly that guarantee, and growing the grid leaves every
existing `(x, y)` byte-identical.

It is still wrong here, for three reasons, recorded so it is refuted once rather than re-proposed:

1. It discards `07` §5.3, which makes every quantity a fixed fraction of `Wpx`. That is the render
   model, not a detail of it.
2. It contradicts **R12** directly — this *is* regeneration on a width change, with no config having
   changed.
3. Every `coordinateBound` Selection in the file would need an anchoring story that does not exist.
   The gap would stay pinned to column 12 while the grid grew to 96 columns around it. You would
   land back at Section 3's problem, having also rewritten the renderer to get there.

---

## 6. Recommendation

For a hero whose height is driven by the tileset, with the typography still undecided:

1. **Adopt Route A, and settle the typography question that way.** The hero as a container, type in
   `cqw`, text positioned in percentages of the render box. It costs nothing, it is exact, and it
   buys the widest band a single authored design can cover.
2. **Find the band's real edges empirically**, with the instrument that already exists: pin the
   screenshot with the reference-image layer (`apps/editor/src/reference.ts` — a viewing control
   that writes no field, **E11**) and sweep the preview-width handle across the band. The presets
   `[375, 768, 1024, 1440]` are already there. The band ends where the **text stops being
   readable**, not where the geometry breaks. The geometry never breaks.
3. **Below that edge, author a second file** and let the host swap it —
   `<Tileset file={narrow ? mobile : wide} … />` works today, with zero package change, and is a
   truthful prototype of C2. If the file count or the duplicated asset payload ever becomes the
   actual pain, *that pain is the gate C2 is waiting on*. Build it then, and not before.
4. **Hold Route B in reserve for dynamic copy.** If the hero text becomes CMS- or
   translation-driven, it goes from luxury to the only correct answer, and the shape it should take
   is in §3.

One constraint outranks the choice of route. Because the grid is top-anchored and the render box is
the only clipping boundary (**R9**, `07` §7.3), **the hero must take its height from the tileset
rather than impose one on it.** A hero with an independent height either cuts the bottom rows or
opens dead space beneath them, and no substrate covers, centres, or stretches to hide it.

---

## 7. Route E — render-space masking. **Built, in 0.6.0.**

`options.avoid` is Route B's measurement with none of Route B's costs, because it moves the result
to a different place. Route B turned the measured rects into clearing *Operations* and appended
them to a copy of the config; Route E turns them into a **per-cell mask** that the substrate reads
when it paints (`packages/tileset/src/render/occlusion.ts`). The grid is generated once, exactly as
without it.

Taking Route B's cost list in order:

- **Regeneration on resize — gone.** Nothing reaches `generate()`, so **R12**'s property, and not
  only its letter, survives: a resize is still a pure rescale, plus a mask recomputed in
  O(rects + cells covered). Route B's lattice hysteresis is still collected, one level further down:
  `stableMask` keeps an unchanged mask's identity, so a resize that moves no rect across a cell edge
  touches no attribute and repaints nothing extra.
- **Rounding with a fixed sign — answered differently.** The mask is computed on the lattice the
  substrate actually painted (`Lattice`: the ideal one for canvas, `domGeometry`'s for DOM), and a
  cell is claimed when its square meets a rect with positive area. There is no second rounding to
  get the sign of, so nothing can fall a cell short at some widths. `avoid.padding` is the outward
  margin §3 asked for, as a host choice rather than a fixed cell.
- **SSR — answered by not drawing.** With `avoid` set, the DOM box is `visibility: hidden` until the
  first mask, and the canvas draws nothing until then, which it already did. An authored fallback
  gap is no longer needed, because nothing is shown that a gap would have to be correct for.
- **The conceptual cost — gone.** The file plus `(seed, loadSalt)` still determine the grid
  completely, and the vector tables `05` §11 needs still pin a scale-invariant grid. What depends on
  the viewport is which cells are *drawn*, which is render space and was always viewport-dependent.
- **Render → engine — gone.** The one function §3 feared would flow against every arrow does not
  exist. `space.ts` converts client rects into render space; `occlusion.ts` turns render space into
  a mask; neither produces a config.

Two decisions that §3 did not have to make:

- **The lattice cell, not the drawn tile.** A tile scaled past its cell can still reach over the
  text from a neighbour. Testing the painted bounds would catch that, and was declined for the
  predictable rule: the hidden region is the cells under the element and does not change when an
  attribute does, which is also what keeps a future animated transform from turning a per-layout
  mask into a per-frame one.
- **Both substrates.** The mask is applied at paint, so the canvas skips masked cells as cheaply as
  the DOM hides them. That was conditional on the canvas never showing a frame of tiles over the
  text during a resize. It holds because `measure.ts` flushes inside the `ResizeObserver` callback,
  after layout and before paint, and reports the width and the rects together. Checked by driving
  `apps/demo`'s Hosting fixture through 120 frames of continuous resize at DPR 1 and 2.

**§6's recommendation, revisited.** Route A is still the cheapest exact answer for copy you control,
and C2 is still the answer to "a phone hero is a different design". But Route B's reserve case —
copy that is CMS-driven, user-generated or translated — no longer waits on anything: it is
`options.avoid`. And because `sizing: "fixed"` now exists (cells at a constant CSS size, cropped by
`align.x` instead of scaled), §1's density complaint about tiles going five pixels wide on a phone
has an answer that does not need C1 either.

§5 still stands. `sizing: "fixed"` crops a grid authored for the widest box; it never adds columns.

---

## 8. Decorations. **§8.2 built in 0.7.0; the rest not built.**

What the two questions above — how a picture responds to width, and whether it can see the page —
come to for `<TileDecoration>` (`packages/tileset/src/decoration.ts`,
`packages/tileset/src/render/TileDecoration.svelte`). Nothing in this section is implemented; it
records what the code does today, one silent failure found on the way, and the one design the
reasoning favours.

### 8.1 What a decoration does on resize today

The box is `width: {columns * cellSize}px` with `max-width: 100%` (`TileDecoration.svelte:111`),
and `decorationFile` writes the same product into `referenceWidth` (`decoration.ts:133`), so
`s = 1` whenever the box gets the width it asked for. That gives two regimes and nothing between:

- **The slot is at least `columns * cellSize` wide: nothing happens.** The box's width is a
  constant, so its `ResizeObserver` entry never fires and the picture never changes. The page
  moves the decoration around; the decoration does not notice.
- **The slot is narrower: the whole decoration scales down.** `max-width` lowers `Wpx`, `s` falls
  below 1, and every tile shrinks in proportion — the ordinary fluid model, with the same cells and
  the same tiles, only smaller. The component's own comment calls this degrading gracefully, and
  geometrically it is. It costs two things the feature was built for:
  - **The page stops reading as one grid.** Only the spots too wide for their slot shrink. In
    `apps/demo/src/Decorations.svelte` at a 375px viewport, the 820px breakpoint's two tracks are
    about 147px each (375 − 2 × 24px `.page` padding − a 32px gap, halved; `<Decorations>` sits
    outside `App.svelte`'s `<main>`, so nothing else pads it). Spots `f` and `g` are 4 × 44 =
    176px, so they draw at about 37px tiles beside 44px neighbours. That is exactly the mismatch
    `CELL`'s comment says one tile size exists to prevent.
  - **The subpixel residual comes back.** `decoration.ts`'s header says `SUBPIXEL-GEOMETRY.md`'s
    whole subject is *absent* from a decoration at integer DPR, which holds only at `s = 1`. A
    shrunk spot is an ordinary fluid tileset at a fractional scale.

`options.sizing: "fixed"` is forwarded like every other option and would crop instead of scale,
but it crops at a pixel. A decoration's edge is visible against the page's backdrop (that is why
the demo's background is light), so the crop shows up as a half tile.

### 8.2 `options.avoid` through `<TileDecoration>`

*Fixed in 0.7.0, by a different route than the sketch below: the package marks every wrapper it adds
with `data-tileset-wrapper`, and `measure.ts`'s `scopeOf` walks past them to the host's section. An
explicit scope threaded through an internal prop was rejected because every wrapper added later
would have had to remember to pass it — and responsive rules added one immediately. Pinned by a
`measure.test.ts` case. The analysis below is kept as it was written.*

`options` goes through untouched, so `avoid` reaches `<Tileset>`. Two things are wrong with the
result.

**The selector form silently matches nothing.** `Scheduler.track` sets `scope: box.parentElement`
(`measure.ts:199`), and a selector is resolved inside that scope, excluding the box and anything
in it (`measure.ts:368`). Inside `<TileDecoration>` the box's parent is the `.decoration` wrapper,
and the only thing in the wrapper is the box. So `avoid: { targets: "h2" }` resolves to an empty
list, and the MutationObserver watches a subtree that can never change. Nothing throws and the
picture looks plausible, which is the failure CLAUDE.md says this package refuses to have. The
element form (`targets: el` or a list) is used as given and works.

**It is rarely meaningful anyway.** A decoration normally sits *beside* copy, in its own slot, so
no lattice square meets a target and the mask is all zeros. It only does something when a
decoration overlaps content: an ornament absolutely positioned behind a card title, or a cluster
set behind a pull quote. For those, hiding the tiles under the text as it rewraps is the same win
§7 describes for a hero.

*The fix, sketched.* Let `track` take an explicit scope, defaulting to `box.parentElement`, and have
`<TileDecoration>` pass its wrapper's parent through an internal prop of `<Tileset>` — not a
`TilesetOptions` field, because no host needs it and every option is a thing a host can get wrong.
A `measure.test.ts` case with the existing fake observers would pin it: a selector resolves in the
given scope and still never matches inside the box.

### 8.3 Fit to the slot — Route D, in the one place it is right

A decoration that keeps its tile size and **gains or loses whole columns** with the slot's width
would fix both costs in §8.1 at once. That is Route D, which §5 refutes. But §5 refutes it for a
page-scale tileset, and none of its three reasons carries over:

| §5's reason | For a decoration |
| --- | --- |
| 1. It discards `07` §5.3, "every quantity is a fixed fraction of `Wpx`". | A decoration already declares its tile in CSS px (`s = 1`). Fluid scaling is not its model, only the fallback it degrades into (§8.1). |
| 2. It contradicts **R12**: regeneration on a width change with no config change. | `rows` and `columns` are props, and `decorationFile` builds a new config from them, so R12's letter holds, as it did for Route B. The cost of the property is small: quantise to `floor(W / cellSize)`, so it regenerates only when a whole column starts or stops fitting, over a grid of tens of cells. |
| 3. `coordinateBound` Selections have no anchoring story. | A decoration style may not contain one. `decorationStyleErrors` is exactly that check, and `<TileDecoration>` throws on it under `DEV`. |

The positional-hashing dividend of §3 applies again. Randomness is addressed by `(x, y)`
(`hash.test.ts:64`), and a decoration grows and shrinks on the right with x = 0 fixed, so every
cell that survives a change of width keeps its TileState and its asset. **The exception is
`gradient`**, which takes its domain from `ctx.extent` and so renormalizes when the extent changes.
`decoration.ts` already documents that it renormalizes per decoration; here it would also
renormalize per width step.

*The shape, if built.*

- A pure `fitCells(available, cellSize, { min, max })` in `decoration.ts`, returning
  `clamp(floor(available / cellSize), min, max)`. It treats a zero or negative `available` (the one
  frame a box has at startup) as `max`, so the first frame never shows a zero-column decoration.
- `columns` (and `rows`) on `<TileDecoration>` accept either a number, which behaves exactly as
  today, or a `{ min, max }` range. With a range, a slot element at `width: 100%` is observed with
  the exported `track(el, null, …)` (`measure.ts:471`). That puts it on the page's one scheduler,
  which flushes inside the `ResizeObserver` callback, so the new column count is painted in the
  same frame as the resize.
- SSR renders `max`, with today's `max-width` shrink as the fallback until the client measures.
  The shrink is a correction the client makes, not a wrong picture that would need hiding.
- Fitting rows needs a slot with a definite height, for §1's reason: vertically the host is on its
  own.
- The tests it would need: a `fitCells` table, and `generate()` at `n` and `n + 1` columns agreeing
  on every shared `(x, y)` for the demo style. That asserts the stability claim above rather than
  believing it, the way `decoration.test.ts` asserts zero bleed.

### 8.4 When each is worth building

- **Fit to the slot**, when decorations must keep one tile size down to phone widths — the first
  time §8.1's worked example shows up on a real page and is judged a defect rather than an
  acceptable shrink.
- **The `avoid` scope fix**, when the first decoration overlaps copy. Or sooner, because the
  failure is silent: the first time someone passes a selector and gets nothing, this section is
  the diagnosis.

---

## 9. Route C, as responsive rules. **Built, in 0.7.0.**

C1's "layouts keyed by width" and the decorations' "same design at another size" turned out to be
one mechanism. `shape.ts`'s `reshape(file, override)` overrides the shape — `rows`, `columns`,
`cellSize`, `bleed`, `yOffset` — and shares the design by reference; a responsive rule is that
override with a width condition, stored in the file (schema v3) or passed by the host
(`options.responsive`, which replaces the file's). `<TileDecoration>` is its zero-bleed preset.

**What it solves, and what it does not.** It answers §1's density complaint and "more rows on a
phone" without a second file. It does **not** move a gap: `rect` and `cellList` still pin `rows` and
`columns`, and `validate()` refuses a rule that resizes a stack holding one
(`COORDINATE_BOUND_RESIZE`). Gaps under reflowing text remain Route E's. "A phone hero is a different
design" remains C2's — a second file — because rules change the shape and never the design.

**The cost Route E avoided and this one pays.** §7 made a point of the file plus `(seed, loadSalt)`
determining the grid with no viewport involved. Rules give that up, deliberately and in the one
discrete way §3 described: the render box's width now selects which config reaches `generate()`.
`generate()` itself is untouched — it still receives a config and never a pixel (**G5**) — but the
picture on a page is a function of `(file, seed, loadSalt, band)`, and the vector tables `05` §11
requires will need the band in them. That is why the mechanism is shaped the way it is:

- **The band is a pure function of the width** (`responsive.ts`'s `activeKey`), so a table can pin
  `(rules, width) → override` without a browser, and `bandWidths` enumerates every band exactly.
- **Positional hashing pays its dividend a third time.** A cell present on both sides of a bound
  keeps its TileState and asset, so a breakpoint extends or trims the picture rather than
  reshuffling it — except under `gradient`, which spans whatever grid it is in, and that is pinned
  in `shape.test.ts` as the documented exception.
- **§3's lattice hysteresis, in a new place.** Regeneration happens only when the active key
  changes *and* `rows` or `columns` changes to a size not seen before (`GridCache`), so a resize
  inside a band is still a pure rescale and a window dragged back and forth generates once per
  shape.
- **C1's SSR regression is answered.** The box reserves each band's height with a container query
  (`reservationCss`) before anything is measured, and the tiles wait for the measurement, as they
  do under `avoid`. The cost moved to a requirement: a responsive tileset's parent needs a definite
  width, because the wrapper carrying the query has inline-size containment.
- **No hysteresis in the band itself.** A rows change can toggle the page scrollbar and push the box
  back across a bound; the picture stays a pure function of the width at every frame, and a
  development build names the loop instead of hiding it (`FlipFlop`).
