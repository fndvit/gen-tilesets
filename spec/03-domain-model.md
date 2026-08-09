# 03 — Domain Model

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`  
> **Constrains:** `04-operations.md`, `06-config-schema.md`, `07-render-contract.md`  
> **Amended:** open questions 1, 2, 3 resolved by `06-config-schema.md` §10, §5.3, §6  
> **Amended:** §5.5, §6.4, §8, Q6 — see `07-render-contract.md` §10, §4.4
> **Amended:** §4.2, §4.3, **D3** rewritten in place — see `01-glossary.md` §7.1, Q7  
> **Amended:** §4.3's hash key now names the effective seed — see `02-generation-contract.md` §6.3, §6.7

---

## 1. Purpose

This document defines the **things the engine reasons about**: what a `Tile` is, what a
`TileAsset` is, what attributes a `TileState` carries, and what each of those attributes is
allowed to hold.

`02` fixed the boundary between generation and rendering. This document fills in the nouns on
the generation side of that boundary. It is the vocabulary that `04-operations.md` manipulates
and that `06-config-schema.md` serializes.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- How an attribute value is _produced_ — Selection, Source, Blend, Target semantics → `04-operations.md`
- How a Source's `[0, 1)` value maps into an attribute's domain — range, curve, quantization → `04-operations.md`
- Which Blends exist and how each combines a value with an accumulated one → `04-operations.md`
- Registry contracts for adding a Source or Blend → `05-extension-model.md`
- Concrete JSON shape, field validation, dangling-reference detection → `06-config-schema.md`
- Transform mathematics, compositing, asset formats, drawing → `07-render-contract.md`
- Asset provider interface → `07-render-contract.md`
- Editor input constraints, sliders, ranges shown to the author → `09-editor.md`

---

## 3. The Tile

A **Tile** is the unit the engine reasons about. It is a family, not a picture.

```
Tile {
  id:     string        // stable, generated
  name:   string        // authoring only
  assets: TileAsset[]   // at least one
}
```

`id` follows the same discipline as `operationId` (`02` §6.3): assigned once at creation, never
derived from position in a list, never derived from `name`. It is what `tileId` in a
`TileState` refers to and what an Operation stores when it paints.

`name` exists so the author can call something _"leaf"_ rather than _"t_9f2a"_. It is
authoring metadata in the sense of `02` §7.3 — it round-trips through the config and is never
read during generation.

**Invariant D1** — _A Tile's identity is its `id`. `name` never affects generation output._

Renaming a Tile must not change a single cell. Without D1 the obvious editor convenience —
type a better name — becomes a destructive edit.

### 3.1 The tile library

The config carries a set of Tiles. A `tileId` in a `TileState` is a reference into that set.

The engine assumes it has been handed a **validated config**: every `tileId` an Operation can
write resolves to a Tile, and every Tile declares at least one TileAsset. Detecting a dangling
reference is a validation concern → `06-config-schema.md`, open question 1.

---

## 4. The TileAsset

A **TileAsset** is one concrete drawable within a Tile family, plus the weight that decides how
often it is chosen.

```
TileAsset {
  id:     string   // stable, generated; unique within its Tile
  weight: number   // >= 0
  ...renderer-facing metadata, opaque to the engine
}
```

**Invariant D2** — _A TileAsset carries an identifier, a weight, and metadata the engine never
inspects. It carries no sprite data of any kind._

This is `02` **G5** stated at the domain level. Whatever a TileAsset needs to become a drawable
— a filename, a sprite-sheet offset, a component reference — lives in fields the engine copies
and never reads, and is resolved by the asset provider in `07-render-contract.md`.

### 4.1 Weights are relative

Weights are **relative and normalized by their sum at selection time**. They are not required
to sum to `1`, or to `100`, or to anything.

> Assets `[A:3, B:1, C:1]` → A is chosen three times out of five.
> Adding `D:1` gives `[3, 1, 1, 1]` — four times out of six — and required no edit to A, B, or C.

The tempting alternative is to constrain the sum to `1`. It loses twice. It makes every
addition or removal an edit to every other asset in the Tile, which is tedious in exact
proportion to how many variants a Tile has. And it leaves a hole: weights summing to _less_
than `1` must mean either an error or "sometimes nothing renders" — and a second way to express
emptiness would collide with `tileId: null` and **G4**. Relative weights have no such remainder.

Rules, in full:

| Rule                            | Rationale                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `weight >= 0`                   | A zero weight lists an asset without ever selecting it — "temporarily off" without deleting it |
| Sum of a Tile's weights `> 0`   | An all-zero Tile has no selectable asset; validation → `06`                                    |
| At least one TileAsset per Tile | A Tile with no assets cannot resolve                                                           |

### 4.2 The weight walk is order-independent

`02` §10 selects by comparing a hash value against cumulative weights. Accumulation needs an
order, and if that order is the asset array's arrangement in the config, then dragging an asset
up a list in the editor reshuffles the canvas — the same surprise as `02` §10.1, but with
nothing bought for it.

**Assets are therefore accumulated in canonical order**: ascending by `TileAsset.id`, compared
as sequences of **UTF-16 code units**.

The comparison must be code-unit ordering — JavaScript's `<` on strings — and never
`localeCompare` or `Intl.Collator`. Locale-sensitive collation gives different answers on
different machines, which is the same class of portability failure as `*` versus `Math.imul`
in `02` §6.6, and would break **G1** just as thoroughly.

**Invariant D3** — _The weight walk over a Tile's assets depends on the set of `(id, weight)`
pairs, never on their arrangement in the config._

### 4.3 The weight walk

Given a cell's resolved `tileId`:

```
assets = tile.assets sorted canonically by id
total  = sum of weights                              // > 0 by §4.1
h      = hash(effective(assets), "asset", x, y, config.assetSalt)  // [0, 1) per 02 §6.3
target = h * total

walk assets accumulating `cumulative += weight`
the first asset whose `cumulative > target` is selected
```

**On `effective(assets)` rather than the seed.** An earlier revision of this block wrote
`hash(seed, …)`. ADR-002 left it standing on the grounds that this section _cites_ `02` §6.3
rather than specifying it, but the block writes a literal key, and `02` §6's instruction to
read _the seed_ as _the effective seed_ is scoped to that section and does not reach here.
The asset channel resolves its seed as
`config.reseedAssetsOnLoad ? mixLoad(seedU32, loadSalt) : seedU32` (`02` §6.7). Written out
because an implementer working from this block alone would produce an asset channel that
ignores `reseedAssetsOnLoad` entirely — a flag that silently does nothing, which is the
failure shape `05` §6.1 rejects for the stochastic declaration.

The comparison is **strict** so that a zero-weight asset can never win: it does not advance
`cumulative`, so it never satisfies the test. And because `h < 1` strictly, `target < total`,
so the walk always terminates on an asset — the weight walk is total.

> `[A:3, B:1, C:1]`, `total = 5`, `h = 0.5` → `target = 2.5`.
> A: `cumulative = 3 > 2.5` → **A**.
> Raise B to `3`: `total = 7`, `target = 3.5`. A: `3 > 3.5` false. B: `6 > 3.5` → **B**.
> The same cell changed asset although A's weight did not move. This is `02` §10.1, unchanged
> and still accepted.

---

## 5. Attributes

### 5.1 Each attribute declares a domain

`02` §8 described attributes as _normalized_. That word admits two models, and this document
picks the second.

The rejected model stores every attribute in `[0, 1)`, uniformly. It is appealing because every
Blend is then automatically total over every attribute. It loses on `scale`: a normalized scale
needs a maximum to normalize against, and there is no non-arbitrary maximum. Whoever picks one
has smuggled a design constant into an engine that `02` §4.2 forbids from knowing pixel
measurements. It also makes the config illegible — `rotation: 0.25` meaning 90° is a thing the
author must decode every time they read a saved file.

**Each attribute instead declares three things:**

| Declaration  | Meaning                                                          |
| ------------ | ---------------------------------------------------------------- |
| **domain**   | The set of values the attribute can hold, in units natural to it |
| **default**  | The value a fresh `TileState` initializes to (`02` §9, step 1)   |
| **bounding** | What happens to a written value that falls outside the domain    |

Sources still emit `[0, 1)` — that is `02` §6 and is unchanged. Mapping that normalized number
into an attribute's domain is the Target's job, specified in `04-operations.md`. This document
supplies only the domain, default, and bounding that the Target maps into.

**Domain is capacity, not range.** An attribute's domain is everything it _can_ hold. A Target
writing to it maps onto some **range** — a window within that capacity — and that range is a
property of the Target, not of the attribute. Keeping the two apart is what allows `scaleX` to
stay open (§5.4) while an individual Target still varies scale between, say, `0.9` and `1.1`.

The mapping is an expansion: a Source value carries 2³² distinct values (`02` §6.6) and no V1
attribute has a domain finer than that, so nothing is lost in the mapping itself. Two questions
it leaves open are `04`'s to answer — what supplies the range for an **unbounded** domain, where
no affine map exists; and whether the map is linear, which is correct for `rotation` and
`opacity` but biased for a multiplicative quantity like scale.

**Invariant D4** — _Every attribute declares a domain, a default, and a bounding behaviour._

### 5.2 Bounding is applied after every write

Bounding behaviours are `clamp`, `wrap`, and `none`. Bounding is applied **immediately after
each Blend writes**, not once at emit.

The alternative — let intermediate values roam and bound only at step 4 of `02` §9 — produces
different output whenever a later Blend reads the accumulated value:

> `opacity` starts at `1`. Operation A adds `0.5`; Operation B multiplies by `0.5`.
> Bounding per write: `1 → clamp(1.5) = 1 → 0.5`.
> Bounding at emit: `1 → 1.5 → 0.75`.

Per-write bounding wins because it makes the accumulated state _always a value the attribute can
actually hold_. An author inspecting the stack midway sees a real opacity, not a placeholder
that will be corrected later. Deferred bounding makes an invisible out-of-domain intermediate
load-bearing, which is the same failure mode `02` §6.1 rejected for iteration order.

**Invariant D5** — _An attribute's bounding is applied after every write. The accumulated value
is in-domain at every point in the stack._

**Accepted, not a defect:** per-write `clamp` is lossy. In the example above the `1.5` is gone
and no later Blend can recover it. This is the intended reading of D5 rather than a rough edge
— recorded here, in the manner of `02` §10.1, so it is not later filed as a bug.

### 5.3 Non-finite values are never written

If a Blend produces `NaN`, `Infinity`, or `-Infinity`, the write is **rejected** and the
previous value is retained.

This is not fastidiousness. `scaleX` and `scaleY` are unbounded (§5.4), so a dividing or
exponentiating Blend can reach a non-finite result; and `02` §8 requires `Grid<TileState>` to be
**plain serializable data**. JSON has no encoding for `NaN` or `Infinity`, so a non-finite
attribute value would produce a grid that cannot round-trip — a violation of the output contract
discovered at serialization time, far from its cause.

**Invariant D6** — _A non-finite Blend result is discarded; the previous value stands. Every
attribute value in an emitted `TileState` is a finite number._

### 5.4 The V1 attribute set

| Attribute  | Domain            | Default | Bounding               |
| ---------- | ----------------- | ------- | ---------------------- |
| `scaleX`   | any finite number | `1`     | `none`                 |
| `scaleY`   | any finite number | `1`     | `none`                 |
| `rotation` | degrees           | `0`     | `wrap` over `[0, 360)` |
| `opacity`  | `[0, 1]`          | `1`     | `clamp`                |

**On `opacity` defaulting to `1`.** Painting a Tile must make it visible without a second
Operation to turn it on. A default of `0` would make every stack begin with a redundant step.

**On separate `scaleX` and `scaleY`.** The single `scale` of `02`'s provisional set cannot
express a flip, which is a basic tileset primitive — a leaf that only ever points one way is
half a leaf. Two axes give both flip (via a negative value) and non-uniform scale, in numbers,
without introducing a boolean. Square cells (`02` §7) constrain the _cell_, not the drawable
inside it, so non-uniform tile scale is not precluded.

The alternative was a typed `flipX: boolean`. It loses because it makes Blends **partial**:
every Blend in `04` would need to declare which types it accepts, and `06` would need per-type
validation, all to encode a `-1` that a number already encodes.

**A correction to this argument's premise, from `04` §7.2.** Blends turned out to be partial
regardless, because `tileId` is a Target and accepts only `set`. The type count was never one;
with a tile Target in play it was always two. The argument above therefore reads correctly as
_"do not let it become three"_ — which it still is, and which still holds. `04` §7.2 carries the
per-Target table of accepted Blends.

**On `scaleX`/`scaleY` being unbounded.** Rejecting the normalized model on the grounds that
scale has no natural maximum, and then inventing one here, would be incoherent. The domain is
open; the editor constrains what the author can type → `09-editor.md`.

### 5.5 The attribute set is closed

**Invariant D7** — _The attribute set is closed at V1. Attributes cannot be registered at
runtime._

`05-extension-model.md` exists for registries, so symmetry argues for an open attribute
registry. It loses on a specific asymmetry: a **Source** is pure engine — register one and every
renderer keeps working, because the output is still a number. An **attribute** is meaningless
unless the renderer knows how to apply it. Registering `blur` without a renderer that blurs
produces a `TileState` field that silently does nothing.

The attribute set is therefore not an engine extension point at all. It is **shared vocabulary
between engine and renderer**, part of the surface `07-render-contract.md` obliges every
conformant renderer to implement, and versioned with the schema.

`07` §10 supplies that surface. Application is keyed by attribute name against a table declaring
each attribute's drawing facet and, for transform contributors, its position in the composition
order — which is **D11** generalized. `07` **R13** makes an attribute with no applier a load
failure rather than the silent no-op described above. The set stays closed by **D7**; what
changed is that opening it later is now a two-document change.

### 5.6 Defaults are global, never per-Tile

**Invariant D8** — _Attribute defaults belong to the attribute, not to the Tile._

Per-Tile defaults are attractive — _this Tile is always drawn at half scale_ — and must be
rejected, because `tileId` changes mid-stack. If defaults were per-Tile, a cell's initial state
would depend on which Tile happened to occupy it at the moment the question was asked, so "what
were the defaults" becomes order-dependent, and an Operation that repaints `tileId` would
retroactively alter the baseline of Operations that already ran.

`02` §9 step 1 initializes attributes to their declared defaults **before** any Operation runs
and therefore before any `tileId` exists. D8 keeps that step well-defined. Recorded as an
extension point in §8 with the constraint any future design must solve.

---

## 6. TileState

Restating `02` §8 with the attribute set filled in:

```
TileState {
  tileId:   string | null   // reference into the tile library
  assetId:  string | null   // written by the engine only
  scaleX:   number
  scaleY:   number
  rotation: number
  opacity:  number
}
```

### 6.1 `assetId` is an output, not a Target

**Invariant D9** — _`assetId` is written only by the resolution step of `02` §9. No Operation
can target it._

Asset resolution happens at step 3, after the whole stack. If an Operation could pin an
`assetId`, either resolution would overwrite the pin — making the field a lie — or resolution
would have to fire conditionally, and a pin could then survive a later `tileId` change and
dangle, pointing at an asset belonging to a Tile no longer in the cell.

Forbidding the write removes the problem rather than managing it, and costs the author nothing
they can't get another way: a Tile with a single TileAsset is a fully determined drawable.

### 6.2 One Tile per cell

**Invariant D10** — _A `TileState` holds at most one `tileId`. There is no layering within a
cell._

This is permanent, not a V1 limitation. Rendering two configured tilesets one atop the other is
**compositing of N grids in the renderer**, not two Tiles in one cell — the engine runs
unchanged, once per config, and stacking belongs to `07`/`08`. See §8.

It works precisely because of **G4**: a `tileId: null` cell renders nothing, so an upper layer
is transparent wherever it is empty.

### 6.3 Transform order

Non-uniform scale does not commute with rotation, so the order must be pinned or two conformant
renderers can disagree.

**Invariant D11** — _Scale is applied before rotation, both about the drawable's centre._

A negative `scaleX` therefore mirrors about the centre axis, which is the intuitive reading of
"flip". `opacity` applies to the result and is order-independent. The transform mathematics
itself — matrices, units, how "centre" is computed for a given asset — is
`07-render-contract.md`.

### 6.4 Inert states

Two states produce no visible output, and they are not the same state:

| State                      | Behaviour                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tileId: null`             | Nothing renders. No asset is resolved. `assetId` stays `null`. Attributes retained but inert (**G4**).              |
| `opacity: 0`               | The cell holds a real Tile. An asset **is** resolved and `assetId` is populated. The drawable is fully transparent. |
| `scaleX: 0` or `scaleY: 0` | The cell holds a real Tile and a resolved asset. The transform is degenerate and the drawable has no area.          |

Keeping them distinct matters because `opacity` is a normal attribute a later Operation can
raise back above zero, whereas `tileId: null` has nothing to raise. A zero scale is recoverable
in the same way and for the same reason. Whether a renderer skips drawing any of the three is an
optimization detail for `07`, invisible to the engine — held `[POSTPONED]` there, because a
skipped cell is also an unresolved asset and therefore an unreported resolution failure
(`07` §4.3).

---

## 7. Invariants summary

| ID      | Invariant                                                                               |
| ------- | --------------------------------------------------------------------------------------- |
| **D1**  | A Tile's identity is its `id`. `name` never affects generation output.                  |
| **D2**  | A TileAsset carries an identifier, a weight, and opaque metadata — never sprite data.   |
| **D3**  | The weight walk depends on the set of `(id, weight)` pairs, never on their arrangement. |
| **D4**  | Every attribute declares a domain, a default, and a bounding behaviour.                 |
| **D5**  | Bounding is applied after every write; the accumulated value is always in-domain.       |
| **D6**  | Non-finite Blend results are discarded; every emitted attribute value is finite.        |
| **D7**  | The attribute set is closed at V1 and cannot be extended at runtime.                    |
| **D8**  | Attribute defaults belong to the attribute, never to the Tile.                          |
| **D9**  | `assetId` is written only by the engine's resolution step; no Operation targets it.     |
| **D10** | A `TileState` holds at most one `tileId`. There is no layering within a cell.           |
| **D11** | Scale is applied before rotation, both about the drawable's centre.                     |

---

## 8. Extension points

| Point                                                     | Status                                                                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer compositing — N grids stacked by the renderer       | `[EXTENSION POINT]` — no engine change; layers must agree on `rows`, `columns`, and `cellSize` to align. Owned by `07` / `08`.                                                                 |
| Per-Tile attribute defaults                               | `[POSTPONED]` — must first answer what "the defaults" means when `tileId` changes mid-stack (§5.6)                                                                                             |
| Typed (non-numeric) attributes                            | `[POSTPONED]` — the gate it named is discharged: ADR-001 made Blends partial and made a Blend declare its accepted Target types (`04` §7.2). Still gated on **D7** and a `schemaVersion` bump. |
| Open attribute registry                                   | `[EXTENSION POINT]` — the applier contract exists (`07` §10, **R13**). Still gated on **D7** and a `schemaVersion` bump; no longer gated on `07`.                                              |
| Multi-cell Tiles (a drawable spanning more than one cell) | `[POSTPONED]` — conflicts with **D10** and with the per-cell purity of `02` §9                                                                                                                 |
| Conditional or positional asset weights                   | `[POSTPONED]` — weights are constant per Tile in V1                                                                                                                                            |

---

## 9. Open questions

| #   | Question                                                                   | Status                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the engine validate `tileId` references, or trust a validated config? | **Resolved** — it trusts, as §3.1 assumed. `06-config-schema.md` §10 makes `validate()` a separate function; `generate()`'s behaviour on an unvalidated config is undefined (`06` **C5**), in the manner of `05` §6.3. A dangling reference is `DANGLING_TILE_REF` at the palette entry's path (`06` §10.3).                                                                                         |
| 2   | Is `Tile.name` required to be unique?                                      | **Resolved — no.** `06-config-schema.md` §5.3, **C10**. Unconstrained: not unique, not charset-limited, possibly empty. **D1** means a collision cannot reach output, so the only cost is authoring clarity and disambiguation is `09`'s.                                                                                                                                                            |
| 3   | Are `TileAsset.id` values unique per Tile or globally?                     | **Resolved** — per Tile, which is all §4.2 needs. Global uniqueness is neither required nor forbidden. Confirmed rather than tightened by `06-config-schema.md` §6; `06` **C10** adds a charset (`[A-Za-z0-9_-]+`) shared by all three identifier kinds.                                                                                                                                             |
| 4   | What authoring ranges should the editor impose on `scaleX` / `scaleY`?     | **Deferred** → `09-editor.md`. The domain is deliberately open (§5.4).                                                                                                                                                                                                                                                                                                                               |
| 5   | Is the V1 attribute set final?                                             | **Resolved — final for V1.** §5.4. **D7** makes any addition a schema change, not a runtime one.                                                                                                                                                                                                                                                                                                     |
| 6   | Which renderer-facing metadata fields does a TileAsset carry?              | **Resolved** — `07-render-contract.md` §4.4. V1 carries `src`, `width`, and `height`, the last two measured once at attach time and read by nothing in V1. The block is the asset provider's input, passed verbatim and never interpreted by the renderer, and it is **additive-only** (`07` **R4**) because nothing else versions its contents. The engine treats it as opaque either way (**D2**). |
