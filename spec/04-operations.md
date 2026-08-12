# 04 — Operations

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`, `03-domain-model.md`  
> **Constrains:** `05-extension-model.md`, `06-config-schema.md`, `07-render-contract.md`, `09-editor.md`  
> **Amended:** §7.2 and **O7** rewritten in place — see `/adr/001-blend-declaration-inversion.md`  
> **Amended:** §5.1, §8, **O4**, **O8** rewritten in place; §8.3's extension point withdrawn — see `/adr/002-load-salt-as-engine-argument.md`  
> **Amended:** §3, §4.2, Q2 — see `06-config-schema.md` §5.2, §5.3, §7.3
> **Amended:** §10 gains an explicit-region row — see `09-editor.md` §14.2  
> **Amended:** §6.3 — see `01-glossary.md` §7.1, Q7

---

## 1. Purpose

This document defines the **Operation**: the unit of authorship in this system, and the only
mechanism by which a `TileState` acquires any value other than its default.

`02` fixed the engine boundary and the evaluation model. `03` fixed the nouns — what a Tile is,
what attributes exist, what each can hold. This document defines the **verbs**: how a cell is
chosen, where a number comes from, what that number means, and how it combines with what is
already there.

It elaborates step 2 of `02` §9 and is the largest document in the package. Every named preset
the editor offers is enumerated here.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- The registry contract for adding a Selection, Source, or Blend → `05-extension-model.md`
- Concrete JSON shape, field types, validation, dangling-reference detection → `06-config-schema.md`
- What a renderer _does_ with `reseedOnLoad` → `07-render-contract.md`
- Asset resolution, transform mathematics, drawing → `07-render-contract.md`
- Slider bounds, widget choice, how a palette is built by hand → `09-editor.md`
- The attribute set, domains, defaults, bounding behaviour → `03-domain-model.md` §5
- The hash function and its portability rules → `02-generation-contract.md` §6.6

---

## 3. The Operation

```
Operation {
  id:           string       // stable, generated (02 §6.3); [A-Za-z0-9_-]+, unique in the stack
  salt:         uint32 = 0   // 02 §6.4
  reseedOnLoad: boolean = false
  selection:    Selection
  source:       Source
  target:       TargetName
  mapping:      Mapping
  blend:        BlendName
}
```

Read as a sentence: _for the cells in `selection`, take a number from `source`, interpret it
through `mapping`, and combine it into `target` with `blend`._

The four parts of the original `(Selection, Source, Blend, Target)` unit survive. `mapping` is
the fifth, and §6 explains why it must exist separately.

**Two constraints on `id` and `salt`, both added by `06-config-schema.md` and both restated here
because this is the block a reader copies.**

`salt` was typed `number` in an earlier revision. It is a `uint32` — an integer in `[0, 2³²)` —
and `06` §5.2 validates it. Every consumer truncates: §5.2's `oSalt = salt XOR imul(...)` coerces
to `int32`, and `02` §6.6's mixer is `uint32` throughout, so `salt: 0` and `salt: 0.5` are the
same input and the difference is invisible in the picture but visible in the file.

`id` matches `[A-Za-z0-9_-]+` and is **unique within the stack** (`06` **C10**). Uniqueness is a
correctness requirement rather than tidiness: `02` §6.3 namespaces both hash channels by
`operationId`, so two Operations sharing an id return identical Source values at every cell and
agree everywhere on their `random` Selections. The excluded colon is §4.3's doing — that section
builds the selection channel by concatenating `operationId + ":selection"`, which puts ids and
channel strings in one namespace. An Operation with `id: "op7:selection"` occupies the same
channel as Operation `op7`'s Selection, and nothing downstream of the concatenation can tell them
apart.

### 3.1 Evaluation

`02` §9 step 2 reads:

> a. Test whether the cell is in the Operation's Selection; skip if not.
> b. Evaluate the Source at `(x, y)` → normalized `[0, 1)`.
> c. Apply the Blend of that value onto the Target's current value.

Between (b) and (c) a step is missing: the Source's number has no units and the Target's domain
does. This document inserts it.

**The evaluation of one Operation against one cell `(x, y)`:**

| Step   | Action                                                                            |
| ------ | --------------------------------------------------------------------------------- |
| **a**  | `selection.test(x, y)` → if false, the Operation contributes nothing to this cell |
| **b**  | `source.eval(x, y, ctx)` → `t`, a number in `[0, 1)`                              |
| **b′** | `mapping.apply(t)` → `v`, a value in the Target's domain (`03` **D4**)            |
| **c**  | `blend(v, previous)` → the written value                                          |
| **d**  | Reject if non-finite (`03` **D6**), then bound (`03` **D5**)                      |

Steps (d) are `03`'s and are restated only so the sequence is complete in one place.

**Invariant O1** — _Every Source value passes through exactly one mapping before reaching a
Blend. A Blend never sees a raw `[0, 1)` value, and a Target never receives an unmapped one._

### 3.2 One Source per Operation

An Operation has exactly one Selection, one Source, one Target, one mapping, one Blend.
Combining two Sources is done by writing two Operations, which composes through the stack
already. Nothing is gained by nesting, and a nested form would need its own blend semantics
before it could mean anything.

---

## 4. Selection

A **Selection** answers one question: _is this cell affected?_

```
Selection: (x, y) -> boolean
```

### 4.1 Selections are pure and positional

**Invariant O2** — _A Selection is a pure function of `(x, y)` and its own parameters. It never
reads the accumulated `TileState`._

The tempting alternative is a stateful Selection — _"only cells that are still empty"_,
_"only cells where `opacity > 0.5"`_. It is genuinely useful and it is genuinely postponed, for
two reasons. It would kill `02` §12's Selection-precompute extension point outright, since a
Selection could no longer be evaluated before the stack runs. And it opens a question this
document is not the place to answer: a stateful Selection is a conditional, and conditionals
belong to the expression language `02` §12 already holds `[POSTPONED]`.

**Accepted, not a defect:** _"paint only where nothing is yet"_ is not expressible in V1.

Most cases restructure by reordering the stack — paint the scattered thing _after_ the
background rather than guarding it against overwriting. The cases that genuinely cannot be
reached are those where two Operations must not overlap and neither can go last. Recorded here,
in the manner of `02` §10.1, so it is not later filed as a bug.

### 4.2 The V1 Selection presets

| Preset         | Parameters                                       | Included when                              |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| `all`          | —                                                | always                                     |
| `rect`         | `x, y, width, height`                            | `x ≤ cx < x+width` and `y ≤ cy < y+height` |
| `checkerboard` | `parity: 0 \| 1`                                 | `(cx + cy) mod 2 == parity`                |
| `everyNth`     | `axis: "column" \| "row"`, `n ≥ 1`, `offset = 0` | `(coord − offset) mod n == 0`              |
| `random`       | `density: [0, 1]`                                | `hSel(cx, cy) < density`                   |
| `cellList`     | `cells: [[x, y], ...]`                           | the pair is present in the list            |

Coordinates are grid-absolute (`02` §5) and every cell in `rows × columns` is tested,
including cells the renderer will clip (**G2**).

`rect` may extend beyond the grid; cells outside it simply never test true. This is deliberate —
an author dragging a rectangle to the grid edge should not have it silently resized.

**On `mod`, and why `offset` needs no lower bound.** `05` §5.1 admits any integer `offset`, so
`coord − offset` can be negative, and JavaScript's `%` is a remainder rather than a modulo — it
takes the sign of its left operand. For `everyNth` this makes no difference whatever: a remainder
is zero exactly when the divisor divides the dividend, so `a % n === 0` and `a mod n === 0` agree
for every integer `a`, and `-0 === 0` covers the boundary. `everyNth` may be implemented with `%`
directly and `offset` is unconstrained. Recorded because the asymmetry looks alarming and the next
reader will check.

**The residual hazard is `checkerboard`'s.** It compares against a **non-zero** residue —
`(cx + cy) mod 2 == parity` with `parity: 0 | 1` — and that is a test where the two operators
genuinely diverge. It is safe only because `cx` and `cy` are non-negative by `02` §5, so the sum
never is. Any future Selection testing a non-zero residue over a possibly-negative operand must
use a true modulo, not `%`.

### 4.3 The `random` Selection needs its own hash channel

`random` is the Selection that makes _"rotate 30% of tiles, leave the rest alone"_ expressible.
There is no numeric range meaning "do not write", so the subset has to be the Selection itself.

It must not draw from the same hash channel as the Operation's Source. If it did, an Operation
using `random` Selection at `density = 0.5` together with the `random` Source would select
exactly the cells whose value is below `0.5`, and then hand those same low values to the
mapping — every selected cell landing in the bottom half of the range. Correlation, presenting
as a subtle and very hard-to-diagnose bias.

`02` §6.3 lists two hash channels. **This document adds a third:**

| Channel                 | Key                                                              |
| ----------------------- | ---------------------------------------------------------------- |
| Operation source        | `hash(effective(op), operationId, x, y, op.salt)`                |
| **Operation selection** | `hash(effective(op), operationId + ":selection", x, y, op.salt)` |
| Asset selection         | `hash(effective(assets), "asset", x, y, config.assetSalt)`       |

`effective()` resolves the channel's seed from the run's `seed` and, where the relevant
`reseedOnLoad` flag is set, from `loadSalt` — `02` §6.7. It changes which seed is hashed, never
how many channels exist.

The channel string is an ordinary string run through Stage 1 (`02` §6.6), so no registry of
magic numbers is introduced. Both channels share the Operation's `salt`, so a single reroll
moves the Operation's selection and its values together — which is the intended behaviour of a
reroll button attached to one Operation.

**Invariant O3** — _All randomness in an Operation derives from the hash of `02` §6.6, in
channels namespaced by `operationId`. Selection and Source occupy distinct channels._

The channel set is closed at three; a Source needing further independent draws varies `salt`
rather than constructing a channel string (`05` **X3**).

### 4.4 Procedural, coordinate-bound, and manual

`02` §7.5 and `01` open question 2 leave three words circling two concepts. Settled here:

| Term                           | Meaning                                                                              | Survives a resize |
| ------------------------------ | ------------------------------------------------------------------------------------ | ----------------- |
| **Procedural Selection**       | Defined by rule: `all`, `checkerboard`, `everyNth`, `random`                         | ✅                |
| **Coordinate-bound Selection** | Defined by specific coordinates: `rect`, `cellList`                                  | ❌ orphaned       |
| **Manual Selection**           | Editor-facing term for `cellList` specifically — one the author painted cell by cell | ❌ orphaned       |

_Manual_ is a **subset** of coordinate-bound, not a synonym for it. A `rect` is coordinate-bound
without being manual. The distinction matters to `09` because the two are repaired differently:
a `rect` can plausibly be re-dragged, a hand-painted `cellList` cannot.

### 4.5 Composition

V1 ships exactly one Selection per Operation. The _shape_, however, is recursive from the
outset:

```
Selection { type: string, ...params }
```

Composition arrives later as ordinary registered types — `{ type: "and", operands: [...] }`,
`{ type: "not", operand: {...} }` — requiring no schema change, because the operand slot already
holds the same shape it always did. Nothing is built now. `[EXTENSION POINT]`.

---

## 5. Source

A **Source** answers: _for this cell, what number?_

```
Source: (x, y, ctx) -> number in [0, 1)
```

Pure, stateless, total. Unchanged from `02` §6.

### 5.1 `ctx` is closed

`02` §6 named `ctx` without saying what it holds. It holds exactly this:

```
ctx {
  rows:          int
  columns:       int
  effectiveSeed: uint32
  operationId:   string
  salt:          number
}
```

Grid dimensions, because a spanning Source cannot normalize without them; and the hash key
components, so a Source can call `hash()` itself.

**Invariant O4** — _`ctx` is closed at `{rows, columns, effectiveSeed, operationId, salt}`. A
Source receives nothing else._

**On `effectiveSeed` rather than the seed string.** `valueNoise` calls `hash()` itself (§5.2),
so a Source handed the raw seed would hash against it directly and **silently ignore its own
Operation's flag** — a flagged `valueNoise` that never varies between loads, with nothing
anywhere to indicate why. The field therefore carries the seed the Operation is actually
supposed to hash against: a `uint32`, Stage-1 hashed and load-mixed where `reseedOnLoad` is set
(`02` §6.7). Resolving it once, outside the Source, makes the flag work whether or not the
Source's author was thinking about it.

A Source loses access to the seed string, which it never had a use for. The count is still five,
so the closure argument below holds unchanged.

The closure is the point. Every field added here becomes a field every future Source
implementation may depend on and every future renderer must supply. `02` §4.2's prohibited-input
list sits immediately behind this: `ctx` is the doorway through which a pixel measurement would
enter the engine, so it stays narrow.

**On spanning and clipped cells.** `gradient` and `vignette` normalize across `rows × columns` —
the _whole_ grid, including cells the renderer will clip. This is **G2** and it is not
negotiable: a gradient normalized over the visible region only would drift its midpoint off the
viewport centre by exactly the bleed, which is the failure `02` §5 warns about.

### 5.2 The V1 Source presets

| Source       | Parameters                   | Stochastic |
| ------------ | ---------------------------- | ---------- |
| `constant`   | —                            | no         |
| `random`     | —                            | yes        |
| `valueNoise` | `cellsPerFeature`, `octaves` | yes        |
| `gradient`   | `angle`                      | no         |
| `vignette`   | —                            | no         |

**Stochastic** marks a Source whose output depends on the hash. It is the property that makes
`reseedOnLoad` (§8) meaningful, and the property `05` requires every registered Source to
declare (`05` **X5**).

#### `constant`

Emits `0`, always. A fixed value is expressed by setting the mapping's `min` equal to its `max`
(§6.2); the editor collapses the dual handle to a single one when the Source is `constant`
(→ `09`).

The alternative — a `value` parameter on the Source — puts two controls in the UI that mean the
same thing, and leaves undefined what happens when they disagree.

#### `random`

`hash(effectiveSeed, operationId, x, y, salt)` directly. Each cell independent of its
neighbours.

#### `valueNoise`

Spatially correlated noise: nearby cells receive nearby values. This is what produces regions,
bands, and waves rather than static.

Pinned in full, because "noise" is a family and not a function — see §5.3.

```
For octave o in [0, octaves):
    frequency  = 2^o                                   // lacunarity fixed at 2
    amplitude  = 0.5^o                                 // persistence fixed at 0.5
    oSalt      = salt XOR imul(o + 1, 0x9E3779B1)
    u          = (x + 0.5) * frequency / cellsPerFeature
    v          = (y + 0.5) * frequency / cellsPerFeature
    lx, ly     = floor(u), floor(v)
    fx, fy     = u - lx, v - ly
    corner(i, j) = hash(effectiveSeed, operationId, lx + i, ly + j, oSalt)
    sx, sy     = smoothstep(fx), smoothstep(fy)        // s(a) = a*a*(3 - 2*a)
    octaveValue = bilinear interpolation of the four corners by (sx, sy)
    accumulate: sum += octaveValue * amplitude
                norm += amplitude

return sum / norm
```

Every corner value is in `[0, 1)`; bilinear weights sum to `1`; the amplitude-weighted mean is
divided by the same weights. The result is therefore in `[0, 1)` — total, and never reaching `1`.
This is the totality obligation `05` **X6** generalizes to every registered Source.

The per-octave salt derivation exists so that octave 1 at lattice `(3, 4)` is not the same
number as octave 0 at lattice `(3, 4)`. Mixing through `imul` rather than adding the octave
index keeps an author's `salt++` from colliding with an octave offset. It is also the pattern
`05` **X3** requires of any future Source needing several draws per cell.

| Parameter         | Domain        | Meaning                               |
| ----------------- | ------------- | ------------------------------------- |
| `cellsPerFeature` | `> 0`, finite | Roughly how many cells one blob spans |
| `octaves`         | integer `1–3` | Layers of detail                      |

**On the octave cap.** With lacunarity `2`, the third octave already has features at roughly
`cellsPerFeature / 4` cells. On a grid eight to thirty cells wide that is at or below cell
resolution, at which point the octave is indistinguishable from `random` and is quietly
destroying the spatial structure the Source exists to provide. Three is the point past which the
control does the opposite of what its name suggests.

**On lacunarity and persistence being fixed.** They are pinned at `2` and `0.5` rather than
exposed. At this grid resolution they have almost no legible effect, and every exposed parameter
is one more thing a conformant implementation must reproduce exactly. `[EXTENSION POINT]` if
they ever earn their place.

#### `gradient`

```
dx, dy      = cos(angle), sin(angle)                   // angle in degrees
project(px, py) = px * dx + py * dy
pmin, pmax  = min and max of project() over the four grid corners:
              (0,0), (columns,0), (0,rows), (columns,rows)
p           = project(x + 0.5, y + 0.5)
return pmax == pmin ? 0 : (p - pmin) / (pmax - pmin)
```

`angle: 0` sweeps left to right. `angle: 90` sweeps top to bottom, because `y` increases
downward (`02` §5). Any angle is legal; presets are an editor convenience, not a spec concern.

Cell centres lie strictly inside the corner extremes, so the result is in `(0, 1)` — total, and
the guard covers only a degenerate grid.

Reversal needs no parameter: set the mapping's `range` with `min > max` (§6.2).

The reproducibility of `cos` and `sin` across runtimes is raised as `05` open question 3 and is
not settled here.

#### `vignette`

Normalized elliptical distance from the grid centre: `0` at the centre, approaching `1` at the
farthest corner. No parameters in V1. A bright centre rather than a dark one is again a reversed
range, not a flag.

### 5.3 Why `valueNoise` and not `perlin`

"Perlin noise" names a family. Implementations differ in gradient table, permutation, and
interpolation, so two renderers written from a specification saying _"Perlin"_ produce different
images from the same config. That is not a weakened **G1**; it is no **G1** at all, and no test
vector table can be written for it.

The same argument applies across time as well as across implementations: an unpinned Source
changes its own output when it is refactored, and every config already written renders
differently (`05` §3.1).

Value noise built on the hash of `02` §6.6 introduces nothing new to pin. It inherits that
section's test vectors, its integer-only discipline, and its `Math.imul` rule wholesale. At eight
to thirty cells across — where one feature spans a handful of cells — it is visually
indistinguishable from Perlin at the same feature size.

**The name is deliberate.** `02` §6 and the `01` harvest both refer to a Source called `noise`.
That name is retired: when a second noise function is registered, `noise` becomes a category and
cannot also be a member. `valueNoise` and a future `simplexNoise` sit side by side without
ambiguity; `noise` and `simplexNoise` do not.

Additional noise Sources are exactly what `05-extension-model.md` exists for. Each must pin
itself to the same standard: derived from the `02` §6.6 hash, or shipping its own test vectors.

### 5.4 `random` and `valueNoise` at the boundary

At `cellsPerFeature = 1`, `valueNoise` lattice points fall on every cell, interpolation never
runs between distinct corners, and the output degenerates to `random`.

Both are kept. `random` is cheaper, its intent is legible in a config at a glance, and it takes
no parameters. Noted because `05` needs to know that two registered Sources can coincide at
the edge of a parameter domain, and that this is acceptable.

---

## 6. Mapping

A Source emits a bare number in `[0, 1)`. It has no units. **Mapping is what gives it units.**

`0.73` means nothing until something declares whether that is 73% of the way from `−5°` to `5°`,
or from `0` to `360°`, or a position in a tile palette.

### 6.1 Mapping belongs to the Operation

**Invariant O5** — _Mapping is a property of the Operation, never of the attribute. Two
Operations writing the same attribute may map differently._

`03` **D4** gives every attribute a **domain** — its permanent capacity. Mapping is the **window
within that capacity** an individual Operation uses. `03` §5.1 already drew this distinction and
this invariant is its enforcement.

The case is ordinary, not contrived:

| Op  | Selection             | Source   | Target     | Mapping                | Intent              |
| --- | --------------------- | -------- | ---------- | ---------------------- | ------------------- |
| 3   | `random(0.3)`         | `random` | `rotation` | `[−5, 5]`              | barely-there jitter |
| 6   | `everyNth(column, 4)` | `random` | `rotation` | `[0, 270]`, `steps: 4` | quarter turns       |

Same attribute, same Source, incompatible interpretations. Were the range a property of
`rotation`, one of these two Operations would be impossible — and the author would discover it
only after building both.

**Why not on the Source.** Every Source would re-implement `min`, `max`, and `steps`, and every
Source added later would have to remember to. Factored into the Operation, a new Source declares
only what makes it that Source — `angle`, `cellsPerFeature` — and mapping comes free. Same
reasoning that puts `salt` on the Operation rather than inside each Source.

**The author never sees the word.** In the editor a numeric mapping is two handles on the
Target's slider track; a tile mapping is the palette builder. → `09`.

### 6.2 Numeric mapping

```
Mapping { range: [min, max], steps?: int ≥ 2 }
```

**Continuous** (`steps` absent):

```
v = min + t * (max - min)
```

**Stepped:**

```
index = floor(t * steps)                    // t < 1, so index ≤ steps - 1
v     = min + index * (max - min) / (steps - 1)
```

Linear in both cases. `min > max` is legal and reverses the map, which is how every Source is
inverted without a flag.

**A consequence worth knowing.** Because `t < 1` strictly, a continuous mapping never attains
`max`. A stepped mapping does. This is why flip needs `steps`:

> `range: [−1, 1]`, `steps: 2`. `t < 0.5` → index `0` → `−1`. `t ≥ 0.5` → index `1` → `+1`.
> Exactly two values, each on half the cells, both attained exactly.

Continuous `[−1, 1]` would produce values near `0` — tiles scaled to invisibility — which is
never what "flip half of them" meant.

The `index ≤ steps - 1` guarantee depends on `t < 1` strictly. A Source returning exactly `1.0`
would produce a `steps + 1`-th outcome; `05` **X6** forbids it.

**A gotcha on wrapping domains.** `rotation` wraps at `360` (`03` §5.4), so `0` and `360` are the
same value. Quarter turns are therefore `range: [0, 270]` with `steps: 4` → `0, 90, 180, 270`.
Writing `[0, 360]` with `steps: 4` gives `0, 120, 240, 360`, and `360` wraps to `0` — three
distinct rotations, one of them twice as likely. A range on a wrapping domain must exclude the
duplicate endpoint.

**On curves.** The map is linear for every Target. A geometric curve is arguably more correct for
a multiplicative quantity like scale, but at the ranges actually used the difference is
invisible: over `[0.9, 1.1]` the linear midpoint is `1.000` and the geometric `0.995`. Linear
buys legibility — the middle of the slider is the middle of the range — and it crosses zero,
which is what makes flip fall out of an ordinary negative range instead of needing machinery.
`curve` is `[EXTENSION POINT]`; adding it later is an optional field, not a break — a
`schemaVersion` bump under `06` §4.3, not a breaking change. Marker reconciled in `roadmap.md`
§4.2, which takes `06` §12's status over this section's earlier `[POSTPONED]`.

### 6.3 Tile mapping: the palette

```
Mapping { palette: [{ tileId: string | null, weight: number ≥ 0 }, ...] }
```

`t` selects an entry by the algorithm of `03` §4.3, with authored order rather than canonical:

```
total  = sum of weights                     // > 0, validation → 06
target = t * total
walk entries in authored order accumulating `cumulative += weight`
the first entry whose `cumulative > target` is selected
```

Strict comparison, so a zero-weight entry can never win. `t < 1` strictly, so `target < total`
and the walk always terminates — the weight walk is total. The termination proof is exactly
what `05` **X6** protects.

`null` is a legal entry. Clearing is therefore an ordinary Operation (`02` §8.1) and needs no
sentinel Tile.

**Why a palette and not a literal `tileId`.** A palette turns a continuous field into discrete
bands, and the character of those bands is chosen entirely by swapping the Source:

> Palette `[water:1, sand:1, grass:3]`, total `5`, thresholds at `0.2` and `0.4`.
>
> With `random` — scattered cells, 20 / 20 / 60.
> With `valueNoise` — the field is smooth, so cells below `0.2` are _contiguous_. Lakes, then
> shorelines, then grass.
> With `gradient` at `90°` — horizontal strata.

One Operation, one palette, three completely different structures. A literal `tileId` would need
a separate Operation per band with hand-synchronized thresholds, and could not express the noise
case at all without duplicating noise as a Selection type.

**A weight means two things, and they are the same thing.** Under `random` it is _how often_;
under `valueNoise` it is _how wide a band_. Both are proportion of area, which is why one number
serves and no second parameter is needed.

### 6.4 Palette order is load-bearing

**Invariant O6** — _Palette entry order is authored and semantically significant. Unlike a
Tile's asset list (`03` **D3**), it is not canonicalized._

`03` §4.2 sorted assets by id precisely so that dragging a list entry could not reshuffle the
canvas. A palette must take the opposite rule, because **under a banded Source, threshold
adjacency is spatial adjacency**. Water has to sit next to sand and not next to grass, and order
is the only way the author says so.

The tension resolves on a real distinction. An asset list is an incidental arrangement of
interchangeable variants — order carries no meaning, so canonicalizing costs nothing. A palette
is a deliberately sequenced parameter the author is directly manipulating. Reordering it changes
output _for a reason the author can see_, which is the same test `02` §6.3 applied to reordering
the operation stack.

**Accepted, not a defect:** under a `random` Source, reordering a palette reshuffles the canvas
with no visible reason, because uniform values make adjacency meaningless. This is the price of
one palette type serving both Source characters, and it is worth paying.

---

## 7. Blend and Target

### 7.1 The V1 Blends

| Blend      | Result         |
| ---------- | -------------- |
| `set`      | `v`            |
| `add`      | `previous + v` |
| `multiply` | `previous * v` |

`02` open question 3 asked whether `set` and `override` differ. **Resolved: they do not.**
`set` is kept and `override` is struck from the vocabulary.

`subtract` and `divide` are absent because a signed or reciprocal range expresses both — `add`
with `range: [−5, −5]` subtracts five. `min` and `max` are absent as `[EXTENSION POINT]`; they
are the only Blends that would make `03` §5.5's lossy clamp recoverable, which is a thin reason
to carry two presets nobody has asked for.

Blend output passes through `03` **D6** (non-finite rejected) and then `03` **D5** (bounded
immediately). Nothing in this document changes either.

### 7.2 Blends are partial

**Invariant O7** — _A Blend declares the Target types it accepts. A Target declares its
type, its default Blend, and any Blends it vetoes. An Operation pairing a Target with a
Blend outside the resulting set is invalid._

Two Target types exist: **numeric** and **tile**.

| Blend      | Accepts       |
| ---------- | ------------- |
| `set`      | numeric, tile |
| `add`      | numeric       |
| `multiply` | numeric       |

| Target     | Type    | Default | Vetoes     |
| ---------- | ------- | ------- | ---------- |
| `tileId`   | tile    | `set`   | —          |
| `scale`    | numeric | `set`   | —          |
| `scaleX`   | numeric | `set`   | —          |
| `scaleY`   | numeric | `set`   | —          |
| `rotation` | numeric | `set`   | `multiply` |
| `opacity`  | numeric | `set`   | —          |

A Target's accepted set is every Blend accepting its type, less its vetoes:

| Target     | Accepted                 |
| ---------- | ------------------------ |
| `tileId`   | `set`                    |
| `scale`    | `set`, `add`, `multiply` |
| `scaleX`   | `set`, `add`, `multiply` |
| `scaleY`   | `set`, `add`, `multiply` |
| `rotation` | `set`, `add`             |
| `opacity`  | `set`, `add`, `multiply` |

`add` on a tile palette is meaningless, so no Blend but `set` accepts the tile type, and the
editor shows no blend control for `tileId` at all. `multiply` on `rotation` is arithmetically
defined but has no authoring meaning under a wrapping domain, so `rotation` vetoes it rather
than leaving it as a trap. `scale` arrived with ADR-005 and vetoes nothing: a uniform scale is
the case where `multiply` is the natural Blend, since two Operations each scaling by 0.9 should
compose to 0.81, which is what `multiply` means and what `set` cannot express (**X2**'s review,
carried out rather than deferred).

**Why the declaration runs this way round.** The alternative — each Target enumerating the
Blends it accepts — yields the same rows today and closes the set permanently tomorrow.
Attributes are closed (`03` **D7**) and Targets follow them, so a Blend added later would be
accepted by nothing and §7.1's `[EXTENSION POINT]` on `min` / `max` would be empty. Under the
inversion a new Blend declares `numeric` and is available on every numeric Target at once,
with the veto column as the place to withhold it where it has no meaning. Adding a Blend
therefore carries an obligation to review the veto column → `05-extension-model.md` **X2**.

This is what `03` §5.4's argument was actually protecting. That section rejected typed attributes
to keep Blends total — but with a tile Target in play the type count was never one; it was always
two. The argument was really _"do not let it become three"_, and it still holds. Stated plainly
here so the two documents are not quietly at odds.

The editor consequence is direct: for any Target, show the default Blend, and reveal the accepted
set only on request (→ `09`). `06` validates the `(target, blend)` pair against this table rather
than against prose.

### 7.3 `assetId` is not a Target

Restating `03` **D9** because this is the document a reader would check: no Operation can target
`assetId`. It is written only by the resolution step of `02` §9.

---

## 8. `reseedOnLoad`

A per-Operation boolean, default `false`.

```
reseedOnLoad: true   → the Operation hashes against a seed that moves on every load
reseedOnLoad: false  → the Operation reproduces exactly, every load
```

### 8.1 The engine selects a seed; it never draws one

**Invariant O8** — _`reseedOnLoad` selects which seed an Operation hashes against: the run's
`seed` when false, the `seed` mixed with `loadSalt` when true. The engine never draws
`loadSalt`; it receives it._

`generate()` takes a third argument (`02` §4): `loadSalt`, a `uint32` drawn **once per load** by
the caller and held. `02` §6.7 specifies the derivation — a flagged Operation's channel resolves
its effective seed as `mixLoad(seedU32, loadSalt)`, an unflagged one as `seedU32`.

**G1 survives, one argument wider.** Output depends on `(config, seed, loadSalt)` and nothing
else. The engine still draws nothing, consults no ambient state, and reproduces exactly for a
repeated triple. `02` §4.2's prohibited-input list is untouched: `loadSalt` is a caller-supplied
integer, not a measurement of the world.

The version that would break **G1** — the engine calling `Math.random()` when it sees the flag —
remains prohibited, and it would take the test vectors with it, since no conformance table can
exist for a function that consults ambient state. The distinction was always about _who draws_,
and it still is. `02` §4.1's _"randomization policy lives entirely outside the engine"_ stands
verbatim.

**What this replaced.** The earlier reading of **O8** kept the flag out of the engine entirely
and had the caller overwrite each flagged Operation's `salt` before invoking `generate()`. It
preserved **G1** exactly and cost three things: a drawing component that had to iterate the
operation stack and mutate an authoring field; a config in the engine differing from the config
on disk; and a `salt` meaning an authored pin on one Operation and a clobbered value on the
next. `/adr/002-load-salt-as-engine-argument.md` records the reversal in full.

### 8.2 Two orthogonal knobs

| Knob                    | Scope                 | Lives in                 | Set by                      |
| ----------------------- | --------------------- | ------------------------ | --------------------------- |
| **seed**                | everything at once    | config, as `defaultSeed` | author; caller may override |
| **salt**, per Operation | that Operation only   | config, frozen           | author, at authoring time   |
| **loadSalt**            | every flagged channel | nowhere — an argument    | caller, once per load       |

`salt` is now unambiguously an authoring value. It is what the editor's reroll button
increments, it is frozen in the file, and nothing at runtime writes to it (`02` §6.4).

For `reseedOnLoad` to be meaningful the **seed must be held fixed**. The seed is in every hash
key, so a fresh seed per load moves frozen Operations too — that is a different feature, and
`02` §4.1's table now carries both rows.

Both channels of §4.3 take the Operation's salt and the same effective seed, so a re-roll moves
the Operation's `random` Selection and its Source together. One Operation, one re-roll,
everything about it moves.

The config carries a matching `reseedAssetsOnLoad: boolean` for the asset channel, re-rolling
which variant each cell shows without disturbing any Operation. It reads the same `loadSalt`.

**Flagged channels move together.** One draw re-rolls all of them at once. Their values stay
uncorrelated regardless, because the channels are namespaced by `operationId` (**O3**) — moving
together is not the same as agreeing. There is no case for one flagged Operation varying while
another flagged one stays put: an Operation that should stay put is one whose flag is false.

### 8.3 What it costs

Where `reseedOnLoad` is `true`, that Operation has no canonical picture — it is the author
saying they do not mind what it looks like on any given load. The cost is opt-in and
per-Operation: everything unflagged stays pinned, and a config with the flag false throughout is
byte-identical on every load **regardless of `loadSalt`**.

Reproduction is two values. `(seed, loadSalt)` reproduces any render exactly, flags and all.
Nothing is derived along the way and no config is rewritten, so the mixed case — a noise
Operation varying while everything else is frozen, and a visitor seeing a layout worth keeping —
needs no tooling beyond capturing an integer.

The earlier revision of this section carried an `[EXTENSION POINT]` here: _the renderer emits
the derived config it actually used_. It is **withdrawn**. Its purpose was recovering a file the
caller had overwritten a moment earlier, and there is no longer a derived config to emit.

**A constraint on `07`, recorded here because it is easy to get wrong.** `loadSalt` is drawn
**once per load and held**. Re-drawing per cell is not "random per load" — it is white noise, and
it destroys the spatial structure of every Source that has any. This is now structurally
difficult rather than merely discouraged: there is one integer and one argument, so re-drawing
per cell takes deliberate effort.

Whether the renderer exposes `loadSalt` as a prop or seals it inside the component is `08`'s
call. The engine requires only that it be drawn once and held.

### 8.4 Only stochastic Sources

The flag is inert on `constant`, `gradient`, and `vignette`, which consume no hash. Each Source
declares whether it is stochastic (§5.2, `05` **X5**), and the editor offers the flag only where
it means something.

---

## 9. Invariants summary

| ID     | Invariant                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| **O1** | Every Source value passes through exactly one mapping before reaching a Blend.                                              |
| **O2** | A Selection is a pure function of `(x, y)` and its parameters; it never reads accumulated `TileState`.                      |
| **O3** | All randomness derives from the `02` §6.6 hash, namespaced by `operationId`. Selection and Source occupy distinct channels. |
| **O4** | `ctx` is closed at `{rows, columns, effectiveSeed, operationId, salt}`.                                                     |
| **O5** | Mapping is a property of the Operation, never of the attribute.                                                             |
| **O6** | Palette entry order is authored and semantically significant; it is not canonicalized.                                      |
| **O7** | A Blend declares the Target types it accepts; a Target declares its type, default Blend, and vetoes. Blends are partial.    |
| **O8** | `reseedOnLoad` selects which seed an Operation hashes against. The engine never draws `loadSalt`; it receives it.           |

---

## 10. Extension points

| Point                                                                | Status                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection composition — `and`, `or`, `not` as registered types       | `[EXTENSION POINT]` — the recursive shape ships in V1 (§4.5); no schema change needed                                                                                                                                                                                                                                                                                                                               |
| `min` / `max` Blends                                                 | `[EXTENSION POINT]` — would make `03` §5.5's lossy clamp recoverable; `rotation` must veto both (`05` §4.2)                                                                                                                                                                                                                                                                                                         |
| Additional noise Sources — `simplexNoise`, `worleyNoise`             | `[EXTENSION POINT]` — each must pin itself to the `02` §6.6 standard (§5.3)                                                                                                                                                                                                                                                                                                                                         |
| Exposed `lacunarity` / `persistence` on `valueNoise`                 | `[EXTENSION POINT]` — pinned at `2` and `0.5` in V1                                                                                                                                                                                                                                                                                                                                                                 |
| `vignette` shape parameters                                          | `[EXTENSION POINT]` — elliptical only in V1                                                                                                                                                                                                                                                                                                                                                                         |
| An explicit region on spanning Sources — `gradient { angle, over? }` | `[EXTENSION POINT]` — **raised by `09` §14.2, owned here.** §5.1's grid-wide normalization is not negotiable, but a `gradient` under a two-column `rect` comes out nearly flat. An explicit region states the intent; bounding-box-of-selection would do nothing for four of six presets. **O4** stays closed — a config parameter, not a `ctx` field. Minor engine bump, no `schemaVersion` bump (`06` §4.3 row 5) |
| ~~Renderer emits the derived config it used~~                        | **Withdrawn** — dissolved by ADR-002. There is no derived config; `(seed, loadSalt)` reproduces any render (§8.3). Not carried to `roadmap.md`.                                                                                                                                                                                                                                                                     |
| `curve` on a numeric mapping                                         | `[EXTENSION POINT]` — an added key, therefore a `schemaVersion` bump; not a break (§6.2, `06` §12). Marker reconciled in `roadmap.md` §4.2.                                                                                                                                                                                                                                                                         |
| Stateful Selections                                                  | `[POSTPONED]` — conditionals belong to the expression language of `02` §12 (§4.1)                                                                                                                                                                                                                                                                                                                                   |
| Multiple Sources per Operation                                       | `[POSTPONED]` — needs its own blend semantics before it means anything (§3.2)                                                                                                                                                                                                                                                                                                                                       |

---

## 11. Open questions

| #   | Question                                                                                                    | Status                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does a registered Source declare its parameter schema, its stochastic flag, and its `[0,1)` totality proof? | **Resolved** → `05-extension-model.md` §5.1, §6.1, §6.2. It declares all three (**X4**, **X5**, **X6**).                                                                                                                                                                                                                   |
| 2   | Is `Mapping` one JSON slot with two shapes, or two mutually exclusive fields?                               | **Resolved** — one slot. `06-config-schema.md` §7.3, **C8**: `mapping` is a single key whose shape is discriminated by the Operation's `target`, with **no** `kind` tag. A tag could only ever agree with `target` or contradict it, and Targets are closed by `05` §4.4, so it adds a failure mode and no expressiveness. |
| 3   | How does the editor present a palette so that order reads as meaningful?                                    | **Deferred** → `09-editor.md`. **O6** makes this a real authoring hazard, not a cosmetic one.                                                                                                                                                                                                                              |
| 4   | Repair of orphaned `rect` versus orphaned `cellList` after a resize.                                        | **Deferred** → `09-editor.md`. §4.4 supplies the distinction `09` needs.                                                                                                                                                                                                                                                   |
| 5   | Is `random` redundant with `valueNoise` at `cellsPerFeature = 1`?                                           | **Resolved** — they coincide there; both are kept (§5.4).                                                                                                                                                                                                                                                                  |
| 6   | Do `set` and `override` differ? (`02` Q3)                                                                   | **Resolved** — they do not. `set` kept, `override` struck (§7.1).                                                                                                                                                                                                                                                          |
| 7   | _Manual_ versus _coordinate-bound_ Selection. (`01` Q2)                                                     | **Resolved** — _manual_ is the editor term for `cellList`, a subset of coordinate-bound (§4.4).                                                                                                                                                                                                                            |
| 8   | Should `everyNth` accept both axes in one Selection rather than needing composition?                        | **Open.** Composition (§4.5) would answer it, but that is postponed, and a `both` axis is a cheap V1 alternative. Not decided.                                                                                                                                                                                             |
| 9   | Is `gradient`'s use of `cos` / `sin` reproducible across runtimes?                                          | **Open** → raised as `05` open question 3. ECMAScript leaves transcendental precision implementation-defined; consequences are confined to values landing exactly on a `steps` boundary or palette threshold.                                                                                                              |
