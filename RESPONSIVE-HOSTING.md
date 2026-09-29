# Responsive hosting

How a tileset behaves in a real page whose text reflows, why a gap painted for a heading does not
stay under that heading, and what the four available answers cost.

This is an **investigation record**, not a contract, and it follows `SUBPIXEL-GEOMETRY.md`'s
convention: `ARCHITECTURE.md` says how the renderer is built, the source comments carry the
rationale at each point of use, and this document carries the part that belongs to no single point
of use. Nothing here is normative. **Nothing here is built** — Sections 3 and 4 describe designs
that were reasoned through and deliberately not implemented, and the reasoning is the payload.

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
