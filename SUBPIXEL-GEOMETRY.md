# Subpixel geometry

Why a responsive tile grid cannot have square cells, hard edges and an exact fit at the same time,
what we tried, and what each attempt cost.

This is an **investigation record**, not a contract. `ARCHITECTURE.md` says how the renderer is
built and the source comments carry the rationale at each point of use; this document carries the
part that belongs to no single point of use — the cross-cutting argument, and the dead ends. Its
claims are either measured or marked open. Nothing here is normative.

**The investigation is finished and its conclusion has shipped.** Fifteen attempts, four dead
theories about browser mechanisms, and two laws worth keeping: the residual is geometry rather than
paint, and apparent crispness of a curve goes as `1 / cellDev` rather than as the asset-to-cell
ratio. *The recommendation* below is the conclusion, confirmed from `cellDev 4` to `cellDev 190`.

**One thing changed after it shipped**, and it is recorded in *Addendum — the DOM residual had a
sign* below rather than woven back into the attempt log: the DOM substrate quantises its cell **up**,
because it is the one substrate that feels the residual's sign rather than its size.

**0.6.0 removed the `"svg"` substrate.** Its measurements below are kept as they were taken; the
reason for the removal is in `ARCHITECTURE.md` *Two substrates*. Where this file says "three
presentations", read it as the record of what was compared, not as what ships.

**It is now what `<Tileset>` does.** `packages/tileset/src/render/uniform.ts` holds the geometry,
`substrate` selects one of the three presentations, and the centre-crop chord that started all of
this is gone — not because the crop changed, but because a square cell leaves it nothing to remove.
Start at *The recommendation* and *Status*; the attempt log is why, not what.

**The instrument no longer exists.** Every reading below was taken on a grid harness in `apps/demo`
that was deleted once it had done its job — it held a second copy of the coordinate mapping, which
is `07` **R1**'s named failure, and keeping it beside a shipped implementation would have been worse
than losing it. The readings are recorded here because this file is now the only record of them.
Anything below stated as measured was measured; nothing has been re-derived from memory.

---

## The law

`generate()` lays out `columns` square cells across a box of `Wpx` CSS pixels. On screen that box
is `Wpx * dpr` **device** pixels, and edges can only land on whole ones — a fractional edge is what
antialiasing *is*. So the arithmetic is a division with a remainder, and the remainder is almost
never zero:

```
idealCell = Wpx * dpr / columns                    fractional
cellDev   = round(idealCell)                       one integer, every cell
residual  = Wpx * dpr - columns * cellDev          up to columns / 2 device px
```

The residual cannot be discarded and cannot be hidden. It can only be **assigned**. Every strategy
below — including ones that look nothing alike — is a different answer to who receives it.

## Two axes, which kept being mistaken for one

Most of the wasted effort came from treating two independent questions as one.

**Axis 1 — substrate.** Seams and interactivity are genuinely substrate properties. **Vector
sharpness turned out not to be one at all**, which is the single most expensive thing this
investigation got wrong: attempts 6, 7, 8 and 15 all died trying to make it one.

**Axis 2 — where the residual goes.**

| Answer | Cost | Measured |
| --- | --- | --- |
| spread across all cells | cells non-square → the crop chord. **This was what shipped, and is the bug.** | 1 device px spread |
| into a few cells | most cells exact, a few visibly distorted | — |
| overhang, then clip | columns cut off the sides | 37 CSS px / side |
| undershoot → gutter | page backdrop through a full-bleed band | 550 of 1101 widths |
| overhang *by construction* | columns cut off the sides, but never a gutter | 0 of 3000 widths gutter |
| uniform resample | one isotropic scale of one bitmap, no internal edges | ±1 / (2·cellDev) |
| no snapping at all | **seams.** The baseline that explains why the others exist | +52% leak |
| snap the *box* | free and exact — only if the host controls the width | exact |
| vary the column count | perfectly crisp; the design stops looking the same at every width | — |

The last two are ruled out by the brief rather than by the numbers: a full-bleed footer does not
control its own width, and the design must look the same at every size.

**The correction that mattered.** Where the residual goes is a property of the **geometry**, not of
the painter. Every substrate faces it, and the long-standing crop bug is the canvas substrate
suffering the residual — not a canvas defect.

This is why the fix was one shared module and not a patch per substrate: `uniform.ts` computes the
cell, and all three substrates draw from it.

Numbers above are from a sweep of 1,101 widths × 3 DPRs × 2 grid presets against the package's own
`geometry.ts` and `edges.ts`.

---

## The attempt log

In order, because each attempt was *caused* by the previous one's failure. Compressed to one row
each; every number and verdict is the one that was recorded at the time.

| # | Attempt | Outcome |
| --- | --- | --- |
| **1** | **Per-edge device-pixel snapping** (`edges.ts`'s `xEdges`/`yEdges`) — snap every grid line independently. A shared edge is the same array element, so a gap is unrepresentable (**R6**). | **Seams 0% — and this is the bug.** A cell pairs `xEdges[x]` with `yEdges[y]`, two members of two independently snapped sequences, so it comes out 133×132 and **R8**'s centre-crop shaves a chord off any asset tangent to its box. |
| **2** | One inline `<svg>`, one `viewBox`, design coordinates — one affine transform, no per-cell layout rounding. | Distribution problem gone by construction. Antialiasing coverage at a fractional shared edge was not: **+52%** backdrop leak through `<image>` edges, **+12%** through plain `<rect>`. Rejected then; ships now as `substrate="svg"`, documented. |
| **3** | One uniform integer cell, `ceil` — square by construction, always covers the box. | **37 CSS px clipped per side** on a 76-column grid, roughly five columns off each end. Rejected. |
| **4** | The same, `round`. | Halves the residual and turns it negative at **550 of 1101 widths**, exposing the backdrop through a band meant to be full-bleed. Rejected. |
| **5** | **Split the raster from the layout box** — see below. | **184,968 assertions, zero failures.** Solved the geometry; did nothing for sharpness. |
| **6** | `new Image(w, h)` before `src`. Theory: an SVG rasterises at the size its image element requests. | **No-op.** The element's size is not consulted at all. A prop was shipped on this and deleted. |
| **7** | A larger declared SVG root size, sourced from browser bug reports dated 2011. | **No effect.** Stepping the declared root 12 → 400 px changed sharpness not at all, at any width. |
| **8** | "DOM is the crisp substrate", concluded from the probe row. | **Not supported.** A later reading of the same row showed the plain reference `<img>` was *also* soft — only a nested SVG `<image>` was sharp. |
| **9** | Stretch instead of crop (`object-fit: fill`). The chord is caused by *answering* non-square cells with a crop, not by the cells. | Chord gone, **seam opened** — `cover` had been doing a second, invisible job. See *the contested half-pixel*. |
| **10** | Stretch plus single-pass overdraw — inflate every cell so opaque neighbours cover each other's fringe. | Seam closed, **chord restored**, now asymmetric: cells paint in document order, so each cell's ring is covered on its right and bottom only. |
| **11** | Two passes: every inflated copy first, every exact copy second. | Works — artwork exact, underlay fills the sub-pixel gap. Costs 2× nodes and 2× paint, and is **incompatible with tile opacity below 1** by construction. Dropped by scope, not by measurement. |
| **12** | **The instrument was miscalibrated.** The harness laid panels on `1fr` tracks, so at odd widths a column began on a half pixel and every cell inherited the fraction. | The page was **manufacturing the artefact it was built to detect**, in half its panels. `cover` survives a fractional origin; `fill` does not. Fixed to integer tracks plus a per-panel alignment readout, which stayed green thereafter. |
| **13** | A competently-sized asset — a supplied 64×64 flat `<rect>` export, drawn by attempt 5's canvas. | **Crisp.** First time the word applied to a canvas path here. Does *not* settle the question: a flat fill has no curve to antialias, so it cannot separate "canvas draws vectors sharply" from "every earlier soft reading was the 12px and 36px assets". |
| **14** | A 64×64 circle tangent to all four sides, checkered against the square, plus the transform targets (`scale`, `rotation`, `opacity`) — which no panel had ever exercised. | **Passes on every count.** No chord at the tangent points; the 90° panel indistinguishable from identity; scaled panel's gap equal on all four sides; opacity collapsing onto identity at alpha 1; and no correlation between a cell's scale and its opacity, so the three Operation ids draw genuinely independent hash channels (`04` §8, previously unchecked). |
| **15** | The small-cell probe — see below. | **H1 holds, H2 is dead.** |

### Attempt 5, in full — the split

The insight that there *is* a fourth place. Rasterise at exactly `columns * cellDev` device px — the
canvas *is* the grid, no origin to round, nothing to centre — then present that single bitmap at the
**ideal fractional** width. The residual becomes one isotropic resample where no internal edges
exist to seam. `height: auto` on a `<canvas>` takes the vertical scale from the backing-store ratio,
so isotropy is by construction rather than by a second calculation that could disagree.

Verified: square cells, exact proportion, clip never exceeding the designed bleed, vertical scale
identical to horizontal. Resample bounded by `1/(2*cellDev)`. Worst case **12.17%** (76 columns,
DPR 1, 341 px) — the bound is only comfortable while `cellDev` is, and at a 4 px cell it is not.

### Attempt 14's prediction, recorded before the reading

**The 90-degree panel should be indistinguishable from the identity panel.** `edges.ts`'s `blitRect`
transposed the fill rect for quarter turns because per-edge snapping makes the device rect 133×132
and rotating *that* leaves a hairline — but a square rect rotated 90° **is** the same rect, so the
uniform cell should remove that special case rather than need it. The uniform-cell path never called
`blitRect`, which is what made this a test of the claim and not of the workaround.

**It read as predicted, and `blitRect` was deleted rather than ported.** `uniform.test.ts` asserts
the quarter turn maps the square cell rect onto itself as an exact set of integer corners — the same
regression check, without the workaround it used to check.

The choice of 90 over 45 cost coverage, stated rather than left to be found: every angle drawn was a
multiple of 90, so `sincos`'s general `Math.sin`/`Math.cos` branch went unread, along with the
maximum-overflow case a 45-degree diamond would give.

### Attempt 15, in full — where the softness actually comes from

Prompted by a reading that looks backwards: **the circles were crisper on the coarse 8×4 preset than
on the 76×10 footer**, even though coarse is a 1.48× *upscale* of a 64px asset and the footer is a
6.4× *downscale*. If asset resolution were the whole story it would be the other way round.

It is not backwards — the arithmetic is *The 1/cellDev law* below. What the law does not settle is
how much of a 10px circle's softness is **irreducible**:

- **H1** — the fringe is geometry. A 10px circle is 10% fuzz and no draw path helps.
- **H2** — it is a *double* resample. `new Image()` rasterises the SVG at its intrinsic 64px and
  `drawImage` then filters 64 → 10 in one step; a **native** rasterisation at 10px might hold its
  edge better.

Three columns per size (10, 16, 24, 48 device px): one-step `drawImage`; the SVG rasterised **at**
the destination size and blitted 1:1; and captured from an `<img>` laid out at that size. Each canvas
at its true size, magnified 8× with `image-rendering: pixelated` — on the canvas, never on the SVG,
because magnifying an SVG re-renders it at the new resolution and the artefact disappears.

**Read: the three columns are indistinguishable.** At 16 device px all three carry the same
one-to-two pixel ring of partial coverage. The softness of a small circle is the **irreducible
antialiasing fraction**, not the single-step downscale. **There is no renderer fix, because there is
no renderer defect.**

Four theories have now died on this axis — `new Image(w, h)`, a larger declared root, "dom is the
crisp substrate", and the one-step downscale. **The consistent lesson is that canvas was never the
problem. Asset resolution and cell size were, and they are geometry.**

---

## The 1/cellDev law

Two independent quantities were read as one for most of this investigation.

- **Asset resolution is a ratio** — asset px over cell px. It decides whether the detail to draw
  **exists**. An upscale is missing information and no renderer recovers it. That is the ceiling
  section below.
- **Apparent crispness of a curve is an absolute** — how many device pixels the shape occupies. An
  antialiased edge costs roughly **one device pixel whatever the cell size**, so it is a *fraction*
  `1 / cellDev` of the shape. The presentation resample bound `1 / (2 * cellDev)` obeys the same law.

At width 760, DPR 1, with the 64px assets:

| preset | `cellDev` | asset / cell | ~1px edge as a share of the shape | resample bound |
| --- | --- | --- | --- | --- |
| coarse 8x4 | **95** | 1.48x **up**scale | **1.05%** | 0.53% |
| footer 76x10 | **10** | 6.4x **down**scale | **10.00%** | 5.00% |

**9.5x more relative softness at the preset with the better ratio.** Both terms go as `1 / cellDev`,
so both say the same thing: *small cells are the soft regime, and the asset ratio has nothing to do
with it.* The footer preset is exactly where the two axes disagree — an excellent ratio poured into a
terrible absolute.

**This was already in the file.** The `stretch → eccentricity` column of the crop-vs-stretch table
below **is** `1 / cellDev`: 4px→25.00%, 12px→8.33%, 26px→3.85%, 40px→2.50%, 95px→1.05%, 133px→0.75%,
190px→0.53%. Checked against `100 / cellDev` — exact at all seven rows. The reading was tabulated
under a different name and never connected to sharpness.

The practical consequence, which is the useful half: **there are two asset rules, not one.** An asset
must carry at least as many pixels as the largest cell it will be drawn into — *and* a curve needs a
cell large enough in absolute device pixels for its antialiased edge to be a small fraction of it. A
76-column grid at 760px gives a 10px cell, and no asset and no substrate makes a 10px circle look
hard-edged. Attempt 15 established that directly: the fringe is irreducible.

**Where it starts to bite**, from the readings rather than the arithmetic:

| `cellDev` | fringe | reading |
| --- | --- | --- |
| 10 | 10.00% | **visible.** The observation that prompted this section. |
| 38 | 2.63% | **fine at 1:1.** Distinguishable from a 175px cell only under magnification. |
| 175 | 0.57% | the reference. |

So the bracket is between 10 and 38, untested in between — call it *cellDev of roughly 40 and up is
comfortable* and treat anything under 20 as knowingly soft. **This is a usability threshold, not a
correctness one**, and it is stated as bracketed rather than measured because that is what it is.

A method note, because it cost one confused comparison: **browser zoom is not a neutral magnifier.**
Zooming raises the DPR, which raises `cellDev` and shrinks the fringe — it changes the thing under
inspection. Read at 100%, or magnify a fixed backing store with `image-rendering: pixelated`. Same
trap as magnifying an SVG, reached by a different route.

---

## The contested half-pixel

Attempt 9 removed the crop and opened a seam. Attempt 10 closed the seam and restored the crop. That
is not bad luck — it is the same half pixel changing hands.

`object-fit: cover` scales the image *larger* than its box and then **clips** it. A clip is a
rectangular mask, so the edge is **hard and fully opaque**. `object-fit: fill` scales the image to
exactly its box, so the image's own boundary is **antialiased** — and two abutting antialiased edges
composite to `1 - 0.5² = 0.75`, not 1, so the backdrop survives as a hairline.

```
e = 0          the backdrop wins   -> seam
e > 0, 1 pass  a neighbour wins    -> chord, right and bottom only
cover          the clip wins       -> chord, on the short axis
2 passes       an underlay wins    -> neither artwork nor backdrop loses
```

No value of ε escapes it, because the loser is always the artwork or the backdrop. The half pixel
has to go to something that is neither — which is what the uniform square cell arranges, by leaving
no half pixel inside a cell to contest.

## Why a crop screams and a stretch does not

Both policies answer the same sub-pixel discrepancy, so the intuition is that they cost the same.
They do not. Shave `c` off a circle of radius `r` tangent to its box and the flat chord is
`2*sqrt(r² - (r-c)²)`; stretch the same circle into a box one pixel shorter and the outline deviates
by half a pixel, smoothly, all the way round.

| Cell | Crop → flat chord | Amplification | Stretch → eccentricity |
| --- | --- | --- | --- |
| 4 px | 2.6 px | 5× | **25.00%** |
| 12 px | 4.8 px | 10× | 8.33% |
| 26 px | 7.1 px | 14× | 3.85% |
| 40 px | 8.9 px | 18× | 2.50% |
| 95 px | 13.7 px | 27× | 1.05% |
| 133 px | 16.3 px | 33× | 0.75% |
| 190 px | **19.5 px** | **39×** | 0.53% |

**The two columns run in opposite directions.** The crop gets *worse* as cells grow while the stretch
gets *better*. Big cells are the crop's worst case and the stretch's best, which is exactly why the
defect was first noticed on the coarse preset. They converge only at tiny cells, where a 4 px cell
beside a 5 px one is visible however it is filled.

A crop concentrates the error into a straight edge tangent to a curve, where the eye is most
sensitive. A stretch distributes it around the whole outline, where nothing catches.

## The one ceiling that is real

A tile exported at 36×36 holds **1,296 pixels**. Presented in a 95 px cell it needs **9,025**. No
canvas setting, no draw path and no substrate recovers the missing seven thousand — upscaling cannot
invent detail. That softness is *missing information* and looks identical in every renderer.

It is worth stating because it is the failure most easily mistaken for a rendering bug, and it sent
this investigation down at least two blind alleys. The rule: **an asset must carry at least as many
pixels as the largest cell it will ever be drawn into.** The production tiles declare 100×100 and a
coarse grid presents cells at roughly 190 device px, so the shipping configuration upscales about 2×
today. `render/warn.ts` reports this in a development build, and
`apps/editor/src/assets.ts` freezes intrinsic dimensions at attach (**E13**), so the editor has what
it needs to warn too.

**Attempt 13 is the first evidence for this section rather than against the renderer.** A 64px export
drawn by the ideal canvas is crisp where a 12px data URI and a 36px PNG were soft, at the same width,
the same DPR and the same draw path. That is the asset moving and nothing else. It also means the
regime has to be stated with every sharpness reading: at the coarse preset a 760px box at DPR 1 gives
roughly a 95px cell, so **even 64px is still a 1.5× upscale there**. Only the downscale regime says
anything about a renderer.

---

## The recommendation

**This is the investigation's conclusion, and it is now built.** This file is still not normative —
see the header; `ARCHITECTURE.md` carries the decision of record.

**It collapses to one geometry and three presentations.** All three substrates compute the *same*
uniform square cell — `scaleFactor * cellSize * dpr`, quantised to one integer on both axes — so a
cell is square by construction and **R8**'s crop has nothing left to remove. They differ only in
where the residual goes afterwards, and — as the addendum below records — in which way the cell is
quantised, which is the same question asked about the residual's sign rather than its size.

| Need | `substrate` | Residual goes to |
| --- | --- | --- |
| **Proportion** | `"canvas"` · uniform square cell · ideal presentation · no crop | one isotropic resample of one bitmap, where no internal edge exists to seam |
| **Interactivity** | `"dom"` · uniform square cell · snapped **up** | the **box**: horizontally an overhang that **R9** cuts rather than pads, vertically nothing — the box takes its height from the grid |
| **Crispness, seams acceptable** | `"svg"` · one `viewBox`, design coordinates, one affine transform | nowhere — no per-cell layout rounding exists to distribute |

Canvas is the choice for proportion because the split (attempt 5) is the only place the residual can
go that costs neither the artwork nor the backdrop. Attempt 14 read it against a tangent curve at
64px and found **no chord, correct transform centring, and exact quarter turns**.

**Its two asset rules are both requirements, not niceties.** Enough pixels for the largest cell
(*The one ceiling that is real*), *and* a cell of roughly 40 device px or more so a curve's
antialiased edge stays a small fraction of it (*The 1/cellDev law*). The second is the one nobody was
tracking, and it is why the footer preset looked worse than the coarse one despite a far better
asset ratio.

**What the ideal presentation costs, measured.** At a non-exact width the whole bitmap is resampled
by `presentScale`. At the coarse preset that is at worst 1.32%, and the reading is a *slight* loss of
sharpness with **no seam** — the trade the split exists to make. At the footer preset's worst width
it reaches **+12.17%** on a **4 device px** cell, the extreme of the `1 / (2 * cellDev)` bound, and
there are **still no gaps**. The seamlessness holds across the entire span of cell sizes this layout
produces, not merely in the comfortable middle. It is *soft* at 4px, which is the `1 / cellDev` law
and a different axis entirely.

A trap worth knowing when comparing readings: at a width where `idealCell` is already a whole number
of device pixels the presentation scale is exactly 1, so **the reading contains no resample at all**.
760px is such a width for both presets at both DPRs.

DOM is the choice for interactivity because canvas is one element and cannot be hit-tested per cell.
**Its stated cost is that the grid does not fit its box exactly, so the tileset does not start on
exactly the right cell.** That is the accepted trade, and it means the full-bleed footer case — exact
box, every column present — **is not served by any shipped configuration**. What *is* fixed is the
direction of the misfit: it overhangs and is clipped, never padded. See the addendum.

SVG wins crispness and proportion together and loses seams: **+52%** backdrop leak through `<image>`
edges, the worst of anything measured here. It **ships as a third `substrate` value** rather than
staying a prototype, because a documented option a host can choose is more useful than a rejected
branch nobody can reach — but its prop documentation carries the leak figure rather than burying it,
and it is not the default and never will be.

**The seams transfer, and they are not subtle.** The open question was whether that +52% — measured
against 12px data URIs — survived a competently-sized asset. Read at 837px in a flat one-colour
field, where any boundary line is by construction an artefact: `canvas` and `dom` show no boundary
anywhere, and `svg` shows **a complete grid of backdrop hairlines, one at every shared edge**. That
is the substrate working as designed and as predicted; it is the cost, in the picture.

**Not kept, and why each:**

| Rejected | Reason |
| --- | --- |
| per-edge snap + `cover` — **the configuration that used to ship** | the chord: up to 19.5px on a 190px cell, a 39× amplification of a half pixel. The bug that started this. |
| per-edge snap + `fill` + two-pass underlay (attempt 11) | **a scope decision, not a measured rejection.** The only configuration that fits the box exactly while cropping nothing, absorbing the cell variation as a `1/cellDev` stretch — 0.53% at 190px. Dropped to keep DOM to one option. Costs 2× nodes, 2× paint, incompatible with per-tile opacity below 1. Its measurements are here, so the exact-box need can be met later without re-deriving anything. |
| single-pass overdraw (attempt 10) | closes the seam, restores the chord asymmetrically on right and bottom. |
| uniform cell, `ceil` (attempt 3) | 37 CSS px clipped per side on a 76-column grid — for a substrate that has to *fit* its box. The DOM substrate does not, and takes `ceil` deliberately: see the addendum. |
| uniform cell, `round`, presented at the snapped width (attempt 4) | gutters at 550 of 1101 widths. Superseded by the ideal presentation, under which a gutter is unrepresentable. |

## Addendum — the DOM residual had a sign, and the two axes did not share it

Recorded after *The recommendation* shipped, because it is the one reading that changed a shipped
decision rather than confirming it.

**The observation.** Sweeping the demo's width slider under `substrate="dom"` alternates between two
behaviours: at some widths the outer columns are cut off, which is **R9** and expected, and at others
the grid steps to a whole number of columns and leaves **a band of page backdrop down each side**.
Only the first was intended. The second is the same residual with the opposite sign.

**Why it is visible there and nowhere else.** The demo's archive is *zero bleed* —
`columns * cellSize = 76 * 15 = 1140 = referenceWidth` — so `originX` is exactly 0 and the residual
is the **only** thing deciding overhang from gutter. A design whose bleed exceeds `columns / 2`
device px can never gutter, and the editor uses the default `"canvas"`, so nothing else in this
repository could show it.

**The arithmetic, swept over 3,000 widths from 300 to 1800 px at three DPRs.** Stated as arithmetic
over the shipped formula, not as a browser reading — the harness is gone (see the header).

| DPR | widths that gutter under `round` | worst gutter / side | under `ceil` |
| --- | --- | --- | --- |
| 1 | 1470 / 3000 (49%) | 19 dev px (19.0 CSS) | **0 / 3000** |
| 2 | 1450 / 3000 (48%) | 19 dev px (9.5 CSS) | **0 / 3000** |
| 3 | 1446 / 3000 (48%) | 19 dev px (6.3 CSS) | **0 / 3000** |

**The correction.** `round` is right for canvas and wrong for DOM, and the reason is that the two
substrates cannot feel the same thing. Canvas's presentation cancels the quantisation exactly, so
only the residual's **magnitude** survives, and `round` halves it. DOM has no presentation; it has
already given the residual to the box, so the magnitude reaches nothing and only the **sign** does.
Minimising a quantity that has no consumer, at the price of leaving free the one that has, is the
whole of the defect.

So `domGeometry` quantises the cell **up**, and floors the `y` origin for the same reason on the
other axis. The grid then covers its box by construction and **R9** clips the overhang.

**This is not attempt 3, and the distinction is the whole argument.** Attempt 3 applied `ceil` to a
substrate that had to *fit* its box, where 37 CSS px per side was pure loss and the rejection was
correct. The DOM substrate had already been documented as not fitting its box — that is its stated
cost above — so `ceil` there is not introducing a clip, it is choosing which of two misfits to have.

**The cost, which is a shift and not a saving.** The clip's range goes from a signed `[-19, +19]`
device px per side to `[0, 38]`: the worst case doubles, about 2.5 columns at DPR 1 on the footer
preset. The step at a width where the cell gains a device pixel does not go away either — that is
`columns` device px of grid width arriving at once, and it is intrinsic to an integer cell. **Only
the half of it that showed backdrop goes away.** Two functions rather than a parameter, because the
difference is a property of the presentation and not a setting a caller should be choosing.

### The second reading — the two axes are not the same problem

`ceil` removed the gutters and immediately exposed a defect that `round` had been hiding: **the whole
bottom row was cut, horizontally, across its full width.**

That one is not the cell's quantisation. The DOM box declared its height from `naturalRatio` — the
*ideal*, unquantised height — while the grid inside it was quantised, and **the grid is top-anchored,
so the entire vertical disagreement landed on one edge.** Horizontally the same residual is centred
and each side gets half of it; vertically there is no second edge to share with. Over the same 3,000
widths × 3 DPRs:

| cell quantisation | bottom overshoot, CSS px |
| --- | --- |
| `round` | **−5.00 … +5.00** — half the widths cut the row, half left a hairline gutter under it |
| `ceil` | **−0.00 … +9.93** — always a cut, up to `rows` device px |

At `Wpx = 1000`, DPR 1: a 14 px cell with **8.4 px cut off the bottom row — 60% of it**. Under
`round` the worst case was 5 px and half the time it went the other way, which is why nobody had
reported it.

**So the vertical answer is not a rounding at all.** `domGeometry` reports `gridHeightDev` — the last
horizontal edge, the same expression the cells are placed by — and the box **takes its height from
it**, through one in-flow child, instead of declaring a ratio. There is then no independent height
for the bottom row to be short of. This is not a new mechanism: it is what the canvas wrapper already
does with its canvas, for the same reason and with the same argument.

The cost is that the box is up to `rows` device px taller than `naturalHeight` (9.93 CSS px at the
demo's worst width), and — from a reading taken after the change — up to **half a device pixel
shorter** at a fractional `yOffset`, because the rounded `y` origin can shift the grid marginally
past the ideal. Both are bounded and neither is a cut: the box is the grid either way. `08` **S8**
makes `naturalHeight` a default rather than a constraint, which is what makes that spendable.

**The general lesson, and it is the one worth keeping:** *a residual split between two edges and a
residual given to one edge are not the same size defect.* The same `ceil` reads as acceptable on the
axis whose box the host owns and unacceptable on the axis whose box the component owns — and on that
second axis the component had a fourth option all along, because it could stop declaring the height
and measure instead.

**Still open, and unchanged by this:** the exact-box case. Attempt 11 remains the only configuration
that fits the box while cropping nothing, and it is still dropped by scope.

## Status

**Settled.**

- Seams are a compositing artefact, not a layout one. A shared integer edge makes a gap
  unrepresentable (**R6**); `canvas` and `dom` leak 0%.
- The residual is geometry, not paint. Every substrate faces it.
- A crop and a stretch are not equivalent answers to the same sub-pixel discrepancy. They differ by
  up to 39×, in opposite directions with cell size.
- Cells never differ by more than one device pixel — verified across the full sweep.
- **Apparent crispness of a curve goes as `1 / cellDev`, not as the asset-to-cell ratio.** Small
  cells are the soft regime whatever the asset. Verified arithmetically against this file's own
  eccentricity column at all seven rows, and it explains the coarse-vs-footer reading that looked
  backwards.
- **There are two asset rules, not one:** enough pixels for the largest cell (a ratio), *and* a cell
  large enough in absolute device pixels that a curve's antialiased edge is a small fraction of it.
- **The substrate decision.** One uniform square-cell geometry, three presentations. **All of it is
  implemented**: `uniform.ts` holds the geometry, `substrate` selects the presentation, and the chord
  is gone because a square cell leaves `coverRect` nothing to remove.
- **The residual has a sign as well as a size, and only one of them reaches each substrate.** Canvas
  feels the size (its presentation cancels the sign), DOM feels the sign (it has no presentation to
  cancel anything). Rounding to nearest optimises the size and leaves the sign free, which guttered
  about half of all widths under `"dom"`. `domGeometry` rounds up instead. See the addendum.
- **A residual split between two edges and a residual given to one edge are not the same size
  defect.** The DOM grid is centred horizontally and top-anchored vertically, so the same `ceil`
  costs half of the residual per side on one axis and all of it on one edge of the other — up to
  `rows` device px off the bottom row. The vertical axis is answered by the box measuring the grid
  rather than declaring a ratio, which is the option a component-owned box has and a host-owned width
  does not.
- **The SVG substrate's seams transfer**, and are plainly visible rather than marginal. It ships as a
  documented choice, not as a default.
- **A small curve's softness is irreducible.** Three draw paths at 16 device px are indistinguishable
  (attempt 15). No draw path and no rasterisation strategy recovers it.
- **The ideal canvas holds against a tangent curve and against transforms** (attempt 14).
- **`canvas` was never the problem.** Four theories died on the sharpness axis. Every soft reading in
  this investigation was asset resolution or cell size, both of which are geometry.
- **The split holds at the worst case the bound allows.** Footer preset, 341px, DPR 1: `cellDev = 4`
  and a **+12.17%** presentation resample, the extreme of `1 / (2 * cellDev)`. **Zero gaps.**
  Confirmed across the whole span of cell sizes this layout produces, 4 device px to 190.

**One reading was taken after the port and is worth recording, because it went the other way from
the arithmetic.** The canvas wrapper cannot declare `naturalRatio` permanently: the raster's height
is `rows * cellDev + originYDev` with `originYDev` rounded, so at a fractional `yOffset` the canvas's
intrinsic height falls up to **half a CSS pixel short** of the declared ratio — which would show the
page backdrop as a hairline under the bottom row, the exact defect class this change removes. It is
exactly zero when `yOffset` is 0, which identifies the rounding as the whole cause. The wrapper
therefore declares the ratio only until it has a canvas to take its height from. Clamping with
`min-height` would also close it, but at the price of a sub-pixel *anisotropic* stretch, and this
substrate exists to keep cells square. `uniform.test.ts` asserts both halves.

Measured in a browser across widths at DPR 1 and 2: bleed symmetric to within the rect granularity,
**zero** wrapper-versus-canvas height mismatch at every width, and every backing store an exact
`columns × cellDev` by `rows × cellDev + originYDev` — including the fractional-`yOffset` case.

**Open.**

- The general rotation matrix. Every angle drawn during the investigation was a multiple of 90, so
  `sincos`'s `Math.sin`/`Math.cos` branch went unexercised — and with it the maximum-overflow case a
  45-degree diamond would give.
- Where between `cellDev` 10 and 38 a curve stops being acceptable. Bracketed by two readings, not
  measured, and a usability threshold rather than a correctness one.
- How much of the seam in attempts 9–11 was attempt 12 — the harness's own misaligned layout. Moot
  for all three shipped substrates, since none relies on the underlay. It would matter again only if
  attempt 11's exact-box DOM option were revived.

**Closed.** *Whether canvas can draw a vector sharply at all* — the question that ran through the
whole investigation. It was never a substrate question. A 64px export is crisp on the ideal canvas
where 12px and 36px assets were soft (attempt 13); three draw paths at a small cell are
indistinguishable (attempt 15); and the `1 / cellDev` law accounts for the rest arithmetically. The
search for "the crisp draw path" was a search for something that does not exist.

## Method note

The most expensive mistakes here were not the failed approaches — attempts 1–5 are cheap and
informative. They were attempts 6, 7 and 8: three confident claims about browser mechanisms that
turned out to be false. Each cost a full build-and-review cycle, and each would have been caught by a
two-minute probe.

And attempt 12 is the other half of the lesson: the instrument was itself wrong, in half its panels,
while it was being trusted.

**Build the instrument before the hypothesis — then calibrate it before believing it.**

## Where things are

| Path | What |
| --- | --- |
| `packages/tileset/src/render/uniform.ts` | **the conclusion, shipped** — the uniform square cell, the split, and the draw list. `uniformGeometry` (`round`) for canvas and svg, `domGeometry` (`ceil`) for dom |
| `packages/tileset/src/render/Tileset.svelte` | the three substrates, one per presentation |
| `packages/tileset/src/render/geometry.ts` | the ideal fractional mapping — `scaleFactor`, `originX`, `cellBox` |
| `packages/tileset/src/render/edges.ts` | what survives of attempt 1: `snap` and `coverRect`. The edge arrays, `drawList` and `blitRect` went with it. |
| `packages/tileset/src/render/warn.ts` | the two asset rules, as development-build warnings |
| `packages/tileset/src/render/uniform.test.ts` | the properties this file argues for, asserted |
