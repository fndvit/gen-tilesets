# 07 — Render Contract

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`, `03-domain-model.md`, `04-operations.md`, `05-extension-model.md`, `06-config-schema.md`  
> **Constrains:** `08-renderer-svelte.md`, `09-editor.md`
> **Amended:** §2, §3.1, §9, §11.1, and §14 updated in place — see `08-renderer-svelte.md` §3.1, §3.2, **S1**, **S2**
> **Amended:** §3.1's title gloss, §9.1's first row — see `09-editor.md` §9.2, §9.3, **E11**, **E12**, and `00` §6

---

## 1. Purpose

This document defines **what happens to a `Grid<TileState>` after the engine returns it**.

`02` §8.2 hands asset resolution to the renderer and stops. `03` §6.3 pins transform order and
stops. `02` §7 splits Grid from Layout and names the four Layout fields without saying what any
of them does to a pixel. This is where the renderer's half of the system acquires rules.

It covers four things: where a cell goes, what a drawable is and how one is obtained, how a
`TileState`'s attributes become a picture, and what the thing calling `generate()` is obliged to
do. It also supplies the renderer-side counterpart to `05`'s output-stability story, which
`05` §11.1 identified as missing and could not write from where it stood.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- Component props, events, slots, lifecycle, and the SSR mechanism → `08-renderer-svelte.md`
- Whether `loadSalt` is an exposed prop or sealed inside the component → `08-renderer-svelte.md`
- The drawing substrate, and the concrete type of a `Drawable` → `08-renderer-svelte.md`
- Whether the component adopts its natural height or fills its container → `08-renderer-svelte.md`
- Overlay design, repair affordances, and the advisory diagnostics of `06` §10.4 → `09-editor.md`
- ~~How the editor slices the operation stack for isolation previews~~ — **withdrawn.** There are
  no isolation previews and no sliced stacks; the preview is always the complete operation stack
  (`08` §3.1, **S2**). Kept as a tombstone in the manner of `01` §11.4
- Asset authoring: file formats, optimization, sprite sheets, export pipeline → `09-editor.md` / `roadmap.md`
- Attribute domains, defaults, and bounding behaviour → `03-domain-model.md` §5
- What an Operation does and in what order → `04-operations.md`
- Package versioning of _generated_ output → `05-extension-model.md` §10
- File shape, key names, and validation → `06-config-schema.md`

---

## 3. The operating assumption

**There is one renderer.** It is developed in this repository, published alongside the engine,
and consumed by pinning a version. The editor's preview is that renderer with overlays drawn on
top of it — not a second implementation, not a simplified stand-in.

This is stated in the manner of `05` §3, and for the same reason: it changes the argument for
several rules below without changing the rules themselves.

Two implementations that are supposed to agree eventually disagree. The disagreement here would
be uniquely bad, because it would surface as a **plausible-looking wrong picture in the one
place the author is looking directly at it**. The author positions a tile against a preview and
ships something else. That is `05` §9's rejected graceful degradation arriving from a different
direction.

### 3.1 What follows from it

**The document title is read narrowly.** _Render contract_ means _what this renderer guarantees,
and therefore what the editor and every consumer may rely on_ — not what any renderer must
guarantee. `00` §6 states it that way. There is no conformance suite for third parties, because
there are no third parties.

The rules below are nonetheless stated **substrate-neutrally** — in geometry and matrices, not
in CSS. This costs nothing and keeps `02` **G5**'s claim live: adding an SVG, Canvas, or WebGL
renderer requires no engine change, and if one ever arrives, this document is the contract it
implements. Where CSS appears it is an illustration of the mathematics, flagged as such.

**The editor's apparently-extra needs are not renderer features.** They are overlays. Whatever the
editor wants an author to see about one Operation — which cells it selects, what it wrote — is
drawn _over_ the ordinary picture, never by asking the renderer for a different one. `07` draws
whatever it is handed, and it is always handed the complete stack (`08` §3.1, **S2**).

**What the editor genuinely needs from `07` is the coordinate mapping, in both directions** —
cell to rect for overlays, point to cell for painting a `cellList` (`04` §4.2). That mapping is
therefore public surface (§8), not an implementation detail.

**Invariant R1** — _There is one implementation of the coordinate mapping. The geometry an
overlay is drawn with is the geometry the renderer drew with, obtained from the same function
and not recomputed._

R1 is the whole of §3 made checkable. An overlay that recomputes the mapping is a second
implementation of the only part of the renderer the editor touches, and it drifts silently: the
picture is right, the selection box is a few pixels off, and nothing anywhere reports it.

**Portability becomes a claim about time.** `05` §3.1's reading applies here unchanged. There is
one renderer _at a time_, and a background authored in March is drawn by a newer build in
September. §11 is where that gets its enforcement.

---

## 4. The asset provider contract

`02` §8.2 says `TileState` carries identifiers only and that resolution happens _"in the
renderer, through an asset provider supplied alongside the config."_ This section defines that
provider.

### 4.1 The signature

```
AssetProvider = (ref: AssetRef) -> Drawable | Promise<Drawable>

AssetRef {
  tileId:  string      // the Tile the cell resolved to
  assetId: string      // the TileAsset within it (03 §4.3)
  meta:    object      // that TileAsset's meta block, verbatim (06 §6.1)
}
```

**The key is the pair, not `assetId` alone.** `06` §6 makes `TileAsset.id` unique _within its
Tile only_, and `03` open question 3 confirmed rather than tightened that. Two Tiles may
legitimately both hold an asset called `a1`. A provider keyed on `assetId` would resolve one of
them to the other's drawable, correctly and silently, for as long as the config lives.

**`meta` is passed verbatim and the renderer never reads it.** The renderer's entire relationship
with `meta` is transport: it takes the block off the `TileAsset` and hands it to the provider.
This is what keeps §5's geometry independent of what an asset is, and it means the V1 key set
(§4.4) is a convention between the editor and whatever provider it ships with, not a renderer
contract that would have to change to accommodate a new kind of asset.

### 4.2 Resolution is pure, and may be lazy

**Invariant R2** — _For the duration of a render session (§9.1), the same `AssetRef` resolves to
the same `Drawable`. The provider is a function, not a source of variation._

A provider that returned a different drawable per call would be `Math.random()` reintroduced one
layer out from where `02` §4.2 forbade it, with none of the seed machinery and no way to
reproduce a render. Across sessions the provider may of course resolve differently — a swapped
file, a new content hash — and §11 quantifies over an unchanged asset set for exactly that
reason.

Resolution **may be asynchronous**, and the renderer must not wait for it:

**Cell geometry is computed and committed before resolution is attempted, and is never revised
as a result of it.** This is §5's **R5** stated from the other end. Its consequences are the
reason the constraint is worth having:

| Consequence                                           | Because                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| No layout shift as assets arrive                      | Every rect was already final                          |
| SSR emits complete geometry without touching an image | The geometry needs no asset and no measurement (§5.3) |
| Assets are lazily loadable, in any order              | Nothing downstream of a rect depends on one           |
| A missing asset leaves a hole in a laid-out grid      | The grid does not collapse around it                  |

That last row is what keeps `03` §6.4 true renderer-side. Two ways of rendering nothing stay
distinguishable only if the _shape_ of the grid is the same either way.

### 4.3 Failure

A provider signals failure by throwing, or by rejecting its promise.

**There is no `null` return.** `06` §5.1 forbids `null` as a way to write _absent_ and the same
objection applies here: a `null` drawable is a third way to express emptiness, alongside
`tileId: null` (**G4**) and `opacity: 0` (`03` §6.4), and the three would have to be told apart
by whoever draws them.

**Invariant R3** — _A failure to obtain a drawable never substitutes one. Not a placeholder, not
a default tile, not another TileAsset from the same Tile, and not whatever the substrate would
draw in its place. The cell draws nothing, and the failure is reported. This binds a failure to
resolve and a failure to load alike: a `Drawable` that names a resource rather than carrying one
moves the failure later without changing what it is (`08` **S6**)._

The tempting substitution is the last one, and it is the worst. Falling back to a sibling asset
keeps the picture plausible, keeps the grid full, and silently reweights the distribution that
`03` **D3** exists to make deterministic. Nobody learns. This is `05` **X7**'s reasoning applied
to assets rather than to type names: _a fallback renders a plausible-looking wrong picture with
no error anywhere, which is worse than both a blank page and a stack trace._

Reporting, concretely:

| Build       | Behaviour                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Development | Throw. The failure is loud at the point it happens.                                                            |
| Production  | The cell draws nothing; the failure is surfaced through the provider's own error channel, which the host owns. |

This differs from `05` §6.3 and `06` §10 in one respect worth naming. A bad Source or an
unvalidated config is the author's bug, deterministic, and catchable before publish. A `404` is
an environmental failure that can appear months after the last commit, on a live site, with
nobody watching. Silence in production is therefore not enough — hence the error channel — while
failing the whole render over one missing tile is plainly worse than a hole.

**Accepted, not a defect:** a production build renders a hole where an asset failed, and whether
anyone hears about it depends on the host wiring up the channel. Recorded in the manner of
`02` §10.1 so it is not later filed as a renderer bug.

### 4.4 What `meta` carries in V1

The block is the default provider's input. `06` **C4** validates that it is an object and
inspects nothing inside it.

| Key      | Type              | Written by             | Read by              |
| -------- | ----------------- | ---------------------- | -------------------- |
| `src`    | string            | editor, at attach time | the default provider |
| `width`  | number, design px | editor, at attach time | nobody in V1         |
| `height` | number, design px | editor, at attach time | nobody in V1         |

**Intrinsic dimensions are measured once, in the editor, at asset-attach time, and frozen. The
renderer never measures.** They are recorded despite nothing reading them, on `06` **C3**'s
reasoning about `engineVersion`: a measurement that is only taken when someone thinks to take it
is missing precisely from the old files that will need it. When cropping arrives (§13) it needs
an aspect ratio, and by then the editor may not be open, the asset may be gone, and measuring
would be an asset consultation **R5** forbids.

**Accepted, not a defect:** frozen dimensions can go stale if the file behind `src` is replaced
with one of a different shape, and nothing detects it. This is tolerable only because **nothing
in V1 computes geometry from them** — §5 is a function of `Layout` alone, and centre-crop (§6.4)
is expressed declaratively rather than calculated. Any future consumer of these numbers inherits
the staleness problem and must say what it does about it.

**`meta` is the one place in the file where a typo is silent.** `06` §9.1 rejects unknown keys
at every depth precisely to prevent `"opactiy": 0.5` loading cleanly; `meta` is the sole
exception, so `"scr"` instead of `"src"` validates, and the failure surfaces at resolution time
as a missing asset rather than at load time as an error. §4.3's reporting is the mitigation and
it is a weaker one than validation. Recorded as the cost of `06` **C4** rather than as an
argument against it.

### 4.5 `meta` is additive-only

**Invariant R4** — _A key published in `meta` is never removed and never retyped. The block
grows and does not otherwise change._

Nothing versions `meta`'s contents. `06` §4.3 does not bump `schemaVersion` for a key added
inside the block, because `06` never enumerated the block's keys in the first place. `05` **X9**
covers generated output, and `meta` affects none. So a retyped `meta` key would change what old
files mean with no version number anywhere moving — the precise condition **X8** and `01` §11.4
exist to prevent, arriving in the one place neither of them reaches.

Additive-only closes the gap at no cost, and it is the same tombstone discipline already applied
to type names (**X8**), error codes (`06` §10.3), and section numbers (`01` §11.4). `01` §10.3
already records that one word doing this work in several scopes; this is a fourth.

---

## 5. Geometry

### 5.1 Three spaces

| Space      | Unit                | Origin                                                 |
| ---------- | ------------------- | ------------------------------------------------------ |
| **Grid**   | cells               | top-left cell, `(0, 0)`; `x` right, `y` down (`02` §5) |
| **Design** | design px (`02` §7) | the grid's top-left corner                             |
| **Render** | rendered px         | the render box's top-left corner                       |

The **render box** is the rectangle the grid is drawn into. Its width, `Wpx`, is supplied by the
host. Everything in this section is a map from grid space to render space, parameterized by
`Wpx` and by `Layout`.

The **scale factor** is

```
s = Wpx / referenceWidth
```

and it is derived from width alone. Height never affects scale. `referenceWidth` is stored
rather than derived for the reason `02` §7.2 gives: the grid's design width is
`columns × cellSize`, which exceeds `referenceWidth` by the intentional bleed, and a renderer
computing `s = Wpx / (columns × cellSize)` would make the bleed vanish and fit the grid neatly —
the outcome the design marks as wrong.

### 5.2 Placement

```
gridWidth = columns * cellSize                    // design px
originX   = (Wpx - s * gridWidth) / 2             // render px
originY   = -s * yOffset * cellSize               // render px

cellBox(x, y) = {
  left:   originX + s * x * cellSize
  top:    originY + s * y * cellSize
  right:  originX + s * (x + 1) * cellSize
  bottom: originY + s * (y + 1) * cellSize
}
```

Three things fall out and are worth naming.

**The grid is horizontally centred, and `originX` is negative whenever there is bleed.** Centring
on the render box's centre axis produces the alignment the author selected, automatically, as a
consequence of parity — which is why `02` §7.3 can say the renderer never reads
`horizontalAlignment`. Nothing here reads it.

**`originX ≤ 0` is guaranteed by the editor's derivation.** `02` §7.1 computes
`n = ceil(referenceWidth / cellSize)` and corrects parity **upward**, so
`columns × cellSize ≥ referenceWidth` always. The grid therefore always covers the render box's
width and there are never gutters at the viewport edges. A hand-written config can violate this —
`06` §8 validates the four Layout fields independently and has no cross-field rule — and the
result is well-defined: a narrower grid, centred, with empty margins. It is legal and almost
certainly not intended, which makes it a fourth advisory diagnostic in the sense of `06` §10.4.

**The grid is top-anchored and `yOffset` shifts it up.** `originY` is negative for any non-zero
`yOffset`, so the top of row 0 falls above the render box and is clipped by it (§7.2). This is
`02` §7.4's _"clipping the top of row 0"_, and it needs no special case: it is the ordinary
clipping rule applied to a negative origin.

### 5.3 Every horizontal quantity is a fixed fraction of `Wpx`

Substituting `s = Wpx / referenceWidth` into §5.2 and dividing through:

```
originX / Wpx   = (referenceWidth - columns * cellSize) / (2 * referenceWidth)
originY / Wpx   = -yOffset * cellSize / referenceWidth
side   / Wpx    = cellSize / referenceWidth
```

**`Wpx` cancels out of every ratio.** The whole layout is a set of constants derived from
`Layout`, `rows`, and `columns`, multiplied by one number at the end.

This is not a micro-optimization; it is what makes the rest of the document's claims cheap:

- **No measurement is required.** The layout can be emitted in relative units and is correct at
  any width, so nothing needs to observe the element to place a cell.
- **SSR emits complete geometry.** The server does not know `Wpx` and does not need to.
- **There is no layout shift, ever** — not on hydration, not as assets arrive, not on resize.
- **The render box's natural aspect ratio is a constant**:
  `Wpx : (rows − yOffset) * cellSize * Wpx / referenceWidth`, which reserves the correct space
  before anything is drawn.
  The **natural height** of the render box is `s * (rows − yOffset) * cellSize`: the box that
  exactly contains the visible grid, clipping row 0's top by `yOffset` and ending flush with the
  last row's bottom edge. It is a default, not a constraint — see §7.3.

### 5.4 Worked example

`cellSize: 175`, `columns: 8`, `rows: 5`, `referenceWidth: 1280`, `yOffset: 0.3`.
Grid design width `1400`; bleed `120`.

| `Wpx` | `s` | `originX` | `originY` | cell side | natural height |
| ----- | --- | --------- | --------- | --------- | -------------- |
| 640   | 0.5 | −30       | −26.25    | 87.5      | 411.25         |
| 1280  | 1.0 | −60       | −52.5     | 175       | 822.5          |
| 1920  | 1.5 | −90       | −78.75    | 262.5     | 1233.75        |

At `Wpx = 1280`, cell `(3, 2)` occupies `left 465, top 297.5, right 640, bottom 472.5`, centred
on `(552.5, 385)`. The grid spans `−60 … 1340`, 1400 wide, centred on `640` — 60 px of bleed off
each side, exactly as `02` §7.2 describes.

### 5.5 The cell box consults no asset

**Invariant R5** — _`cellBox(x, y)` is a function of `Layout`, `rows`, `columns`, and `Wpx`
alone. No asset is consulted, loaded, or measured to compute it, and no `TileState` is read._

**The brief for this document bundled `TileState` into this invariant and it is sharper split
apart.** The _cell box_ depends on neither an asset nor a state — it is pure layout, which is
what §5.3 needs to be true. The _drawable's placement within it_ legitimately depends on the
cell's attributes, because that is what `scaleX` and `rotation` are for. Keeping the two apart
is what lets the grid's skeleton be static while its contents vary per cell.

The square-asset constraint of §6.4 is what buys R5. A renderer that fitted arbitrary aspect
ratios by measurement would have geometry waiting on image loads, and every consequence in §4.2
would reverse.

### 5.6 Cell edges are shared, never independently rounded

**Invariant R6** — _A cell box is defined by its four edges. Cell `(x, y)`'s right edge is
identically cell `(x+1, y)`'s left edge, by construction. Sizes are derived from edges; edges
are never derived from sizes._

The formula produces fractional pixels at almost every width. The failure this rule prevents is
specific: compute each cell's `left` and `size` independently, round both, and adjacent cells
either overlap by a fraction or leave a sub-pixel gap. Sub-pixel gaps between tiles read as a
faint grid of seams across the whole background, which is highly visible against a flat
backdrop, is invisible at some widths and obvious at others, and is one of the harder things to
attribute after the fact.

Any snapping — if a substrate needs it — is applied to the shared edge, so that both cells move
together and the seam cannot open. Snapping that moves one cell's edge and not its neighbour's
is prohibited regardless of how it is expressed.

---

## 6. Transforms

### 6.1 Scale 1 is the cell square

**Invariant R7** — _A drawable at `scaleX = 1, scaleY = 1, rotation = 0` occupies exactly its
cell box. A circle inscribed in the asset is tangent to the cell's edges._

The **drawable box** is the cell box at scale 1. It is the reference every transform is taken
against, and its centre is the cell box's centre.

**This reads as contradicting `02` §7 and does not.** `02` §7 and `03` §5.4 both say `cellSize`
constrains _the cell_, not the drawable inside it. Both remain true. `cellSize` fixes the
drawable's size **at scale 1**, and scale is unbounded in both directions (`03` §5.4) and free to
exceed it. The next reader will check this, which is why it is written down: the two statements
are about different things — one about what the attribute may hold, the other about what the
number `1` means.

The alternative readings both lose. _Scale 1 is the asset's intrinsic size_ makes geometry depend
on a measurement and destroys **R5**. _Scale 1 is some fraction of the cell_ introduces a design
constant with no non-arbitrary value, which is the objection `03` §5.1 raised against a
normalized domain.

### 6.2 The transform

`03` **D11** fixes scale before rotation, both about the drawable's centre. This section supplies
the mathematics.

Let `(cx, cy)` be the cell box's centre in render space, `θ` the cell's `rotation` in degrees,
and `sx = scaleX · scale`, `sy = scaleY · scale` — §10.1's three scale contributors folded into
the one matrix they describe (ADR-005). At `scale = 1` this is `S(scaleX, scaleY)` exactly, which
is what it read before the attribute existed.

```
M = T(cx, cy) · R(θ) · S(sx, sy) · T(−cx, −cy)
```

As the standard affine six-tuple `[a b c d e f]`, where `x' = a·x + c·y + e` and
`y' = b·x + d·y + f`:

```
a = sx · cos θ            c = −sy · sin θ
b = sx · sin θ            d =  sy · cos θ
e = cx − (a·cx + c·cy)    f = cy − (b·cx + d·cy)
```

**Positive `rotation` is clockwise.** `02` §5 puts `y` increasing downward, and the matrix above
in a y-down space turns clockwise for positive `θ`. This must be pinned: nothing upstream states
it, and `05` §4.2's argument for why `rotation` vetoes `min` — that `350°` is ten degrees
_anticlockwise_ of `10°` — silently assumes a direction. Reversing the sign would flip every
asymmetric tile in every existing config with no version number moving.

**`opacity` multiplies the drawable's own alpha and is applied to the transformed result.** It is
order-independent (`03` §6.3), per-cell, and never inherited or accumulated across cells.

### 6.3 Order matters, concretely

`scaleX: 2, scaleY: 1, rotation: 90`.

> **Scale then rotate (D11, correct).** The unit square's corner `(1, 0)` maps to `(0, 2)`. A
> leaf stretched to twice its width and then turned on its side is twice as **tall**. The stretch
> rides with the drawable.
>
> **Rotate then scale (wrong).** The same corner maps to `(0, 1)`, and the stretch applies along
> the screen's axes after the turn. Every tile is twice as wide regardless of which way it
> points.

**A note for whoever writes the CSS.** A CSS transform list applies **right to left**:
`transform: rotate(90deg) scale(2, 1)` scales first and is correct. `scale(2, 1) rotate(90deg)`
is the second picture above. The inversion is easy to introduce and produces a picture that looks
deliberate.

At `scaleX = scaleY = 1`, a 45° rotation extends the drawable's bounding box to `cellSize × √2`.
For `cellSize: 175` that is `247.5` design px, overhanging each edge of the cell by `36.25`.
**Rotation puts a square drawable outside its cell with no scaling at all**, which is why §7 is
about the default case rather than an edge case.

### 6.4 Non-square assets are centre-cropped, before any transform

**Invariant R8** — _An asset is fitted to the drawable box by centre-crop, and the result is what
the transform is applied to. The crop is a property of the asset and the cell box; no attribute
value changes it._

Centre-crop, not stretch and not letterbox. Stretch distorts, and silently: a wide photograph
squeezed into a square looks like a rendering bug the author cannot locate. Letterbox introduces
transparent bands whose size depends on the asset, which breaks **R7**'s tangency claim for some
assets and not others.

**Crop before transform is the load-bearing half.** The alternative — apply `scaleX` to the box
and _then_ fit the asset into the scaled box — makes `scaleX: 2` on a wide asset reveal more of
the asset rather than making it twice as wide. Scale would no longer mean scale, the crop window
would depend on four attribute values, and `03` **D11**'s _"about the drawable's centre"_ would
have no fixed drawable to be about.

**Centre-crop requires no measurement.** Every substrate expresses it declaratively — CSS
`object-fit: cover`, SVG `preserveAspectRatio="xMidYMid slice"` — so **R5** survives an asset
whose aspect ratio the renderer never learns. This is the specific reason the square-asset
constraint is worth having rather than merely convenient.

When author-controlled cropping ships (§13), it changes _which region shows_, not _whether
cropping happens_. **It must ship with a default equal to the centre square**, or its arrival
moves every existing non-square asset's picture — a break under **R14** disguised as a feature
addition. No square asset's picture moves under any of this.

---

## 7. Overflow, clipping, and paint order

### 7.1 A cell is not a clipping boundary

**Cells do not clip their drawables.** §6.3 shows that a bare 45° rotation already spills, and
`scaleX`/`scaleY` are unbounded by `03` §5.4. A renderer that clipped per cell would make
rotation useless at scale 1 and upscaling useless entirely — it would clip the two features the
attribute set exists to provide.

### 7.2 The render box is the only clipping boundary

**Invariant R9** — _The render box clips. Nothing else does. A drawable is visible exactly where
it falls inside the box, whichever cell it belongs to._

This is `02` **G2**'s renderer-side counterpart, and the bleed requires it. `02` §7.2 marks a
neatly-fitting grid as the wrong outcome, so the overflow must be **present and cut off** rather
than absent. A box that did not clip would show the bleed and defeat the point; a box that
clipped anywhere else would need a second rule saying where.

It also disposes of two cases without special-casing them: `yOffset`'s clipping of row 0 is the
box's top edge meeting a negative `originY` (§5.2), and the horizontal bleed is the box's side
edges meeting a negative `originX`.

**Accepted, not a defect:** a rotated or upscaled tile in the last row is cut flush at the box's
bottom edge, where a tile in column 0 is not, because column 0 already sits 60 px outside the box
and has room to spill. The asymmetry is real and follows from bleed being horizontal-only in
`02` §7.

### 7.3 Vertical bleed is the host's, through the box's height

§5.3 gives the render box a natural height that ends flush with the last row. A host that wants
vertical bleed gives the box **less** height than that, and the rows beyond it are cut — the
vertical analogue of parity correction, achieved by the host rather than by a Layout field.

A host that gives it more height leaves empty space below the last row, which is well-defined and
almost certainly unintended.

Both follow from top-anchoring (`02` §7.4) and neither needs a rule of its own. Whether the
component adopts its natural height by default is `08`'s.

### 7.4 Paint order

Once drawables spill, they overlap, and something must be on top.

**Invariant R10** — _Cells are painted in row-major order: ascending `y`, then ascending `x`
within a row. A cell painted later draws over one painted earlier. Paint order is part of the
rendered output and is not an implementation choice._

Leaving it undefined is the failure `02` §6.1 rejected for iteration order — an implementation
detail becomes semantically load-bearing, and a refactor that reverses a loop changes every
overlapping background with no version number moving. Note that the engine may still evaluate
cells in any order (`02` §9); generation order and paint order are independent, and only the
second is observable.

Row-major is chosen rather than merely settled on. Later rows are lower on the screen and read as
nearer the viewer, so painting them on top is what overlapping foliage, scattered objects, and
anything with implied depth want. It is also what document order gives a naive DOM
implementation, so the correct behaviour is the free one and any deviation costs effort.

There is no per-cell `z`. The attribute set is closed by `03` **D7**, and layering within a cell
is permanently rejected by **D10**; stacking is compositing of N grids in the renderer
(`03` §8), where the layer supplies the order.

---

## 8. The coordinate mapping

Public surface, in both directions, per **R1**.

### 8.1 Forward: cell to rect

`cellBox(x, y)` as defined in §5.2. The editor draws every overlay — selection outlines, hover
highlights, per-cell badges — from this function and never from its own copy of the arithmetic.

### 8.2 Inverse: point to cell

```
cellAt(px, py) = {
  x: floor( (px - originX) / (s * cellSize) )
  y: floor( (py - originY) / (s * cellSize) )
}
```

`px` and `py` are **render-space** coordinates: rendered pixels, relative to the render box's
top-left corner. Not design px, not client or page coordinates. Converting a pointer event into
this space is the caller's, and it is the single most likely place to get this wrong.

**`cellAt` is total and does not bound-check.** It may return negative coordinates or
coordinates at or beyond `columns` / `rows`, and this is deliberate rather than an omission:
`04` §4.2 explicitly permits a `rect` Selection to extend past the grid — _"an author dragging a
rectangle to the grid edge should not have it silently resized"_ — so an editor authoring a
`rect` needs the out-of-grid coordinates the drag actually reached. Bounding is one comparison
and belongs to whoever knows whether it wants bounding.

The alternative, returning `null` outside the grid, loses information the caller cannot recover
and adds a null branch to every call site, in a package that has twice preferred to remove a case
rather than handle it (`02` §4.1, `06` §5.1).

### 8.3 The round trip

**Invariant R11** — _`cellAt` of any point within `cellBox(x, y)` returns `(x, y)`. Cell boxes are
half-open: a point on a shared edge belongs to the higher-indexed cell._

Half-open, and stated because a shared edge belongs to exactly one cell and two implementations
will otherwise disagree about which. `floor` gives it for free, and it is the same discipline as
`rect`'s `x ≤ cx < x + width` (`04` §4.2), the palette walk's strict comparison (`04` §6.3), and
`02` §6.6's `[0, 1)`.

**Accepted, not a defect:** the division in §8.2 is floating-point, so a point lying exactly on a
shared edge may land on either side of it depending on the width. The consequence is that
painting precisely on a boundary at one particular viewport width may choose the neighbouring
cell. No author can perceive the difference between the two outcomes at the moment of the click,
and the alternative — exact rational arithmetic in a pointer handler — is not worth its cost.

---

## 9. Caller policy

`06` §2 routes _what the caller does with `defaultSeed`, and how it draws `loadSalt`_ here.

This section constrains **the caller**, which `01` §5 defines as whatever invokes `generate()`.
`08` **S1** fixes that permanently as `<Tileset>`: the component takes a `TilesetFile` and calls
the engine itself, so a page, a layout, and `09` alike configure a caller rather than being one.

It is stated separately from the renderer's own rules nonetheless. The two roles collapsed into
one object; the two _policies_ did not. `09` drives the component with a fixed seed, deliberate
reroll, and no per-load variation, where a live page may vary on every load. Both express that
policy by choosing props, and the rules below are what those props mean — which is why fusing
them in prose would still undo what ADR-002 separated.

### 9.1 The render session

A **render session** is one caller holding one `(file, seed, loadSalt)` triple. The session ends
when the caller does.

`generate()` is invoked when the session begins and again whenever `file.config`, `seed`, or
`loadSalt` changes. Nothing else regenerates — a `layout`-only edit moves every cell box and
leaves every `TileState` alone.

**A viewport resize does not regenerate.** `columns` is frozen at authoring time (`02` §7.3) and
`rows` is a config field, so a change in `Wpx` changes `s` and nothing else — every cell keeps
its `TileState` and moves to a new rect. This is worth stating because the word _resize_ collides:

|                                                                                               | What changes                                                                        | Cost                                                                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Authoring resize** — the author sets the design width, a numeric field (`09` §9.3, **E12**) | `referenceWidth`, `cellSize`, or `horizontalAlignment`, and `columns` is re-derived | A destructive config edit; confirm where a coordinate-bound Selection exists |
| **Viewport resize** — a visitor changes their window                                          | `Wpx`, hence `s`                                                                    | A pure scale change; no regeneration                                         |

### 9.2 Seed

```
seed = hostSeed ?? file.config.defaultSeed
```

That is the entire policy, and it belongs to the caller because **the engine never applies the
default** (`02` §4.1). `defaultSeed` is required, so there is no null branch here and none
anywhere below.

`02` §4.1's table of four caller behaviours — fixed picture, fresh seed per load, fixed seed with
a fresh `loadSalt`, seed derived from user or session or date — is the menu, and this document
does not restate it. The rows are different features and the distinction matters.

### 9.3 `loadSalt`

**Invariant R12** — _`loadSalt` is a `uint32` drawn once per render session and held for its
duration. Every regeneration within a session reuses the same value._

`04` §8.3 states the engine's requirement as _drawn once per load and held_, and warns that
re-drawing per cell is not "random per load" but white noise that destroys the spatial structure
of every Source that has any. R12 pins the scope of _once_: per session, not per `generate()`
call.

The difference is not academic. A caller that redrew `loadSalt` on every `generate()` would be
correct on a static page and wrong the moment anything else changed — and the most likely
trigger is a config edit in the editor, where every keystroke would reshuffle every flagged
Operation while the author was trying to judge an unrelated change.

Drawing one:

```
loadSalt = Math.floor(Math.random() * 2**32)
```

`Math.random() * 2**32 | 0` is wrong: `|` coerces to `int32` and yields a negative number for
half of all draws, which `06` **C9** would reject as out of range if it ever reached a field —
and it never does, so nothing catches it.

**Server and client must use the same value.** Under SSR, a value drawn independently on each
side produces two different pictures for one page, which surfaces as a hydration mismatch or, on
a substrate that does not check, as a visible flicker. The _mechanism_ — a prop, a serialized
payload, a value sealed inside the component — is `08`'s call, recorded as such by ADR-002.
`07` states the constraint and stops.

### 9.4 The caller does nothing structural

`01` §5: the caller _"passes two values and does nothing structural — it never inspects an
Operation, clones, or mutates."_ That property was bought by ADR-002 and is easy to give back.

Two further obligations follow from `06`:

**The caller passes `file.config`, never `file`.** `06` **C1** makes the engine boundary a
property of the file's shape; passing the whole file is a type error and passing `config` whole
is safe. The renderer reads `file.layout` itself, and the two blocks never meet inside
`generate()`.

**The caller does not validate.** `06` **C5** makes `validate()` a separate function and
`generate()`'s behaviour on an unvalidated config undefined. The renderer inherits that posture
exactly: it trusts what it is handed. Validation happens at load, once, wherever the file is
loaded — and continuously in the editor, which is a different context with a human in it.

---

## 10. The applier contract

`03` §5.5 and `05` §4.1 both close the attribute set, and both give the same reason: an attribute
is meaningless unless the renderer knows how to apply it, so registering `blur` without a
renderer that blurs produces a field that silently does nothing. `05` §13 holds an open attribute
registry `[POSTPONED]`, blocked on _a matching renderer-side applier contract in `07`_.

This section supplies the contract. It does **not** open the registry — `03` **D7** stands, and
the set is still closed. It only ensures that opening it later is a two-document change rather
than a four-document one, which costs nothing to arrange while drafting and cannot be arranged
retroactively.

### 10.1 Application is keyed by attribute name

The draw path dispatches on the attribute's name against a table, rather than reading four
hardcoded fields off a `TileState`.

Each entry declares which **facet** of drawing the attribute contributes to, and for transform
contributors, its position in the composition order:

| Attribute  | Facet       | Order | Contribution                                                        |
| ---------- | ----------- | ----- | ------------------------------------------------------------------- |
| `scale`    | transform   | 1     | uniform, multiplied into both axes of the same `S`                  |
| `scaleX`   | transform   | 1     | `S(scaleX · scale, scaleY · scale)` about the drawable box's centre |
| `scaleY`   | transform   | 1     | —                                                                   |
| `rotation` | transform   | 2     | `R(θ)` about the same centre, clockwise-positive                    |
| `opacity`  | compositing | —     | multiplies the drawable's alpha; order-independent                  |

`03` **D11** is the two transform rows read in order. Stating it as an ordinal generalizes it: a
future `skew` or `blur` arrives with a declared position, and the question _where in the
composition does this go_ has a place to be answered rather than being settled by wherever the
code happened to put it.

`scaleX` and `scaleY` share an ordinal because they are one matrix; they are separate attributes
for the reason `03` §5.4 gives and not because they compose separately.

**`scale` shares it too, and this is the generalization paying off** — ADR-005. A uniform factor
multiplied into `S` **commutes** with the axis factors, so there is no order between the three to
pin and the ordinal is answered without a new position being invented. **D11**'s
scale-before-rotation is untouched. At `scale = 1` the product is arithmetically the matrix that
existed before the attribute, which is what lets §11.3's transform table gain rows without any
existing row moving.

### 10.2 An attribute with no applier is a failure

**Invariant R13** — _Every attribute the engine emits has an applier. A `TileState` carrying an
attribute the renderer cannot apply is a load failure, never a silent no-op._

This is the invariant `05` §4.1 was describing without naming: _"registering `blur` without a
renderer that blurs produces a `TileState` field that silently does nothing — the same failure
shape as a silent output change, arrived at from the other direction."_ R13 closes it, and it is
**X7** applied one layer out: an unknown attribute name gets the same answer as an unknown type
name, for the same reason.

It is unreachable in V1, because `03` **D7** closes the set and `06` validates the target names
(`06` §7). It exists so that the day the set opens, the failure mode `05` §4.1 identified is
already prevented rather than newly introduced.

---

## 11. Renderer output stability

`05` §10 makes a change in generated output a breaking change. This section is its counterpart
for **drawn** output, which no table in `05` covers.

### 11.1 A contradiction in `05` §10.2, resolved here

`05` §10.2's table ends with:

> | Editor-only or renderer-only change with identical grid output | patch or minor |

and `05` §11.1 says, of transform order:

> renderer-side, invisible to the grid, and equally breaking

**Both cannot be true.** Reversing D11 leaves `generate()`'s output byte-identical and changes
every rotated non-uniformly-scaled tile in every existing background. Under the table it is a
patch, and a consumer on `^1.4.0` picks it up automatically — which is precisely the trap
`05` §10.2 spends its own paragraph warning about, reproduced one layer out.

The table row is wrong as written. _Identical grid output_ is not the test; _identical drawn
output_ is. `05` §10.2 requires the amendment, and carries it: three rows now stand where the
original one did.

### 11.2 The invariant

**Invariant R14** — _After `1.0.0`, any change to the picture drawn for an unchanged
`(TilesetFile, seed, loadSalt)` triple and an unchanged asset set is a major version bump,
whether or not `generate()`'s output moved._

R14 is `05` **X0** and **X9** extended past the engine boundary. Everything `05` §10.3 says about
`1.0.0` being a decision rather than a milestone applies unchanged.

Changes that are major under R14 and invisible to every table `05` owns:

- transform order (**D11**, `03` §6.3)
- the sign of `rotation` (§6.2)
- paint order (**R10**)
- what `scale = 1` means (**R7**)
- the placement formula, `originX`, `originY`, or how `s` is derived (§5.2)
- centre-crop, or the position of the crop window (**R8**)
- the clipping boundary (**R9**)
  The asset set is quantified over because it is genuinely outside the package: a replaced file
  behind an unchanged `src` changes the picture and no version number can say so. That is the
  host's to manage, and **R2** confines the renderer's obligation to a single session.

### 11.3 The deliverable, and what it does not cover

`05` open question 5 asked whether there is a renderer-side counterpart to §11's reference
configs, and deferred it here as _genuinely hard_: an image hash is brittle across browsers, a
serialized transform list is only as good as its serialization.

It is hard in one layer of three. The other two reduce to exact tables in the manner of
`02` §6.6, requiring no browser and no image:

| Layer           | Artifact                                                                    | Catches                                                                          |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Geometry**    | `(Layout, rows, columns, Wpx, x, y) → cellBox`, plus `(…, px, py) → cellAt` | The placement formula, `s`, bleed, centring, `yOffset`, the half-open round trip |
| **Transform**   | `(scale, scaleX, scaleY, rotation, cellBox) → [a b c d e f]`                | **D11**'s order, the rotation sign, the centre, scale-1 tangency                 |
| **Compositing** | —                                                                           | Paint order, clipping, crop, opacity                                             |

**Invariant R15** — _The renderer's deliverable is two vector tables — geometry and transform —
in the manner of `02` §6.6. Both are exact, both are regression tests in the sense of `05` §11,
and both are regenerated only alongside a major bump._

Between them these cover every item `05` §11.1 listed as renderer-side. Transform order, the
thing that prompted the question, is caught exactly by a six-tuple comparison.

**The compositing row stays open**, and is recorded rather than invented. Paint order is
cheaply testable against a substrate that has an observable order — asserting DOM sequence, if
the substrate is DOM — but that is a test of one implementation and not of the contract.
Clipping, crop, and alpha compositing resist everything short of pixel comparison, which is the
brittle artifact `05` Q5 already rejected. Carried to §14 as this document's open question 1 and
to §13 as `[POSTPONED]`.

---

## 12. Invariants summary

| ID      | Invariant                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ | --- |
| **R1**  | There is one implementation of the coordinate mapping. Overlays use the geometry the renderer drew with.                             |
| **R2**  | Within a render session, the same `AssetRef` resolves to the same `Drawable`.                                                        |
| **R3**  | A failure to obtain a drawable never substitutes one — at resolution or at load. The cell draws nothing and the failure is reported. |     |
| **R4**  | `meta` is additive-only: a published key is never removed and never retyped.                                                         |
| **R5**  | The cell box is a function of `Layout`, `rows`, `columns`, and `Wpx` alone. No asset is consulted, loaded, or measured.              |
| **R6**  | Cell boxes are defined by shared edges. Sizes derive from edges, never edges from sizes.                                             |
| **R7**  | A drawable at scale 1 with no rotation occupies exactly its cell box.                                                                |
| **R8**  | An asset is centre-cropped to the drawable box before any transform. No attribute changes the crop.                                  |
| **R9**  | The render box is the only clipping boundary. A cell never clips its drawable.                                                       |
| **R10** | Cells are painted in row-major order. Paint order is output, not an implementation choice.                                           |
| **R11** | `cellAt` inverts `cellBox`. Cell boxes are half-open; a shared edge belongs to the higher-indexed cell.                              |
| **R12** | `loadSalt` is drawn once per render session and held. Every regeneration within a session reuses it.                                 |
| **R13** | Every emitted attribute has an applier. An attribute with no applier is a failure, never a silent no-op.                             |
| **R14** | After `1.0.0`, any change to the drawn picture for an unchanged `(TilesetFile, seed, loadSalt)` and asset set is a major bump.       |
| **R15** | The renderer's deliverable is two exact vector tables: geometry and transform.                                                       |

---

## 13. Extension points

| Point                                                                         | Status                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Author-controlled cropping — a `meta` key carrying a source rect              | `[EXTENSION POINT]` — costs no `schemaVersion` bump (**C4**, **R4**); must ship with a default equal to the centre square or its arrival breaks **R14** (§6.4)                |
| Layer compositing — N grids stacked by the renderer                           | `[EXTENSION POINT]` — `03` §8; layers must agree on `rows`, `columns`, and `cellSize`; the layer supplies the paint order **R10** leaves no room for within a grid            |
| Multiple Layouts keyed by `minWidth`                                          | `[EXTENSION POINT]` — `02` §12, `06` §12; changes which `Layout` §5 is parameterized by, not the formula                                                                      |
| Open attribute registry                                                       | `[EXTENSION POINT]` — §10 supplies the applier contract `05` §13 and `03` §8 were blocked on. Still gated on `03` **D7** and a `schemaVersion` bump; no longer gated on `07`. |
| DPR-aware asset selection — one `AssetRef`, a resolution-appropriate drawable | `[EXTENSION POINT]` — entirely inside the provider; **R2** requires only that one session sees one answer                                                                     |
| Vertical bleed as a `Layout` field                                            | `[EXTENSION POINT]` — achievable today through the render box's height (§7.3); a field would be a `schemaVersion` bump                                                        |
| Pixel-level compositing regression artifact                                   | `[POSTPONED]` — §11.3; paint order, clipping, crop, and alpha resist everything short of the brittle comparison `05` Q5 rejected                                              |
| Skipping work for provably invisible cells                                    | `[POSTPONED]` — `03` §6.4 calls it an optimization detail for `07`; it interacts with §4.3's reporting, since a skipped resolution is an unreported failure                   |

---

## 14. Open questions

| #   | Question                                                                        | Status                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Is there a renderer-side counterpart to `05` §11's reference configs? (`05` Q5) | **Substantially resolved — §11.3, R15.** Geometry and transform reduce to exact vector tables covering every item `05` §11.1 listed, transform order included. **Compositing remains open**: paint order, clipping, crop, and alpha have no artifact that is neither brittle nor a test of one implementation. Carried as `[POSTPONED]` in §13 rather than answered. |
| 2   | Is `loadSalt` an exposed prop or sealed inside the component?                   | **Resolved** → `08-renderer-svelte.md` §5.1. An optional prop defaulting to `0`. Sealing the draw would require the component to build a payload channel the framework already owns, and to know whether it is server-rendering. `08` **S7** makes **R12** structural: the component draws no random number at all.                                                  |

| 3 | Does the component adopt its natural height or fill its container? | **Resolved** → `08-renderer-svelte.md` §6.1, **S8**. Neither, exactly: the render box declares its natural _ratio_ and no height, so height follows width with no measurement, and host CSS may override it. §7.3's vertical bleed stays reachable in one line. |

| 4 | What is a `Drawable`, concretely — a URL, a component, something else? | **Resolved** → `08-renderer-svelte.md` §4.2, **S5**. `{ src: string }`, drawn as an `<img>` in the DOM. A raster file and an SVG file are both sealed pictures. An object rather than a bare string so §13's DPR point can arrive additively. |
| 5 | Should `meta` be validated at all? | **Open.** `06` **C4** makes it the one place a typo is silent (§4.4), and the mitigation is a runtime resolution failure rather than a load error. Options are a provider-declared schema for its own keys, or accepting the cost. Revisit if it bites during implementation. Reopening `06` §9.1 is _not_ the answer — that is `06` open question 4 and a different trade. |
| 6 | Does the editor ever want `cellAt` bounded? | **Deferred** → `09-editor.md`. §8.2 returns unbounded coordinates because `rect` needs them; whether a `cellList` brush bounds them is an authoring decision, and it is one comparison either way. |
| 7 | Is `Wpx` the render box's border-box or content-box width? | **Resolved** → `08-renderer-svelte.md` §6.2, **S9**. Dissolved rather than chosen: the component owns the render box element and styles it with no padding and no border, so the two boxes coincide. A host wanting an inset wraps the component. |
