# 02 — Generation Contract

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`  
> **Constrains:** `03-domain-model.md`, `04-operations.md`, `06-config-schema.md`, `07-render-contract.md`  
> **Amended:** §4, §4.1, §6, §6.3, §6.4, **G1** rewritten in place; §6.7 added — see `/adr/002-load-salt-as-engine-argument.md`  
> **Amended:** §4.1, §6.4, §7.4, Q5 — see `06-config-schema.md` §3.3, §5.2, §8, §4.1
> **Amended:** §7.5 premise withdrawn, §12 gains `selection()` — see `09-editor.md` §9.2, §6.2  
> **Amended:** §9, §10.1 — see `01-glossary.md` §7.1, Q7

---

## 1. Purpose

This document defines the boundary between **generation** and **rendering**.

It specifies what the engine consumes, what it produces, what guarantees it makes about
reproducibility, and what it is explicitly forbidden from knowing.

Every other specification in this package is downstream of the decisions recorded here.
If a decision in this document changes, saved configurations may become invalid.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- The semantics of individual Selections, Sources, Blends, or Targets → `04-operations.md`
- The registry mechanism for adding new ones → `05-extension-model.md`
- The concrete JSON shape and validation rules → `06-config-schema.md`
- Scaling, clipping, and viewport fitting → `07-render-contract.md`
- Asset formats (SVG, PNG, HTML, Canvas) → `07-render-contract.md`
- Editor behaviour and interaction design → `09-editor.md`
- Compilation, caching, and optimization → `roadmap.md` (postponed)

---

## 3. Terminology

| Term          | Definition                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| **Cell**      | A grid coordinate `(x, y)`. Has no appearance of its own.                                   |
| **TileState** | The resolved state occupying a Cell. Carries `tileId`, `assetId`, and all attribute values. |
| **Tile**      | A tile identifier / family. The unit the engine reasons about.                              |
| **TileAsset** | A concrete drawable within a Tile family, carrying a selection weight.                      |
| **Grid**      | The `rows × columns` integer matrix. Engine input.                                          |
| **Layout**    | Design-space measurements used only by the renderer. Never an engine input.                 |
| **Operation** | One `(Selection, Source, Blend, Target)` unit, applied in stack order.                      |

The engine operates on **Tiles**. It resolves a **TileAsset** per cell as its final step,
but never learns what that asset actually is.

---

## 4. Engine signature

```
generate(config: TilesetConfig, seed: Seed, loadSalt: uint32 = 0) -> Grid<TileState>
```

The engine is a **pure function**. Given the same `(config, seed, loadSalt)` triple it returns a
structurally identical result, on any machine, in any runtime, at any time.

### 4.1 Seed

- `Seed` is a **string**.
- It is a **runtime parameter**, not a design constant, and it is **required**.
- The config carries `defaultSeed`, also required. It is a **caller instruction**: the engine
  never reads it, and the caller passes it as `seed` unless the host supplies its own.
- Randomization policy lives entirely outside the engine.
  `defaultSeed` is required so that a config renders standalone. Were it optional, a config
  carrying no seed and a caller supplying none would leave `generate()` with nothing to hash
  against, and the engine would need a fallback — a design constant §4.2 forbids it from holding.
  Making the field mandatory removes the case rather than handling it, and `07-render-contract.md`
  gets to specify seed selection with no null branch anywhere.
  **The engine never applies the default.** It receives a seed; it does not go looking for one.
  `defaultSeed` is therefore the **only** field in the config that the engine carries and never
  reads — an instruction to whoever calls it, and the whole of `02`'s randomization policy sitting
  outside the engine while still travelling in the file.
  An earlier revision of this paragraph placed `reseedOnLoad` and `reseedAssetsOnLoad` in the same
  company. That was true before ADR-002 and was left standing by it in error. §6.7 has the engine
  read both flags — per Operation and per config — to resolve the effective seed for each channel,
  which is precisely what the reversal did. **Both are engine inputs.** `defaultSeed` stands alone,
  and it lives in the config rather than in `06-config-schema.md`'s `layout` block because it is
  the default value of an engine argument: it travels with what it substitutes for (`06` §3.3).

`loadSalt` is a `uint32`, drawn **once per load** by the caller and held for the whole
generation. It is not a config field and is never written to one. §6.7 specifies what the engine
does with it; `04-operations.md` §8 owns the per-Operation flag that decides which Operations
it reaches.

Two knobs, therefore, and they compose:

| Caller behaviour                           | Result                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `defaultSeed`, `loadSalt: 0`               | Identical background every load                                        |
| A fresh random seed per load               | New background every refresh — _including_ Operations the author froze |
| `defaultSeed`, a fresh `loadSalt` per load | Flagged Operations vary; every other Operation is pinned               |
| A seed derived from user/session/date      | Stable per user, per session, per day                                  |

Row 2 and row 3 are different features and the distinction matters. The seed is in every hash
key, so varying it moves everything — which is why, for `reseedOnLoad` to mean anything, the
**seed must be held fixed** and the variation must come from `loadSalt`. A caller doing both at
once has simply chosen row 2.

Internally the seed string is hashed to a `uint32` before use. Strings are chosen because
they are pleasant to author and safe to place in a URL.

### 4.2 Prohibited inputs

The engine **must not** receive, read, or infer:

- viewport dimensions
- device pixel ratio
- `cellSize` or any pixel measurement
- asset URLs, sprite data, or any graphical resource
- wall-clock time, `Math.random()`, or any ambient state
  **Invariant G1** — _Generation output depends on `(config, seed, loadSalt)` and nothing else._
  `loadSalt` does not weaken this list. It is a caller-supplied integer, not a measurement of the
  world: the engine receives it and never draws it. The version that would break **G1** — the
  engine calling `Math.random()` on seeing a `reseedOnLoad` flag — remains prohibited by the last
  bullet above. What varies between two loads is an argument, and an argument is part of the
  input the invariant quantifies over.

---

## 5. Coordinate space

- Origin `(0, 0)` is the **top-left cell** of the grid.
- `x` increases rightward across columns, `y` increases downward across rows.
- Coordinates are always **grid-absolute**, never viewport-relative.
- Every cell in `rows × columns` exists and is generated, including cells that the renderer
  will later clip away.
  **Invariant G2** — _Clipping is a rendering concern. A clipped cell is fully present in the
  grid, is affected by Selections, and contributes to any Source that counts or spans cells._
  This matters for correctness, not just tidiness: a horizontal gradient spanning a grid with
  symmetric bleed must span the _whole_ grid, or its midpoint drifts off the viewport's centre.

---

## 6. Determinism: positional hashing

Randomness is **positionally addressed**, never drawn from a sequential stream.

```
value = hash(effectiveSeed, channel, x, y, salt) -> [0, 1)
```

`effectiveSeed` is a `uint32` derived from `seed` and, where an Operation is flagged, from
`loadSalt`. §6.7 specifies the derivation. Everywhere below, read _the seed_ as _the effective
seed for the channel in question_; nothing else about this section depends on which of the two
it turned out to be.

Every Source is therefore a pure, stateless, total function:

```
Source: (x, y, ctx) -> number in [0, 1)
```

`constant`, `gradient`, `valueNoise`, and `vignette` are naturally positional; `random` is made
positional by this rule. All Sources share one signature, with no RNG handle threaded
through the call.

### 6.1 Why not a sequential PRNG

Under a shared stream, a value's identity depends on how many draws preceded it. That makes
the following silently reshuffle the entire canvas:

- inserting or deleting any operation that consumes randomness
- changing a Source from `random` to `constant`
- changing the column count
- changing the engine's internal iteration order (cell-major vs operation-major)
  The last is the most dangerous: an implementation detail becomes semantically load-bearing.

### 6.2 What positional hashing buys

- **Attribution.** A visual change can be traced to the edit that caused it.
- **Resize stability.** Adding a column adds a column; it does not reshuffle the rest.
- **Random access.** `generateRegion(x0, y0, w, h)` is possible without generating the whole grid.
- **Order independence.** Iteration order is a free implementation choice.
- **Per-operation reroll.** See §6.4.

### 6.3 Hash channels

Channels are namespaced so that unrelated decisions never collide:

| Channel             | Key                                                              | Rerolled by                                  |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Operation source    | `hash(effective(op), operationId, x, y, op.salt)`                | that operation's salt; `loadSalt` if flagged |
| Operation selection | `hash(effective(op), operationId + ":selection", x, y, op.salt)` | that operation's salt; `loadSalt` if flagged |
| Asset selection     | `hash(effective(assets), "asset", x, y, config.assetSalt)`       | the asset salt; `loadSalt` if flagged        |

The selection channel is added by `04-operations.md` §4.3, which owns the reasoning: a
stochastic Selection drawing from the same channel as its Operation's Source would select
exactly the cells whose value is low, and then hand those same low values to the mapping.
Both channels take the Operation's `salt`, so one reroll moves both together.

`operationId` is a **stable generated identifier**, assigned at creation and never derived
from stack position.

**Invariant G3** — _Reordering the operation stack changes composition only. Each operation
retains its own randomness as it moves._

This is the property that keeps the editor controllable. Reordering still changes output —
operations blend onto the accumulated state of those before them — but it changes it for a
reason the author can see, rather than by re-rolling unrelated noise.

### 6.4 Salts and reroll

Each Operation carries `salt: uint32`, default `0`, included in its hash key. Incrementing it
re-rolls that operation's randomness and nothing else.

The config carries `assetSalt: uint32` for the asset-selection channel, allowing variant
distribution to be re-rolled without disturbing any operation.

**Both are integers in `[0, 2³²)`, and this is validated** (`06-config-schema.md` §5.2, **C9**).
An earlier revision typed them as `number`. It never meant that fractional or out-of-range values
were legal, but it did not say so, and every consumer of a salt truncates: `04-operations.md`
§5.2's `XOR` coerces to `int32`, and §6.6's Stage 2 mixer is `uint32` throughout. So `salt: 0` and
`salt: 0.5` are the same input, which surfaces as a reroll button that visibly changes the config
and nothing else.

Two distinct reroll affordances therefore exist in the editor: **per-operation** and
**global asset distribution**. Neither is the same as changing the seed, which moves everything.

**Both salts are authoring values.** They live in the config, they are set by the author
clicking reroll until the picture is right, and they are **frozen** — nothing at runtime writes
to them, and the config the engine receives is the config on disk. Runtime variation is
`loadSalt`'s job and `loadSalt` is not a config field (§6.7). Keeping the two apart is what
stops `salt` from meaning an authored choice on one Operation and a value clobbered at load on
the next.

### 6.5 Composition is unaffected

Operations compose sequentially per cell, each blending onto the accumulated `TileState`.
Positional hashing governs only where a Source's number comes from, not how Operations stack.

### 6.6 The hash function

Determinism is only as portable as the hash. This must be pinned in the specification, not
left to whatever the first implementation reaches for — a one-bit disagreement between two
implementations invalidates every guarantee in this document.

**Two stages, both integer-only.**

**Stage 1 — seed string to `uint32`.** A short avalanche hash over the string's char codes
(xmur3 or FNV-1a class). Runs once per generation, so performance is irrelevant; portability
and brevity are what matter.

**Stage 2 — positional mixing.** Combine `(seedU32, channelU32, x, y, salt)` by folding each
into an accumulator with a multiply-xor-shift step, then apply a final avalanche
(murmur3 finalizer class). Return the top bits divided by `2³²` to land in `[0, 1)`.

**Portability rules — these are the spec, more than the choice of function itself:**

- All intermediate state is `uint32`. Every step ends with `>>> 0`.
- Multiplication uses `Math.imul` in JS. Never the `*` operator — it silently promotes to
  float past 2⁵³ and diverges from a Rust or Go port.
- No floating point anywhere except the single final division.
- `channelU32` is derived by running Stage 1 over the channel string (`operationId`, `"asset"`),
  so channel keys are ordinary strings with no registry of magic numbers.
  **Test vectors are part of the deliverable.** A table of
  `(seed, channel, x, y, salt) → expected uint32` ships with the spec. Any future
  implementation in any language is conformant if and only if it reproduces them. This is what
  makes a second renderer safe to write.
  **On authoring seeds.** The user never sees a hash. They type a string —
  `"sunset-3"`, `"draft-b"`, anything memorable — and that is the whole interface. The editor
  should offer a generated memorable seed (word-word-number) next to the field for when the
  author has no opinion, since the value of a seed is that it can be written down and returned
  to, and random hex defeats that.

### 6.7 The effective seed

Stage 1 hashes the run's `seed` string to a `uint32` once. Each hash channel then resolves an
**effective seed** before Stage 2 mixes position into it:

```
seedU32            = stage1(seed)
effective(op)      = op.reseedOnLoad           ? mixLoad(seedU32, loadSalt) : seedU32
effective(assets)  = config.reseedAssetsOnLoad ? mixLoad(seedU32, loadSalt) : seedU32
```

An Operation with `reseedOnLoad: false` hashes against `seedU32` on every load, forever,
whatever `loadSalt` happens to be. A flagged one hashes against a seed that moves each time the
caller draws a fresh `loadSalt`.

> `seed: "sunset-3"`. Op 1 `salt: 4`, unflagged. Op 2 `salt: 0`, flagged. Op 3 `salt: 7`,
> unflagged.
>
> Load A (`loadSalt: 82931`) and load B (`loadSalt: 15044`) differ in Op 2 and in nothing else.
> Op 1 still hashes against `salt: 4` and Op 3 against `salt: 7`, on both loads and on every
> load after them.

**`mixLoad`, at the constraint level**, in the manner of §6.6: a single multiply-xor-shift round
combining two `uint32` values into one. `uint32` throughout, every step ending `>>> 0`,
`Math.imul` never `*`, no floating point. It ships its own rows in the test vector table.

It adds **no key component to Stage 2**, whose shape is untouched. The reroll mechanism sits
entirely upstream of the positional mixing, which is why every guarantee in §6.2 survives it
unchanged.

**`loadSalt = 0` is an ordinary value, not an identity.** `mixLoad(s, 0)` is not required to
equal `s`. Requiring it would buy an equivalence nothing needs — no caller has reason to ask
whether a flagged Operation would have looked the same unflagged — at the price of a magic value
in the one place this document has been most careful to avoid one. A default of `0` means a
fixed, reproducible load, which is all it needs to mean.

**Flagged channels move together.** One draw re-rolls every flagged Operation and, if
`reseedAssetsOnLoad` is set, the asset channel with them. Their _values_ stay uncorrelated
regardless, because the channels are namespaced by `operationId` (`04-operations.md` **O3**) —
moving together is not the same as agreeing. It is also the intended reading of the flag: it
says _vary this on every load_, and an Operation that should stay put across loads is one whose
flag is false.

**Reproduction is two values.** `(seed, loadSalt)` reproduces any render exactly, including one
with flags set. Nothing else need be recorded, and no config is derived along the way.

---

## 7. Grid and Layout

A strict split. The engine sees only the left column.

| **Grid** — engine input | **Layout** — renderer input                           |
| ----------------------- | ----------------------------------------------------- |
| `rows: int`             | `cellSize: number` (design px, cells are square)      |
| `columns: int`          | `referenceWidth: number` (design px)                  |
|                         | `yOffset: number` (fraction of cell height, `[0, 1)`) |
|                         | `horizontalAlignment: "column" \| "gutter"`           |

### 7.1 Derivation (editor, at authoring time)

```
n = ceil(editorPageWidth / cellSize)
if parity(n) does not match horizontalAlignment: n += 1
columns = n
referenceWidth = editorPageWidth
```

Parity is always corrected **upward**. Rounding down would leave gaps at the grid edges;
rounding up produces symmetric bleed, which is the intended look.

`horizontalAlignment: "column"` requires odd `columns` (the centre axis falls through a cell);
`"gutter"` requires even (the axis falls on a boundary).

### 7.2 referenceWidth is not derivable

`referenceWidth ≠ columns × cellSize`. The difference is the intentional bleed.

> Config A: `ceil(1280 / 175) = 8` columns → 1400 design px of grid, authored at 1280.
> 120px overflows, 60px off each side.

A renderer that assumed a 1400px design width would compute
`scale = viewportWidth / 1400`, the bleed would vanish, and the grid would fit neatly —
exactly the outcome the design marks as wrong. `referenceWidth` must therefore be stored.

### 7.3 What is stored vs. shown

|                       | In editor UI   | In config JSON         |
| --------------------- | -------------- | ---------------------- |
| `cellSize`            | ✅             | ✅                     |
| `rows`                | ✅             | ✅                     |
| page width            | ✅ (draggable) | ✅ as `referenceWidth` |
| `horizontalAlignment` | ✅ (toggle)    | ✅                     |
| `columns`             | ❌ derived     | ✅ frozen              |

`horizontalAlignment` is **authoring metadata**. Its only function is constraining parity
during derivation. At render time, centring the grid on the viewport's centre axis produces
the correct alignment automatically as a consequence of that parity — the renderer never
reads the field.

### 7.4 Vertical behaviour

The grid is **top-anchored**. There is no vertical counterpart to `horizontalAlignment`.
Grid height is `rows × cellSize` in design px; only `rows` makes the grid taller or shorter.

`yOffset` shifts the grid upward by a fraction of one cell height, clipping the top of row 0.
Its domain is `[0, 1)`: an offset of exactly one cell would be indistinguishable from
deleting row 0, which would let two different configs produce identical output.

**Read "clamped" as the editor's constraint on input, not as something a loader does.** An
earlier revision of this paragraph said the value is clamped, which invited a loader to accept
`1.4` and quietly read it as `0.999…`. `06-config-schema.md` **C6** rejects it instead. A loader
that silently rewrites a value produces a picture the file does not describe, and the author's
next save writes the rewritten value back over their own.

### 7.5 Resize policy (V1)

Changing `referenceWidth`, `cellSize`, or `horizontalAlignment` after operations exist **is a
destructive edit**. It re-derives `columns` per §7.1, which orphans manual selections and shifts
column-indexed operations.

**V1 decision:** the editor warns and requires confirmation. Selections are not migrated.

Procedural Selections (checkerboard, every-nth-column) survive resizing unharmed; only
coordinate-bound Selections are affected. Detailed behaviour is deferred to `09-editor.md`.

**An earlier revision attached this to "a page width the author can drag at any time."** That
premise is withdrawn. `09` §9.2 separates the two controls: a draggable **preview width** sets
`Wpx` and writes nothing (`07` §9.1's second row, **E11**), and a numeric **design width** writes
`referenceWidth`. The destructive rule is unchanged and now attaches to the control that is hard
to trigger by accident. Note also that it attaches to three fields rather than one — `columns`
derives from all three, and a `horizontalAlignment` toggle can move it through parity alone.

---

## 8. TileState

The engine's output is `Grid<TileState>` — plain serializable data. No DOM nodes, no canvas
contexts, no asset references, no functions.

```
TileState {
  tileId:  string | null
  assetId: string | null
  ...attributes
}
```

The attribute set is defined in `03-domain-model.md` §5.4 and is **closed at V1** (`03` **D7**):
`scale`, `scaleX`, `scaleY`, `rotation`, `opacity`. Nothing in this document depends on which attributes
exist — only on the fact that they are named, carry declared domains, and are interpreted by
Targets rather than by Sources.

_Normalized_ in the sense this document originally used is superseded. `03` §5.1 rejected the
uniform `[0, 1)` model — a normalized `scale` needs a maximum to normalize against, and any
maximum is a design constant §4.2 forbids the engine from knowing. Each attribute instead
declares its own domain, and mapping a Source's `[0, 1)` value into that domain is the
Operation's job (`04-operations.md` §6). Step b′ of §9 is where it happens.

### 8.1 Empty cells

Every cell **initializes to `tileId: null`**. A fresh grid is empty and Operations paint into it.

`null` means nothing renders, regardless of any other attribute value. Clearing a region is
just an Operation setting `tileId` to null — no sentinel Tile is needed in the tile library,
and "empty" never appears as a selectable entry in the editor.

**Invariant G4** — _A cell with `tileId: null` produces no output. Its other attributes are
retained but inert._

### 8.2 Asset resolution

`TileState` carries **identifiers only**. Resolution from `assetId` to a drawable happens in
the renderer, through an asset provider supplied alongside the config.

Consequently a `Tile` in the config holds an id, its `TileAsset` entries with weights, and
metadata — **and no sprite data of any kind**.

**Invariant G5** — _The engine never touches a graphical resource. Adding an SVG, Canvas,
WebGL, or PNG renderer requires no engine change._

---

## 9. Evaluation model

For each cell `(x, y)`:

1. Initialize `TileState` to defaults (`tileId: null`, attributes at their declared defaults).
2. For each Operation in stack order:
   a. Test whether the cell is in the Operation's Selection; skip if not.
   b. Evaluate the Source at `(x, y)` → normalized `[0, 1)`.
   b′. Map that normalized value into the Target's domain via the Operation's mapping.
   c. Apply the Blend of the mapped value onto the Target's current value.
3. Resolve `assetId` from `tileId` via the weight walk (§10).
4. Emit the `TileState`.
   A Source emits a bare number with no units; a Target's domain has them. Step b′ is where that
   translation happens, and it is owned by `04-operations.md` §6 — including the fact that the
   mapping is a property of the Operation rather than of the attribute, so two Operations writing
   the same attribute may map differently.
   Because every step is a pure function of `(x, y)`, cells may be evaluated in any order or in
   parallel. Complexity is `O(rows × columns × operations)`, which is accepted for V1.

---

## 10. Asset selection and weight stability

Given a cell's resolved `tileId`, its asset is selected by comparing
`h = hash(seed, "asset", x, y, assetSalt)` against the cumulative weights of that Tile's assets.

### 10.1 Known behaviour: weight edits are not locally stable

Thresholds derive from **all** weights collectively, so editing any one weight moves the
boundaries under every cell of that Tile.

> Assets `[A:0.5, B:0.3, C:0.2]` → thresholds `[0.5, 0.8, 1.0]`. A cell with `h = 0.6` shows **B**.
> Raise A to `0.7` → thresholds `[0.7, 0.9, 1.0]`. That same cell now shows **A**,
> though B's weight never changed.

This is **expected behaviour, not a defect.** It is inherent to the weight walk over a
fixed hash value. Mitigations exist but cost more than the problem is worth at V1 scale.

Recorded here so it is not later filed as a bug.

---

## 11. Invariants summary

| ID     | Invariant                                                                            |
| ------ | ------------------------------------------------------------------------------------ |
| **G1** | Generation output depends on `(config, seed, loadSalt)` and nothing else.            |
| **G2** | Clipped cells exist in the grid and participate fully in generation.                 |
| **G3** | Reordering operations changes composition only, never an operation's own randomness. |
| **G4** | `tileId: null` renders nothing; other attributes are retained but inert.             |
| **G5** | The engine never touches a graphical resource.                                       |

---

## 12. Extension points

| Point                                                                  | Status                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateRegion(x0, y0, w, h)`                                         | `[EXTENSION POINT]` — enabled by positional hashing, not built                                                                                                                                                                                                                |
| `selection(config, operationId, seed, loadSalt) -> (x, y) -> boolean`  | **Required by `09` §6.2, E8.** An added export that moves no output — a minor bump under `05` §10.2. Without it the editor reimplements every Selection test to draw one overlay, which is `07` **R1**'s failure one layer up. Total and unbounded in `(x, y)`, per `04` §4.2 |
| Parallel / worker generation                                           | `[EXTENSION POINT]` — enabled by order independence, not built                                                                                                                                                                                                                |
| Multiple Layouts per config, keyed by `minWidth`                       | `[EXTENSION POINT]` — the term _breakpoint_ is reserved for this                                                                                                                                                                                                              |
| Compilation phase (validation, constant folding, Selection precompute) | `[POSTPONED]`                                                                                                                                                                                                                                                                 |
| Expression language replacing Source presets                           | `[POSTPONED]` — viable because Sources are pure                                                                                                                                                                                                                               |

**Naming note:** `referenceWidth` deliberately avoids the word _breakpoint_. It is the frozen
authoring width, not a runtime selector. When multi-layout support arrives, each Layout will
carry its own `minWidth` and that will be the breakpoint.

---

## 13. Open questions

| #   | Question                                                           | Status                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Which hash function?                                               | **Resolved** — §6.6. Exact function and test vectors to be fixed at implementation. `mixLoad` (§6.7) is specified the same way and ships its own vector rows.                                                                                              |
| 2   | Full attribute set on `TileState`, with defaults and valid ranges. | **Resolved** → `03-domain-model.md` §5.4. The V1 set was `scaleX`, `scaleY`, `rotation`, `opacity`, each with a declared domain, default, and bounding behaviour (**D4**); ADR-005 added `scale` as the schema change **D7** requires. `03` **D7** closes the set: an addition is a schema change, not a runtime one.       |
| 3   | Do `set` and `override` differ as Blends?                          | **Resolved** — they do not. `04-operations.md` §7.1 keeps `set` and strikes `override`.                                                                                                                                                                    |
| 4   | Presentation of orphaned manual selections after a resize.         | **Postponed.** V1 behaviour is warn-and-confirm (§7.5); the author-facing detail is not needed yet.                                                                                                                                                        |
| 5   | Does the config carry `schemaVersion` from V1?                     | **Resolved** — `06-config-schema.md` §4.1, **C2**. Yes: required, an integer — `1` for V1, `2` since ADR-005. Absent, or unknown and unreachable by `06` §4.5's migration, is a load failure, and no shape is inferred from which fields happen to be present. The note below is retained as the reasoning that led there. |

### Note on `schemaVersion`

A single integer in the config recording which revision of the schema wrote it — `1`, then `2`
when the shape changes incompatibly.

Its value is that it lets a loader recognize an older file and migrate it, rather than reading
a stale shape as if it were current and failing in some unpredictable place. Without it, the
only way to detect an old config is to guess from which fields happen to be present.

It costs one integer now. Adding it later means every config written before that point is
unversioned and indistinguishable, which is the case it exists to prevent. Recommended for V1
on those grounds, but the decision belongs to `06-config-schema.md`.
