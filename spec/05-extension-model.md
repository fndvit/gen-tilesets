# 05 — Extension Model

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`, `03-domain-model.md`, `04-operations.md`  
> **Constrains:** `06-config-schema.md`, `07-render-contract.md`, `09-editor.md`  
> **Amended:** §6.4, §11, **X9**, **X10** — see `/adr/002-load-salt-as-engine-argument.md`  
> **Amended:** §8, Q1, Q4 — see `06-config-schema.md` §7.2, §4.4, §7.4  
> **Amended:** §10.2's last row corrected, §11.1's tail, §13, Q5 — see `07-render-contract.md` §11  
> **Amended:** §13 gains an explicit-region row — see `09-editor.md` §14.2

---

## 1. Purpose

`04` enumerates the Selections, Sources, and Blends that exist. This document defines **how
that list grows**, what a new entry must declare, and what must stay true when the list
changes.

It also defines the boundary the list may not cross: which parts of the system are
deliberately closed, and why closing them is not an oversight.

The second half is versioning. A config outlives the engine build that wrote it, so _"the
list changed"_ and _"an existing entry changed"_ are different events with different costs.
This document says which is which and what each obliges.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- The semantics of any existing Selection, Source, or Blend → `04-operations.md`
- The concrete JSON encoding of a parameter schema, and validation rules → `06-config-schema.md`
- `schemaVersion` and config migration → `06-config-schema.md`
- What a renderer does with a resolved `TileState` → `07-render-contract.md`
- How a parameter's control is drawn, and slider bounds → `09-editor.md`
- The attribute set, domains, defaults, bounding → `03-domain-model.md` §5
- The hash function and its portability rules → `02-generation-contract.md` §6.6

---

## 3. The operating assumption

**There is one engine.** It is developed in this repository, published as a package, and
consumed by pinning a version. There is no public registration API, no third-party author,
and no second implementation in another language.

This is stated because it changes the argument for several rules below without changing the
rules themselves — and a later reader who assumes an open plugin ecosystem will misread the
reasoning.

### 3.1 What follows from it

**No public API surface.** A new Source is added the way any other code is added: a source
file, an entry in a table, a commit, a release. §5 describes what that entry must carry, not
a function signature exposed to strangers.

**No defensive coding against a hostile extension.** The obligations in §6 are honoured by
the author, checked by tests, and asserted in development builds. They are not enforced at
runtime on every cell. §6.3 is the worked case.

**Portability becomes a claim about time, not about languages.** `02` §6.6 justified pinning
the hash by the prospect of a second implementation. That prospect is now remote, and the
justification survives intact anyway, because the harder problem was always the other one:

> A background authored in March renders on a live site in September. If `valueNoise`'s
> interpolation was tidied up in between, that site's picture changed — silently, with no
> error, and with nobody having touched the config.

One engine does not help here. There is one engine _at a time_, and the config outlives the
build that wrote it. Everything `02` §6.6 and `04` §5.2 pinned — the exact smoothstep, the
per-octave salt derivation, lacunarity fixed at `2` — is what turns _"did I change anything
visible"_ from a judgement call into a test run.

**Invariant X0** — _A change in generated output is a breaking change, whether or not any
interface moved._

Numbered `X0` because §10 is its enforcement and everything else here is downstream of it.

---

## 4. What is extensible, and what is closed

| Kind         | Status         | Owner of the existing set |
| ------------ | -------------- | ------------------------- |
| Selection    | **Extensible** | `04` §4.2                 |
| Source       | **Extensible** | `04` §5.2                 |
| Blend        | **Extensible** | `04` §7.1                 |
| Attribute    | **Closed**     | `03` §5.4, **D7**         |
| Target       | **Closed**     | `04` §7.2                 |
| Hash channel | **Closed**     | `02` §6.3, `04` §4.3      |
| Mapping kind | **Closed**     | `04` §6.2, §6.3           |

**Invariant X1** — _Selections, Sources, and Blends may be added. Attributes, Targets, hash
channels, and mapping kinds may not._

### 4.1 Why attributes are closed

`03` §5.5 already answers this and it is restated here because this is the document a reader
would check.

A Source is pure engine. Add one and every renderer keeps working, because the output is
still a number in `[0, 1)` flowing into an existing attribute. An **attribute** is different:
it is meaningless unless the renderer knows how to apply it. Registering `blur` without a
renderer that blurs produces a `TileState` field that silently does nothing — which is the
same failure shape as a silent output change, arrived at from the other direction.

The attribute set is not an engine extension point at all. It is shared vocabulary between
engine and renderer, and adding to it is a coordinated change across `03`, `06`, `07`, and
`08` — a schema change, not a registration.

### 4.2 Why Targets are closed

Targets follow attributes. Four of the five are attributes directly; `tileId` is structural
and there is exactly one of it per cell by **D10**.

This is what made the Blend declaration inversion necessary. Under the original reading of
**O7** — each Target enumerating the Blends it accepts — a Blend added later would be
accepted by nothing, because no closed Target could grow a new entry. `04` §7.2 now runs the
declaration the other way: a Blend declares the Target _types_ it accepts, and a Target
declares vetoes.

**Invariant X2** — _Adding a Blend obliges a review of every Target's veto list. A Blend
declaring `numeric` becomes available on every numeric Target at once unless vetoed._

> `min` is added, declaring `numeric`. It is immediately accepted by `scaleX`, `scaleY`,
> `rotation`, and `opacity`. Three of those are sensible. `min` on `rotation` under a
> wrapping domain is not — `min(350°, 10°)` is `10°`, but `350°` is ten degrees _anticlockwise_
> of `10°`, so the "smaller" value is the larger rotation. `rotation` vetoes it, alongside
> the `multiply` it already vetoes.

Forgetting the review does not error. It ships a control that produces nonsense.

### 4.3 Why the hash channel set is closed

Three channels exist (`02` §6.3, extended by `04` §4.3):

| Channel string               | Question it answers                                        |
| ---------------------------- | ---------------------------------------------------------- |
| `operationId`                | what number does this Operation's Source give at this cell |
| `operationId + ":selection"` | does this Operation's `random` Selection include this cell |
| `"asset"`                    | which TileAsset shows at this cell                         |

A Source needing several independent numbers per cell has two ways to get them: vary the
channel string, or vary the salt. `valueNoise` needs twelve — four lattice corners across
three octaves — and `04` §5.2 varies the salt:

```
oSalt = salt XOR imul(o + 1, 0x9E3779B1)
```

**Invariant X3** — _A Source derives additional randomness by varying `salt`. It never
constructs a new channel string. The channel set remains at three._

Two reasons, and the second is the one that matters in a single-author codebase.

**Channel strings share one namespace; salts do not.** A future `worleyNoise` needing a
second draw per cell might reach for `operationId + ":selection"` — a natural name for
picking a feature point, and already taken. The Source would then read the same numbers as
the `random` Selection, and any Operation using both would be correlated: the exact bug
`04` §4.3 exists to prevent, reintroduced by accident eight months later. A salt cannot
collide, because it is only ever combined with that Operation's own channel.

**Reroll keeps working for free.** The reroll affordance of `02` §6.4 increments `salt`. A
Source deriving its extra draws from `salt` is rerolled correctly with no further work. One
using fixed channel strings must thread `salt` into every one of them, and an omission is
invisible — the Source simply stops responding to its own reroll button.

### 4.4 Why mapping kinds are closed

`04` §6 defines exactly two: numeric (`range`, optional `steps`) and tile (`palette`). The
kind is not chosen by the author — it is determined by the Target's type, which is closed by
§4.2. A third mapping kind would therefore need a third Target type, which needs a
non-numeric attribute, which `03` §5.4 rejected.

`curve` remains `[POSTPONED]` as an optional _field_ on the numeric mapping (`04` §6.2), not
as a new kind.

---

## 5. Registration

A registered type is an entry in a table, keyed by the name a config uses to refer to it.

```
Registration {
  kind:   "selection" | "source" | "blend"
  name:   string        // what appears in a config
  params: ParamSchema   // §5.1
  impl:   function      // the semantics
  ...kind-specific declarations   // §6, §7, §8
}
```

**Invariant X4** — _A registered type declares a name unique within its kind, a parameter
schema, and an implementation. Registering into an occupied name is an error, never a
silent overwrite._

Silent overwrite would make load order semantically load-bearing — the failure `02` §6.1
rejected for iteration order, and `03` **D1** rejected for identifiers derived from list
position. The same objection applies: an implementation detail nobody is looking at decides
what the config means.

Names are unique **within a kind**, not globally. `random` is deliberately both a Selection
and a Source (`04` §4.2, §5.2); they are namespaced by slot and take different parameters.
`01` §10.3 records this collision as tolerated.

### 5.1 The parameter schema

Three consumers need it, which is why it is data rather than a comment:

| Consumer | Uses it to                                                               |
| -------- | ------------------------------------------------------------------------ |
| `06`     | validate a loaded config's parameters without hand-written per-type code |
| `09`     | build the author's controls without a hand-written panel per type        |
| tests    | enumerate the admissible parameter space (§11)                           |

For each parameter the schema carries **a name, a type, the values that type admits, and a
default where one exists.** Stated at that level deliberately: the concrete encoding is
`06`'s and the widget choice is `09`'s.

What the V1 presets require it to express, as a completeness check:

| Parameter             | From               | Needs                                        |
| --------------------- | ------------------ | -------------------------------------------- |
| `density`             | `random` Selection | number, inclusive `[0, 1]`                   |
| `parity`              | `checkerboard`     | enum `0 \| 1`                                |
| `axis`                | `everyNth`         | enum `"column" \| "row"`                     |
| `n`                   | `everyNth`         | integer, `≥ 1`                               |
| `offset`              | `everyNth`         | integer, default `0`                         |
| `x, y, width, height` | `rect`             | integers; may exceed grid bounds (`04` §4.2) |
| `cells`               | `cellList`         | list of coordinate pairs                     |
| `cellsPerFeature`     | `valueNoise`       | number, exclusive `> 0`, finite              |
| `octaves`             | `valueNoise`       | integer, `1–3`                               |
| `angle`               | `gradient`         | number, unbounded                            |

Types needed: number, integer, enum, and coordinate list. Bounds are inclusive or exclusive
and either end may be absent. Nothing in V1 needs a nested or conditional schema, and none
should be introduced to serve one preset.

**A note on `cellList`.** Its parameter is unbounded in size and is the one an author edits
by painting rather than by typing. It is the reason the schema needs a list type at all, and
the reason `09` cannot generate every control mechanically. Flagged rather than solved here.

---

## 6. What a Source declares

Beyond §5: a **stochastic flag** and a **totality obligation**.

### 6.1 Stochastic

```
stochastic: boolean
```

True when the Source's output depends on the hash. `random` and `valueNoise` are stochastic;
`constant`, `gradient`, and `vignette` are not.

**Invariant X5** — _A Source declares whether it is stochastic._

`04` §8.4 requires it: `reseedOnLoad` is inert on a Source that consumes no hash, and the
editor offers the flag only where it means something. A Source that got this wrong would
present a reroll button doing nothing, which reads as a broken engine rather than a
mislabelled Source.

It is a declaration and not something derived, because deriving it means inspecting whether
the implementation calls `hash()` — a static-analysis question with a wrong answer available
in both directions.

### 6.2 Totality

**Invariant X6** — _A Source returns a finite number in `[0, 1)` for every `(x, y, ctx)` and
every parameter value its schema admits. `1.0` is not a legal return value._

The half-open interval is not fastidiousness. Two mechanisms downstream prove their own
termination from `t < 1` **strictly**:

**The palette walk** (`04` §6.3). Palette `[water:1, sand:1, grass:3]`, total `5`:

> `t = 0.9` → `target = 4.5`. Cumulative runs `1, 2, 5`. First entry strictly exceeding
> `4.5` is grass. Selected.
>
> `t = 1.0` → `target = 5`. Cumulative runs `1, 2, 5`. **Nothing strictly exceeds `5`.**
> The walk falls off the end of the list and selects nothing. There is no answer to return.

The identical argument covers asset selection (`03` §4.3), which uses the same walk.

**The stepped mapping** (`04` §6.2). `range: [0, 270]`, `steps: 4`:

> `t = 0.99` → `index = floor(3.96) = 3` → `270°`. Correct.
>
> `t = 1.0` → `index = 4` → `360°`, which `03` §5.4 wraps to `0°`. No crash. Just a fifth
> outcome that the author's `steps: 4` said would not exist, appearing on however many cells
> hit it.

The built-ins cannot reach `1.0`: `02` §6.6 returns the top bits divided by `2³²`, whose
largest value is `4294967295 / 4294967296`. `valueNoise` proves its own range in `04` §5.2 —
corner values in `[0, 1)`, bilinear weights summing to `1`. `gradient` guards a degenerate
grid explicitly. The obligation exists for what comes next.

### 6.3 The obligation is asserted, not enforced

A stray `1.0` could be clamped at step (b) of `04` §3.1 — one comparison per cell per
Operation, and every downstream proof holds unconditionally.

**Rejected.** The engine has one author and the bad Source is that author's. Clamping hides
the bug at the point it would otherwise be visible and leaves it to surface as a rendering
oddity weeks later. The cost of the alternative is a test, and the test is one the package
wants anyway:

- Development builds assert `0 ≤ t < 1` after every Source evaluation and throw on violation.
- The test suite evaluates every registered Source across a grid sample and the extremes of
  its admissible parameter space, asserting the same.
- Production builds do neither.
  This is the one place the single-engine assumption changes a decision rather than only its
  justification. Under an open registry the defensive clamp would be correct, because the bad
  Source would belong to someone unreachable.
  **Accepted, not a defect:** a Source violating **X6** in a production build produces
  undefined behaviour — a missing tile, or a rotation outside the authored set. Recorded in
  the manner of `02` §10.1 so it is not later filed as an engine bug.

### 6.4 Purity

A Source inherits `04` **O4**: `ctx` is closed at
`{rows, columns, effectiveSeed, operationId, salt}` and it receives nothing else. `02` §4.2's
prohibited-input list applies unchanged — no wall-clock time, no `Math.random()`, no ambient
state, no pixel measurement.

`effectiveSeed` is resolved before the Source runs (`02` §6.7), which is deliberate: a Source
handed the raw seed and expected to mix `loadSalt` itself would produce a flag that silently
does nothing whenever its author forgot — the same failure shape §6.1 rejects for the stochastic
declaration. A registered Source needs no awareness of `reseedOnLoad` at all.

**On floating point.** `02` §6.6's integer-only discipline governs **the hash**, not the
Source. A Source may use floating-point arithmetic: `gradient` computes a projection,
`valueNoise` interpolates, `vignette` takes a distance. IEEE 754 makes `+`, `−`, `×`, `÷`,
and `sqrt` exactly reproducible. It does **not** make `cos`, `sin`, `pow`, or `exp`
reproducible — see open question 3.

---

## 7. What a Selection declares

Beyond §5, nothing.

A Selection is `(x, y) -> boolean`, pure and positional by `04` **O2**, and it never reads
the accumulated `TileState`. It has no analogue of the stochastic flag: `reseedOnLoad`
attaches to the Operation and moves both channels together (`04` §8.2), so a `random`
Selection is rerolled by the Operation's flag regardless of what the Source is.

A Selection drawing from the hash uses the selection channel — `operationId + ":selection"` —
and **X3** applies to it identically.

**On composition.** `04` §4.5 holds `and`, `or`, and `not` as `[EXTENSION POINT]`, arriving
as ordinary registered types because the recursive shape `{ type, ...params }` already ships.
Their parameters are Selections rather than scalars, which the schema of §5.1 does not
currently express. Noted as the one known gap; it costs nothing until composition is built.

---

## 8. What a Blend declares

Beyond §5: the **Target types it accepts**, per the inverted **O7** (`04` §7.2).

```
accepts: ("numeric" | "tile")[]
```

`set` accepts both. `add` and `multiply` accept numeric only — `add` on a tile palette is
meaningless.

A Blend is a pure binary function of `(mappedValue, previousValue)`. Its result passes
through `03` **D6** (non-finite rejected) and then `03` **D5** (bounded immediately), and a
new Blend changes neither.

**X2** applies: adding one obliges the veto review of §4.2.

**No V1 Blend takes parameters, and `blend` serializes as a bare string** — `"add"`, not
`{ type: "add" }` (`06-config-schema.md` §7.2). `accepts` and the parameter schema of §5 live
here, in the registry, and are never authored into a config. A Blend that did take parameters
would need the tagged shape `selection` and `source` already use, which is a change to the fixed
key set and therefore a `schemaVersion` bump (`06` §4.3). Carried as an `[EXTENSION POINT]` in
`06` §12, not here, because the cost falls entirely on the file format.

---

## 9. Unknown and retired names

**Invariant X7** — _A config naming a type the engine does not have is a load failure. The
engine never substitutes a default, and never skips the Operation._

The tempting alternative is graceful degradation — an unknown Source falls back to
`constant`, or the Operation is dropped and the rest of the stack runs. It loses badly. A
fallback renders a **plausible-looking wrong picture with no error anywhere**, which is worse
than both a blank page and a stack trace. `03` §6.4 already distinguishes two ways of
rendering nothing precisely because silent absence is hard to diagnose; a silent
_substitution_ is harder still.

### 9.1 When this actually arises

With one engine there is no missing-plugin case. Two remain:

| Case                     | Cause                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Config newer than engine | Authored in an editor on a newer build, loaded by a site pinned to an older package version |
| Type retired or renamed  | The name existed when the config was written and no longer does                             |

The first is ordinary and the failure is correct: the config genuinely cannot be rendered.

### 9.2 A retired name is never reused

**Invariant X8** — _A type name, once published, is never reassigned to different semantics.
Retiring a name is a removal; the name is not recycled._

This is `01` §11.4's tombstone discipline applied to type names rather than section numbers,
and it fails the same way. A recycled name still parses, still resolves, still renders — and
produces a different picture from the same config, with nothing anywhere to indicate that
`valueNoise` in this build is not the `valueNoise` that config was written against.

Changing what an existing name _does_ is permitted (§10) and is a major version bump.
Reusing a retired name is not, because the version bump is invisible to a reader comparing
two configs.

---

## 10. Output stability

### 10.1 The two version numbers

Independent, and conflating them is a real hazard:

|                 | Increments when                                          | Owner          |
| --------------- | -------------------------------------------------------- | -------------- |
| Package version | the **generated output** changes for an unchanged config | this document  |
| `schemaVersion` | the config's **JSON shape** changes incompatibly         | `06` (`02` Q5) |

A config can be perfectly shape-valid — every field present, every type correct, loading
without a single warning — and render a different picture than it did last year.
`schemaVersion` cannot detect that. _"It loaded fine"_ is evidence of nothing.

### 10.2 Semantic versioning, read correctly

The package is published and consumers pin. A site that installed `1.4.2` in March renders
with `1.4.2` in September regardless of what has been published since; nothing changes under
it until someone deliberately upgrades.

That guarantee is only as good as the honesty of the bumps, and this is where a generator is
unusual. **A change to `valueNoise`'s interpolation is a breaking change.** No API moved, no
types changed, every existing config still loads — and every background made with it looks
different. The instinct to file that as a patch is the trap, because a consumer on `^1.4.0`
picks patches up automatically.

**Invariant X9** — _After `1.0.0`, any change to the output of `generate()` for an unchanged
`(config, seed, loadSalt)` triple is a major version bump._

| Change                                                             | Bump                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Adding a Selection, Source, or Blend                               | minor — no existing config references it                                  |
| Adding a parameter with a default that preserves current behaviour | minor                                                                     |
| Changing an existing type's output                                 | **major**                                                                 |
| Fixing a bug that changes output                                   | **major** — the trap; correctness is irrelevant to the consumer's picture |
| Renaming or retiring a type                                        | **major**                                                                 |
| Widening a parameter's admissible range                            | minor                                                                     |
| Narrowing one                                                      | **major** — an existing config may fall outside it                        |
| Editor-only change                                                 | patch or minor                                                            |
| Renderer-only change with identical drawn output                   | patch or minor                                                            |
| Renderer-only change altering the drawn picture                    | **major** — `07` **R14**                                                  |

**The last three rows replace one that was wrong.** It read _"editor-only or renderer-only change
with identical grid output → patch or minor"_, which §11.1 contradicts in the same document:
transform order is _"renderer-side, invisible to the grid, and equally breaking."_ Reversing
`03` **D11** leaves `generate()` byte-identical and changes every rotated, non-uniformly scaled
tile in every existing background. _Identical grid output_ was never the test; _identical drawn
output_ is. `07-render-contract.md` §11.1 records the correction and **R14** carries it.

### 10.3 Before `1.0.0`

Semver's `0.x` promises nothing, and V1 development happens there. Any `0.x` release may
change output freely; a config saved during this period may render differently after the next
release.

`1.0.0` is therefore a **decision**, not a milestone that arrives on its own: the moment the
freeze begins and §10.2 starts to bind. Declaring it before the V1 spec package is
implemented and exercised would freeze decisions that have not yet been tested against real
authoring.

---

## 11. Regression vectors

`02` §6.6 requires a table of `(seed, channel, x, y, salt) → expected uint32`, and §6.7 adds
rows for `mixLoad`. Both are justified by
conformance for a second implementation. Under §3.1 the same artifact does a different and
more immediately useful job: **it is a regression test.**

An unexpected diff in the table on a patch or minor release means output changed without
anyone intending it — caught before publish. An expected diff means a deliberate breaking
change, and the table is regenerated alongside a major bump.

`02` needs no amendment for this. The section is true as written; §11 adds a reading it did
not anticipate.

### 11.1 Hash vectors are not sufficient

They cover `02` §6.6 and nothing above it. These would all pass an unchanged hash table while
changing every rendered background:

- `valueNoise`'s smoothstep, bilinear weighting, or per-octave salt derivation
- `gradient`'s corner projection or its degenerate-grid guard
- the palette walk's comparison, or the order it accumulates in
- bounding applied at emit rather than per write (`03` **D5**)
- transform order (`03` **D11**) — renderer-side, invisible to the grid, and equally breaking
  **Invariant X10** — _The deliverable is two tables: hash vectors per `02` §6.6 and `mixLoad`
  per §6.7, and a set of reference configs each snapshotted against a
  `(config, seed, loadSalt)` triple._
  A reference config records the `loadSalt` it was snapshotted with. For a config carrying no
  `reseedOnLoad` flag the value is inert and any number does, but recording it keeps every row of
  the table the same shape and makes a flagged reference config possible — which at least one
  should be, since `02` §6.7's derivation is otherwise untested by this table.

Reference configs should between them exercise every registered type, both mapping kinds,
every Blend, both bounding behaviours, and at least one clipped-cell case (**G2**). A new
registered type arrives with a reference config; that is what §6.3's test obligation attaches
to.

The renderer-side items are not covered by either table. `07-render-contract.md` §11.3 supplies
the counterpart and **R15** carries it: geometry and transform reduce to exact vector tables in
the manner of `02` §6.6, requiring no browser and no image, and between them they catch every
renderer-side item listed above — transform order included. Compositing alone resists, and stays
`[POSTPONED]` there rather than here.

---

## 12. Invariants summary

| ID      | Invariant                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **X0**  | A change in generated output is a breaking change, whether or not any interface moved.                                                              |
| **X1**  | Selections, Sources, and Blends may be added. Attributes, Targets, hash channels, and mapping kinds may not.                                        |
| **X2**  | Adding a Blend obliges a review of every Target's veto list.                                                                                        |
| **X3**  | A Source derives additional randomness by varying `salt`, never by constructing a channel string. The channel set remains at three.                 |
| **X4**  | A registered type declares a unique name within its kind, a parameter schema, and an implementation. Registering into an occupied name is an error. |
| **X5**  | A Source declares whether it is stochastic.                                                                                                         |
| **X6**  | A Source returns a finite number in `[0, 1)` for every input its schema admits. `1.0` is not legal.                                                 |
| **X7**  | An unknown type name is a load failure. The engine never substitutes a default.                                                                     |
| **X8**  | A published type name is never reassigned to different semantics.                                                                                   |
| **X9**  | After `1.0.0`, any change to `generate()`'s output for an unchanged `(config, seed, loadSalt)` is a major version bump.                             |
| **X10** | The deliverable is two tables: hash vectors, and reference configs snapshotted against a `(config, seed, loadSalt)` triple.                         |

---

## 13. Extension points

| Point                                                                | Status                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selection composition — `and`, `or`, `not` as registered types       | `[EXTENSION POINT]` — recursive shape ships in V1 (`04` §4.5); needs a schema type for Selection-valued parameters (§7)                                                                                                                                                  |
| `min` / `max` Blends                                                 | `[EXTENSION POINT]` — enabled by the inverted **O7**; `rotation` must veto both (§4.2)                                                                                                                                                                                   |
| Additional noise Sources — `simplexNoise`, `worleyNoise`             | `[EXTENSION POINT]` — each pins itself to `02` §6.6 and to **X3**                                                                                                                                                                                                        |
| Exposed `lacunarity` / `persistence` on `valueNoise`                 | `[EXTENSION POINT]` — a parameter with a behaviour-preserving default is a minor bump (§10.2)                                                                                                                                                                            |
| An explicit region on spanning Sources — `gradient { angle, over? }` | `[EXTENSION POINT]` — **raised by `09` §14.2, owned jointly with `04` §10.** A parameter with a behaviour-preserving default, therefore a minor bump (§10.2); `06` §4.3 row 5 makes a registered type's parameter-schema change no `schemaVersion` bump. `roadmap` §4.1. |
| Renderer-side regression snapshots                                   | **Delivered** — `07` §11.3, **R15**. Compositing is the residue and is `[POSTPONED]` there.                                                                                                                                                                              |
| Public registration API for third parties                            | `[POSTPONED]` — §3 assumes one engine; reopening this reopens §6.3                                                                                                                                                                                                       |
| Open attribute registry                                              | `[EXTENSION POINT]` — the applier contract it was blocked on exists (`07` §10, **R13**). Still gated on `03` **D7** and a `schemaVersion` bump; no longer gated on `07`.                                                                                                 |
| A third mapping kind                                                 | `[POSTPONED]` — requires a third Target type, which requires a non-numeric attribute (§4.4)                                                                                                                                                                              |
| Automated detection that a change is output-affecting                | `[POSTPONED]` — §11 catches it in CI; inferring it from a diff is a research problem                                                                                                                                                                                     |

---

## 14. Open questions

| #   | Question                                                                    | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the config record the engine version that wrote it?                    | **Resolved — yes.** `06-config-schema.md` §4.4, **C3**. `engineVersion` sits on the outer `TilesetFile`, is **required**, and is **advisory only**: never compared against the running engine, never gates a load. Required despite never being read, because an optional advisory field is absent precisely on the old files that most need it.                                                                                                                                                                                                           |
| 2   | When is `1.0.0` declared?                                                   | **Open.** A project decision, not a spec one (§10.3). It cannot precede an implemented and exercised V1.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | Is `gradient`'s use of `cos`/`sin` reproducible?                            | **Open.** ECMAScript leaves the precision of transcendental functions implementation-defined, so `cos(37°)` may differ in its last bits between runtimes or engine versions. Consequences are confined to values landing exactly on a `steps` boundary or a palette threshold — rare, real, and silent. Resolving it means either specifying an integer approximation for the angle projection or accepting the exposure explicitly. Affects `04` §5.2 and `02` §6.6's reproducibility claim. `vignette` is unaffected: IEEE 754 specifies `sqrt` exactly. |
| 4   | Does the parameter schema live as data, or as code alongside `impl`?        | **Resolved — data.** `06-config-schema.md` §7.4 gives the encoding: a map of name → `ParamSpec`, with four spec types (`number`, `integer`, `enum`, `cellList`) covering §5.1's completeness table. Data rather than a validator function because three consumers read it and only one runs it — a function can be called but not walked, and §11 needs to enumerate the admissible space. It is **not** a wire format: it never appears in a config, lives beside `impl`, and is versioned with the package. Consumption remains `09`'s.                  |
| 5   | Is there a renderer-side counterpart to §11's reference configs?            | **Substantially resolved** — `07-render-contract.md` §11.3, **R15**. Two exact vector tables, geometry and transform, cover every renderer-side item §11.1 lists, transform order (**D11**) included. **Compositing remains open**: paint order, clipping, crop, and alpha have no artifact that is neither brittle across browsers nor a test of one implementation. `07` §13 carries it `[POSTPONED]` and `07` Q1 restates it.                                                                                                                           |
| 6   | Should a registered type carry a human-readable description for the editor? | **Deferred** → `09-editor.md`. Not load-bearing; the engine never reads it, in the manner of `Tile.name` (**D1**).                                                                                                                                                                                                                                                                                                                                                                                                                                         |
