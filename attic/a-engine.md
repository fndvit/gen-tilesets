# A — Engine

## 1. Header

**Session A — engine.** 2026-08-06.

Read in full:

- `spec/00-overview.md`
- `spec/02-generation-contract.md`
- `spec/03-domain-model.md`
- `spec/04-operations.md`
- `spec/05-extension-model.md`
- `adr/001-blend-declaration-inversion.md`
- `adr/002-load-salt-as-engine-argument.md`

Opened for two specific questions only, per `00-method.md`: `spec/01-glossary.md` §10.3 (tolerated
collisions) and §13 (the invariant census). Not read whole.

Not read: `01` (except the above), `06`, `07`, `08`, `09`, `roadmap.md`.

**Header verification.** Every **Status** and **Amended** line in the seven documents above was
checked against what the other in-scope documents cite from it. All are consistent; no document in
scope is a stale copy. Three stale _claims about_ documents were found and are recorded as A-22,
A-23 and A-24.

---

## 2. Comprehension

These documents establish the **generation side** of the package, and nothing else. `02` fixes the
boundary — a pure `generate(config, seed, loadSalt) -> Grid<TileState>` (`02` §4), a prohibited-input
list (`02` §4.2, **G1**), a coordinate space in which every cell exists whether or not it is later
clipped (`02` §5, **G2**), and randomness that is positionally addressed rather than drawn from a
stream (`02` §6). `03` fills in the nouns on that side: `Tile`, `TileAsset`, the four attributes with
their declared domains, defaults and bounding (`03` §5.4, **D4**), and the weight walk (`03` §4.3).
`04` supplies the verbs — Selection, Source, mapping, Blend, Target — and is where every V1 preset is
enumerated. `05` says how that list of types grows, what an entry declares, and what output stability
obliges of a release. The two ADRs record the only two reversals: the Blend declaration inversion
(ADR-001, `04` §7.2, **O7**) and `loadSalt` becoming an engine argument (ADR-002, `02` §6.7,
`04` **O8**).

**The boundary they sit on is the engine/renderer split**, stated three times over in three registers
(`00` §3.2): as a signature, as a prohibition, as a shape. Everything downstream of the emitted
`Grid<TileState>` — pixels, layout, scaling, asset resolution, transform mathematics — belongs to
`07`/`08` and is out of scope for this session. Two things sit _on_ the line and are visible from
here without being decidable from here: `03` **D11** (transform order) is an engine-side declaration
discharged by renderer-side vectors, and `03` §5.5 makes the attribute set shared vocabulary rather
than an engine extension point.

---

## 3. Under-determination

Twenty-seven entries. A-26 and A-27 are recovered from an earlier independent pass over the same
five documents and are marked as such.. `open` — the spec is silent and something must be chosen. `contradiction` — two
in-scope statements are incompatible; both quoted. `under-specified` — a constraint is stated but
does not determine a unique behaviour, which the spec may well intend.

### A-1 — The hash function is a family, not a function

**Cite:** `02` §6.6; narrowed by `05` §6.2; frozen by **X10** (`05` §11.1).
**Kind:** `under-specified` — **deliberate, and stated as such.** §6.6's own words: _"Portability
rules — these are the spec, more than the choice of function itself."_ `02` Q1 marks the question
**Resolved** with _"Exact function and test vectors to be fixed at implementation."_ This entry does
not treat that as a defect. It states what "fixed at implementation" actually costs.

**What is not settled.** §6.6 pins the _shape_ and the _discipline_: two stages, integer-only,
`uint32` state with every step ending `>>> 0`, `Math.imul` never `*`, no floating point except one
final division, and `channelU32` derived by running Stage 1 over the channel string. It pins neither
function.

Stage 1 is _"a short avalanche hash over the string's char codes (xmur3 or FNV-1a class)."_ Unchosen:
which of the two classes; the initial accumulator or offset basis; every multiplier constant; every
shift distance; the number of rounds; how many words the state carries and which one is returned.

Stage 2 is _"Combine `(seedU32, channelU32, x, y, salt)` by folding each into an accumulator with a
multiply-xor-shift step, then apply a final avalanche (murmur3 finalizer class)."_ Unchosen: the
accumulator's initial value; **the order the five components are folded in** — which changes every
output; the multiply constant and shift distance of the fold step, and whether they vary per
component; the finalizer's exact constants (the murmur3 fmix family has more than one published
variant); and whether the fold is `acc = imul(acc ^ v, K)` or `acc ^= imul(v, K)` or another
arrangement of the same three operators.

_"Return the top bits divided by `2³²`"_ is the one place a second document narrows it: `05` §6.2
says the result's largest value is _"`4294967295 / 4294967296`"_, which can only be true if all
thirty-two bits are the numerator. Read together they fix the divisor and the numerator's width;
§6.6 alone does not.

**What must be chosen.** A first implementation must choose, and cannot avoid choosing: one Stage 1
function complete with constants; one fold order over the five components; one fold step complete
with constants; one finalizer complete with constants. The shape of the decision is _pick a named,
published function per stage and record which one, or invent one and record it in equal detail_ —
the spec constrains the class, not the member, and the class has more than one member with
identical portability properties. Nothing in `00`, `02`, `03`, `04` or `05` prefers one.

**What X10 freezes, at the moment the table is first generated.** The vector table of `02` §6.6
is a table of `(seed, channel, x, y, salt) → expected uint32`. It is generated by running the
implementation. From the moment it exists:

- Every constant, shift, fold order and finalizer variant above becomes **the specification**. `02`
  §6.6's prose stops determining behaviour and the table starts. `02` §6.6: _"Any future
  implementation in any language is conformant if and only if it reproduces them."_
- `05` §11 gives the table its second job: _"An unexpected diff in the table on a patch or minor
  release means output changed without anyone intending it — caught before publish. An expected diff
  means a deliberate breaking change, and the table is regenerated alongside a major bump."_
- Every Source that calls `hash()` inherits the freeze — `random` directly, `valueNoise` twelve times
  per cell (`04` §5.2, `05` §4.3) — as does the `random` Selection channel (`04` §4.3) and the asset
  channel (`03` §4.3). One table pins all of them at once.
- The reference configs of **X10** freeze a strictly larger surface at the same moment: `valueNoise`'s
  smoothstep and bilinear weighting, `gradient`'s projection, the palette walk, bounding order —
  everything `05` §11.1 lists as _"not sufficient"_ for the hash table alone.

**This is the one irreversible act in the session's scope.** Generating the table converts a
deliberately open family into one member, permanently, by the ordinary act of running the code once.
A-20 records the unsettled question of what governs regeneration before `1.0.0`.

### A-2 — `mixLoad` is a family, on the same terms

**Cite:** `02` §6.7; ADR-002 _Decision_; **X10** (`05` §11.1).
**Kind:** `under-specified` — **deliberate**, and explicitly _"in the manner of §6.6"_.

**What is not settled.** `02` §6.7: _"a single multiply-xor-shift round combining two `uint32` values
into one. `uint32` throughout, every step ending `>>> 0`, `Math.imul` never `_`, no floating point."*
Unchosen: the multiplier constant; the shift distance; the order of the three operators within the
round; and **which argument is which** — `mixLoad(seedU32, loadSalt)` names the parameters, but a
multiply-xor-shift round is not symmetric and the spec does not say which operand is multiplied.

`02` §6.7 additionally forbids one otherwise-natural choice: _"`mixLoad(s, 0)` is not required to
equal `s`"_ — not required, and therefore not forbidden either. A candidate function that happens to
be identity at `0` is admissible; nothing selects for or against it.

**What must be chosen.** One round, with constants, with an operand assignment. It ships _"its own
rows in the test vector table"_ (§6.7), so **X10** freezes it at the same moment and on the same
terms as A-1.

### A-3 — Stage 1 does not say what a "char code" is

**Cite:** `02` §6.6; contrast `03` §4.2.
**Kind:** `open`.

**What is not settled.** Stage 1 runs _"over the string's char codes."_ Whether that means UTF-16 code
units (`charCodeAt`) or Unicode code points (`codePointAt`) is not stated, and the two differ for any
seed string outside the BMP — an emoji seed being the obvious case, and `02` §6.6 explicitly invites
memorable author-chosen strings. The same question governs `channelU32`, since channel strings run
through Stage 1 too; there the inputs are `operationId`, `operationId + ":selection"` and `"asset"`,
and `06` **C10**'s charset (cited by `03` Q3 as `[A-Za-z0-9_-]+`) appears to keep them ASCII —
unverified, `06` not read.

This is worth an entry rather than an assumption because the package settles the _identical_ question
elsewhere and settles it explicitly: `03` §4.2 requires asset ids be compared _"as sequences of
**UTF-16 code units**"_ and names the failure of not doing so — _"the same class of portability
failure as `_`versus`Math.imul`in`02`§6.6, and would break **G1** just as thoroughly."*`02`
§6.6 does not carry the corresponding sentence.

**What must be chosen.** One enumeration of a JS string into integers, for both the seed and the
channel strings. Also unstated: whether the two use the same enumeration, though nothing suggests
they would differ.

### A-4 — `salt` arrives at Stage 2 possibly signed

**Cite:** `02` §6.4, `02` §6.6, `04` §3, `04` §5.1, `04` §5.2.
**Kind:** `open`.

**What is not settled.** `02` §6.4 and `04` §3 type `salt` as `uint32`, _"an integer in `[0, 2³²)`,"_
validated by `06` §5.2 (**C9**). But `04` §5.2 derives the per-octave salt as
`oSalt = salt XOR imul(o + 1, 0x9E3779B1)`, and `02` §6.4 states the consequence itself: _"`04`
§5.2's `XOR` coerces to `int32`."_ So the value reaching Stage 2's fifth component may be negative,
while §6.6 requires _"All intermediate state is `uint32`."_

The bits are the same either way — XOR and `Math.imul` are bit-identical over the two
interpretations — so this is not a behavioural gap in the hash. It is a gap in **the vector table's
input column**, which is a published artifact under **X10**: a row's `salt` entry printed as `int32`
and the same row printed as `uint32` are different tables describing the same function, and a second
implementation reading the table has to know which. It is also a gap in the type the internal
`hash()` signature declares.

**What must be chosen.** Whether a `>>> 0` normalization sits at the Stage 2 boundary, and which
representation the vector table's `salt` column prints. Note that `04` §5.1's `ctx` block types the
field `salt: number` — see A-25.

### A-5 — `vignette` is not pinned

**Cite:** `04` §5.2; against `04` §5.3, `05` **X6**, **X0**.
**Kind:** `open`. **Does not read as deliberate.**

**What is not settled.** `04` §5.2 pins `valueNoise` in nine lines of pseudocode down to the
smoothstep polynomial and the per-octave salt derivation, and `gradient` in six lines down to the
degenerate-grid guard. `vignette` gets one sentence: _"Normalized elliptical distance from the grid
centre: `0` at the centre, approaching `1` at the farthest corner. No parameters in V1."_

Unchosen: whether the ellipse's radii are `columns/2` and `rows/2` or something else; whether the
distance is computed from cell centres `(x + 0.5, y + 0.5)` as `gradient` does; what the
normalization divisor is; and — the load-bearing one — what makes the corner _approach_ `1` rather
than attain it. **X6** forbids `1.0` as a return value, and `05` §6.2 walks through exactly what a
`1.0` costs downstream (the palette walk selects nothing; the stepped mapping gains a
`steps + 1`-th outcome). `04` §5.2 proves the `[0, 1)` bound for `valueNoise` in prose and
`gradient` guards its degenerate case explicitly. `vignette` does neither.

This is the same objection `04` §5.3 raises against the name _Perlin_: _"'Perlin noise' names a
family. Implementations differ … two renderers written from a specification saying "Perlin" produce
different images from the same config. That is not a weakened **G1**; it is no **G1** at all."_
_Normalized elliptical distance_ names a family in the same way.

**What must be chosen.** A formula, at `valueNoise`'s level of detail, with its `[0, 1)` totality
argument stated in the manner `05` **X6** requires of every registered Source.

### A-6 — The weight walks do not pin summation order

**Cite:** `03` §4.3, `04` §6.3; `03` §4.2 for the principle.
**Kind:** `open`.

**What is not settled.** Both walks compute `total = sum of weights` and compare `t * total` against a
running cumulative. Weights are `number` (`03` §4.1: _"`weight >= 0`"_, not required to be integers).
Floating-point addition is not associative, so two implementations — or one implementation before and
after a refactor — summing in different orders can produce a `total` differing in the last bits, and
therefore a `target` on the far side of a threshold for some cell.

`03` §4.2 pins the _walk_ order for exactly this class of reason and pins it hard, naming the
portability failure. It pins the accumulation order of the walk; it does not say the `total` is
accumulated in that same order, and `04` §6.3's palette walk — authored order, **O6** — has the same
hole.

**What must be chosen.** Whether `total` is summed in the walk's own order (canonical for assets,
authored for palettes) or in some other, and whether that is stated or left to fall out of the
implementation. `05` §11.1 lists _"the palette walk's comparison, or the order it accumulates in"_
among the things a hash table cannot catch, which places the cost squarely on the reference configs
of **X10**.

### A-7 — `valueNoise`'s bilinear interpolation is named, not written

**Cite:** `04` §5.2.
**Kind:** `open`.

**What is not settled.** The pseudocode says `octaveValue = bilinear interpolation of the four corners
by (sx, sy)` — every other line of that block is exact. Bilinear interpolation admits several
arithmetic arrangements that are algebraically identical and not bit-identical in IEEE 754:
interpolate along `x` then `y` versus `y` then `x`; `a + s*(b - a)` versus `(1 - s)*a + s*b`. `05`
§6.4 confirms floating point is legal here — _"IEEE 754 makes `+`, `−`, `×`, `÷`, and `sqrt` exactly
reproducible"_ — which is true of each operation but not of the choice between two orderings of them.

`05` §11.1 names _"`valueNoise`'s smoothstep, bilinear weighting, or per-octave salt derivation"_ as
things the hash table will not catch. The smoothstep is written out; the salt derivation is written
out; the bilinear weighting is the one of the three that is not.

**What must be chosen.** One arrangement, written at the same level as the surrounding lines.

### A-8 — `wrap` is named but never defined

**Cite:** `03` §5.2, `03` §5.4; against `04` §4.2.
**Kind:** `open`.

**What is not settled.** `03` §5.2: _"Bounding behaviours are `clamp`, `wrap`, and `none`."_ `03`
§5.4 gives `rotation` the bounding _"`wrap` over `[0, 360)`"_. Neither says what `wrap` computes. It
matters immediately: `04` §6.1's own worked example maps `rotation` over `range: [−5, 5]`, so a
negative value reaches the bounding step on the first write. Under JavaScript's `%` the result is
`-5`, which is outside `[0, 360)` and therefore breaks **D5** — _"the accumulated value is in-domain
at every point in the stack."_ Under a true modulo it is `355`.

`04` §4.2 identifies precisely this operator hazard, for `checkerboard`, and states the rule: _"Any
future Selection testing a non-zero residue over a possibly-negative operand must use a true modulo,
not `%`."_ The rule is stated for Selections. `rotation`'s wrap has the same hazard and no
corresponding sentence.

Also unstated: whether `wrap` on a domain whose lower bound is non-zero is a shape the package needs
at all — `rotation` is the only wrapping attribute in V1 (`03` §5.4), so a definition could be
written narrowly or generally, and nothing chooses.

**What must be chosen.** The arithmetic of `wrap`, and whether it is defined for `[0, n)` or for a
general `[lo, hi)`.

### A-9 — Whether step (d) applies to the tile Target

**Cite:** `04` §3.1; `03` **D5**, **D6**.
**Kind:** `under-specified`.

**What is not settled.** `04` §3.1's table is total over Operations and its last row reads: _"**d** —
Reject if non-finite (`03` **D6**), then bound (`03` **D5**)."_ But **D6** is stated over attributes —
_"Every attribute value in an emitted `TileState` is a finite number"_ — and **D5** over an
attribute's declared bounding. `tileId` is a Target (`04` §7.2) and is not an attribute: it has no
domain in `03` §5.4's table, no default there, no bounding behaviour. A palette entry may legally be
`null` (`04` §6.3).

Read one way, step (d) is a no-op for the tile Target and the table is merely stated at a convenient
altitude. Read another, an implementation applies a finiteness test to a string-or-null and the code
carries a branch the spec never asked for. The tables do not distinguish the readings, and `03` §5.1's
three declarations (**D4**) exist only for attributes.

**What must be chosen.** Whether the evaluation loop's step (d) is guarded by the Target's type, and
whether that guard is spec text or an implementation detail.

### A-10 — `Grid<TileState>` has no stated shape

**Cite:** `02` §3, `02` §4, `02` §8; `00` §3.1.
**Kind:** `open`.

**What is not settled.** `generate()` returns `Grid<TileState>` (`02` §4) and `02` §8 constrains its
contents — _"plain serializable data. No DOM nodes, no canvas contexts, no asset references, no
functions"_ — and nothing else. Unchosen: whether it is an array of rows, an array of columns, a flat
array with a stride, or a keyed structure; whether indexing reads `[y][x]` or `[x][y]`; whether `rows`
and `columns` travel on the returned value or must be carried alongside.

_"Structurally identical"_ (`02` §4) is the purity claim about repeated calls, not a claim about which
structure. This is public surface — `07` and `08` consume it and `08` **S1** exports one component
against it — so the choice is not private to the engine.

`02` §3 also uses `Grid` for the engine's _input_ — _"The `rows × columns` integer matrix. Engine
input"_ — while `02` §4 returns `Grid<TileState>`. `01` §10.3 was opened for this and does **not**
list it among the tolerated collisions, which records the word doing two jobs without a note saying
it may.

**What must be chosen.** One container shape and one index order, and whether `01` §10.3 gains a row
for `Grid`.

### A-11 — How many engine entry points there are

**Cite:** `00` §4.5 against `02` §12; `00` §4.2.
**Kind:** `contradiction`. Both in scope, quoted verbatim.

> `00` §4.5, the census table: | Engine entry points | **1** | `02` §4 |

> `02` §12, the extension-points table: | `selection(config, operationId, seed, loadSalt) -> (x, y) -> boolean` | **Required by `09` §6.2, E8.** An added export that moves no output — a minor bump under `05` §10.2. Without it the editor reimplements every Selection test to draw one overlay, which is `07` **R1**'s failure one layer up. Total and unbounded in `(x, y)`, per `04` §4.2 |

`00` §4 states its own tiebreak — _"**The owning table is authoritative**… If a count here disagrees
with the table it cites, this document is wrong"_ — and the row cites `02` §4, which does specify one
function. But `02` §12 marks a second export **Required**, in bold, while filing it in a table whose
other rows are all `[EXTENSION POINT]` or `[POSTPONED]`. A third is in play from `00`'s own §4.2:
_"`validate()` is a separate function."_

**What is not settled.** Whether `selection()` is V1 engine surface or a deferral; whether `00` §4.5's
census row is stale, correctly scoped to `generate()` alone, or wrong; and what the count is meant to
count.

**What must be chosen.** Nothing by an implementer — this is a spec question about which of two
in-scope statements moves. Recorded, not resolved.

### A-12 — `04` routes `reseedOnLoad`'s renderer behaviour to two different documents

**Cite:** `04` §2 against `04` §8.3.
**Kind:** `contradiction`. Both in `04`, quoted verbatim.

> `04` §2, _Not in this document_: _"What a renderer *does* with `reseedOnLoad` → `07-render-contract.md`"_

> `04` §8.3: _"Whether the renderer exposes `loadSalt` as a prop or seals it inside the component is `08`'s call. The engine requires only that it be drawn once and held."_

ADR-002's _Consequences_ takes the second position and elaborates it — _"`08` inherits a decision, not
a problem… Recorded as a constraint on `08`, not settled here"_ — while `04` §8.3's own preceding
paragraph is headed _"A constraint on `07`, recorded here because it is easy to get wrong."_ So the
draw-once-and-hold rule goes to `07` and the exposure decision goes to `08`, and §2's single routing
row names only `07`.

**What is not settled.** Whether §2's row is under-specified or wrong. `00` §9 calls the _Not in this
document_ section _"load-bearing rather than courteous… how scope creep is caught"_, and `roadmap`
§4.4 (unread) is cited there as the case where a routing with no destination lost work.

### A-13 — `03` §5.5 speaks of conformant renderers; `00` and `07` withdrew that reading

**Cite:** `03` §5.5, `03` §6.3 against `00` §5.2, `00` §6.
**Kind:** `contradiction`. Quoted verbatim.

> `03` §5.5: _"It is **shared vocabulary between engine and renderer**, part of the surface `07-render-contract.md` obliges **every conformant renderer** to implement, and versioned with the schema."_

> `03` §6.3: _"the order must be pinned or **two conformant renderers** can disagree."_

> `00` §5.2, standing non-goals: _"**No conformance suite for third parties.** `07`'s title is read narrowly — what *this* renderer guarantees, and therefore what the editor and every consumer may rely on."_

> `00` §6: _"An earlier index described `07` as *what any renderer must guarantee*. `07` §3.1 objects to that wording in as many words and asks it to be read narrowly, because there are no third parties and therefore no conformance obligation."_

`03`'s **Amended** header carries a line for `07` (_"§5.5, §6.4, §8, Q6 — see `07-render-contract.md`
§10, §4.4"_), so §5.5 was revisited after `07` landed and the phrase survived. `05` §3.1 states the
replacement reading — _"Portability becomes a claim about time, not about languages"_ — and `03` does
not carry it.

**What is not settled.** Whether `03` §5.5 and §6.3 are stale wording or a third position. Neither
sentence changes what the engine computes; both change what a reader concludes about who `07` binds.

### A-14 — **X10** is stated twice in `05`, differently

**Cite:** `05` §11.1 against `05` §12.
**Kind:** `contradiction`. Both in `05`, quoted verbatim.

> `05` §11.1: _"**Invariant X10** — *The deliverable is two tables: hash vectors per `02` §6.6 and `mixLoad` per §6.7, and a set of reference configs each snapshotted against a `(config, seed, loadSalt)` triple.*"_

> `05` §12, the invariants summary: _"| **X10** | The deliverable is two tables: hash vectors, and reference configs snapshotted against a `(config, seed, loadSalt)` triple. |"_

The summary row drops `mixLoad` and, in dropping it, re-binds _"two tables"_ to _hash vectors_ and
_reference configs_ — making the reference configs the second table rather than a third artifact. The
§11.1 form has two tables plus a set of configs. ADR-002 states the §11.1 reading: _"`05` **X10**
widens. A reference config is snapshotted against `(config, seed, loadSalt)`. The hash vector table of
`02` §6.6 is unaffected; `mixLoad` earns rows of its own."_

`01` §11.4's discipline is that an invariant amended in place keeps its identifier and only the text
moves — but here one identifier carries two texts in one document.

**What is not settled.** Which text is **X10**. The count of artifacts a `vectors:check` must cover
follows from it.

### A-15 — `04` and `05` disagree on what a new noise Source owes

**Cite:** `04` §5.3 against `05` §13; with `05` §11.1.
**Kind:** `contradiction`. Quoted verbatim.

> `04` §5.3: _"Additional noise Sources are exactly what `05-extension-model.md` exists for. Each must pin itself to the same standard: **derived from the `02` §6.6 hash, or shipping its own test vectors.**"_

> `05` §13, extension points: _"| Additional noise Sources — `simplexNoise`, `worleyNoise` | `[EXTENSION POINT]` — **each pins itself to `02` §6.6 and to X3** |"_

`04` states a disjunction: derive from the package hash **or** ship your own vectors. `05` states one
conjunct and adds a second obligation (**X3** — derive extra draws by varying `salt`, never by
constructing a channel string) that `04` §5.3 does not mention at that point. Under `04`'s reading a
Source with its own portable PRNG and its own vector table is admissible; under `05`'s it is not.

`04` §10's own row for the same extension point takes `05`'s side against `04` §5.3 — _"each must pin
itself to the `02` §6.6 standard (§5.3)"_ — citing the very section that offers the alternative.

**What is not settled.** Whether a registered Source may source its randomness from anything but the
`02` §6.6 hash. This is not academic for **X3**, whose whole argument (`05` §4.3) assumes the hash.

### A-16 — What `05` §6.3's test obligation actually obliges

**Cite:** `05` §6.3, `05` §11.1, `05` §3.1; with `04` Q1.
**Kind:** `under-specified`.

**What §6.3 concretely requires.** Three sentences, and they are the whole of it:

> - _"Development builds assert `0 ≤ t < 1` after every Source evaluation and throw on violation."_
> - _"The test suite evaluates every registered Source across a grid sample and the extremes of its admissible parameter space, asserting the same."_
> - _"Production builds do neither."_

Plus the framing from `05` §3.1 — _"The obligations in §6 are honoured by the author, checked by
tests, and asserted in development builds. They are not enforced at runtime on every cell. §6.3 is
the worked case"_ — and the accepted cost, in `02` §10.1's manner: _"a Source violating **X6** in a
production build produces undefined behaviour."_

**Three things are not settled by that text.**

_First, its scope._ §6.3 sits inside §6, _What a Source declares_, and every word of it is about
**X6**, which is a Source invariant. But `05` §11.1 attaches it to something wider:

> `05` §11.1: _"A new registered type arrives with a reference config; **that is what §6.3's test obligation attaches to.**"_

A _registered type_ is `selection | source | blend` (`05` §5). A Selection returns a boolean and a
Blend is a binary numeric function; neither has a `t` to assert `0 ≤ t < 1` over. So either §11.1
generalizes an obligation §6.3 never stated, or _the test obligation_ names something broader than
the three sentences above and §6.3 is not where it is written.

_Second, the reference config._ §11.1's sentence is a claim about §6.3. **§6.3 does not mention a
reference config, a vector table, or `05` §11 at all.** Its three sentences describe an assertion and
a sweep. Under `00` §10.2's rule — _"a claim that another document needs amending is a claim about
that document, verified by opening it"_ — this is the same shape one document down: a claim about a
section, made in another section, that the named section does not carry. Verified by opening §6.3
this session.

_Third, the routing._ `04` Q1 asks _"Does a registered Source declare its parameter schema, its
stochastic flag, and its `[0,1)` totality proof?"_ and answers **Resolved** → _"`05-extension-model.md`
§5.1, §6.1, §6.2. It declares all three (**X4**, **X5**, **X6**)."_ It routes to **§6.2**, the
invariant. Nothing in `04` routes to **§6.3**, the test. `04`'s only statement of a testing standard
is §5.3's, which is A-15's contradiction.

**Do `04` and `05` agree on it?** **No, on two counts, and `05` does not agree with itself on one.**
`04` §5.3 admits _"or shipping its own test vectors"_ where `05` §13 admits only the `02` §6.6
derivation (A-15). And `05` §11.1's _"a reference config"_ is an obligation `04` states nowhere, while
`05` §6.3 — the section §11.1 names — states no such thing either.

**What must be chosen.** Whether the obligation on a new registered type is (a) §6.3's dev-build
assertion plus parameter sweep, Sources only; (b) §11.1's reference config, all kinds; (c) both; and
which section carries the text. Not resolved here.

### A-17 — "a grid sample" and "the extremes of its admissible parameter space"

**Cite:** `05` §6.3, with `05` §5.1.
**Kind:** `open`.

**What is not settled.** §6.3's sweep is specified in seven words and neither is defined.

_A grid sample._ No dimensions, no cell count, no selection rule, no seed, no salt. `05` §5.1 gives
`ctx` two grid fields (`rows`, `columns`) that Sources normalize against, so the sample's shape is
not incidental: `gradient`'s degenerate guard fires only on a grid where `pmax == pmin`, and
`valueNoise`'s behaviour at `cellsPerFeature = 1` is a documented boundary (`04` §5.4).

_The extremes of its admissible parameter space._ For three of `05` §5.1's parameter kinds there are
no extremes to take:

- `angle` on `gradient` is _"number, unbounded"_ — there is no extreme.
- `cellsPerFeature` is _"number, exclusive `> 0`, finite"_ — the extreme is not attained, so a sweep
  must pick some value near it and nothing says how near.
- `cells` on `cellList` is _"list of coordinate pairs"_, and `05` §5.1 already flags it: _"Its
  parameter is unbounded in size… the reason `09` cannot generate every control mechanically."_
  A list type has no extremes in the sense the sentence uses.

**What must be chosen.** A concrete sample (dimensions, cells, seeds, salts) and a concrete reading of
_extremes_ for unbounded, exclusive-bounded, and list-typed parameters — or a narrowing of the
obligation to the parameters where the word means something.

### A-18 — `gradient`'s transcendentals

**Cite:** `04` §5.2, `04` Q9, `05` §6.4, `05` Q3; `00` §8.1, `00` §10.1.
**Kind:** `open` — **and openly so.** Every document in scope that touches it marks it open.

**What is not settled.** `04` §5.2 computes `dx, dy = cos(angle), sin(angle)`. `05` §6.4 states the
boundary precisely: _"IEEE 754 makes `+`, `−`, `×`, `÷`, and `sqrt` exactly reproducible. It does
**not** make `cos`, `sin`, `pow`, or `exp` reproducible."_ `05` Q3 scopes the damage — _"Consequences
are confined to values landing exactly on a `steps` boundary or a palette threshold — rare, real, and
silent"_ — and names the two exits: _"either specifying an integer approximation for the angle
projection or accepting the exposure explicitly."_

`00` §8.1 records the consequence for the invariant rather than the feature: it _"bears directly on
**G1**"_, and `00` §10.1 calls it _"**The only row here that outlives the package**, and the first
thing implementation forces"_, with **G1** _"overstated until it is settled"_.

**What must be chosen.** One of the two exits `05` Q3 names. It is forced by A-1: the hash vector
table does not contain `gradient`, but the **X10** reference configs do, and a reference config
snapshotting a `gradient` Operation freezes whatever `Math.cos` returned on the generating machine.

### A-19 — `ParamSchema` cannot express a Selection-valued parameter

**Cite:** `05` §7, `05` §5.1, `05` §13; `04` §4.5.
**Kind:** `under-specified` — **deliberate, and flagged in place.**

**What is not settled.** `05` §7 on composition: _"Their parameters are Selections rather than scalars,
which the schema of §5.1 does not currently express. Noted as the one known gap; it costs nothing
until composition is built."_ `05` §5.1's completeness table lists four types — _"number, integer,
enum, and coordinate list"_ — and states _"Nothing in V1 needs a nested or conditional schema, and none
should be introduced to serve one preset."_

Recorded because the _shape_ it constrains does ship in V1: `04` §4.5 ships the recursive
`Selection { type: string, ...params }` form deliberately, _"requiring no schema change"_ later. So V1
ships a shape whose schema language cannot describe one of its own admissible instances. Nothing in
V1 produces such an instance.

**What must be chosen.** Nothing, for V1. Recorded so that an implementer meeting the four-type
`ParamSpec` (`05` Q4 → `06` §7.4, unread) does not read the gap as an oversight and close it
speculatively — `05` §5.1 forbids exactly that.

### A-20 — What governs the vector tables before `1.0.0`

**Cite:** `05` §10.3, `05` §11, **X9**, **X10**.
**Kind:** `open`.

**What is not settled.** `05` §11 gives the tables their operational meaning in terms of release
kinds: _"An unexpected diff in the table on a patch or minor release means output changed without
anyone intending it — caught before publish. An expected diff means a deliberate breaking change, and
the table is regenerated alongside a major bump."_

But `05` §10.3 says the whole of V1 development happens where none of those kinds bind: _"Semver's
`0.x` promises nothing, and V1 development happens there. Any `0.x` release may change output freely."_
And **X9** binds _"After `1.0.0`"_ by its own text.

So during the entire period in which the engine is actually built, the rule that says when a table may
be regenerated refers to a version-bump vocabulary that does not yet apply. `05` §11's first job for
the table — regression detection — plainly is meant to apply from the first day it exists; its second
— the major-bump gate — cannot.

**What must be chosen.** What authorizes a regeneration during `0.x`, given that A-1 makes the first
generation an irreversible pinning and `05` §11's stated gate is unavailable. Not resolved here.

### A-21 — `03` §5.1 hands `04` two questions and `04` answers one by name

**Cite:** `03` §5.1, `04` §6.2.
**Kind:** `under-specified`.

**What is not settled.** `03` §5.1: _"Two questions it leaves open are `04`'s to answer — what supplies
the range for an **unbounded** domain, where no affine map exists; and whether the map is linear, which
is correct for `rotation` and `opacity` but biased for a multiplicative quantity like scale."_

`04` §6.2 answers the second explicitly and at length — _"Linear in both cases"_, followed by the
paragraph _On curves_ — and never names the first. It appears to be answered by construction: the
range is authored, `Mapping { range: [min, max] }`, so an unbounded domain needs no affine map because
the Operation supplies a finite window into it, which is §6.1's _"window within that capacity"_. But
`04` never says so, and `03` §5.1 is left holding an open question against a document that has been
amended four times since.

**What must be chosen.** Whether §6.1's window argument is the answer to §5.1's first question, and
whether either document says it is.

### A-22 — `00` §10.1's residue row is stale against `01` §13

**Cite:** `00` §10.1 against `01` §13 (opened this session for the census).
**Kind:** `contradiction`. Quoted verbatim.

> `00` §10.1, last row: _"Three one-line residues, **each verified by opening the document named, 2026-08-06**… **`01` §13** says **D3** *is owed* its rewrite; `03` carries it, rewritten in place, with a header line citing `01` Q7"_

> `01` §13, opened 2026-08-06: _"**Rewritten in place, not renumbered:** **G1** (ADR-002), **O4** and **O8** (ADR-002), **O7** (ADR-001), **R3** (`08` Q2 …), and **D3** (open question 7's weight-walk rename). Each keeps its identifier; only the text moved."_

`01` §13 does not say **D3** is owed its rewrite. It records the rewrite as landed, in the same list
as **G1**, **O4**, **O7** and **R3**. `03`'s header carries the matching line — _"§4.2, §4.3, **D3**
rewritten in place — see `01-glossary.md` §7.1, Q7"_ — so both documents agree and only `00`'s
description of `01` disagrees.

This is `00` §10.2's own pattern, and `00` §10.2 counts fourteen instances. This is a fifteenth, and
it is in the row that says _each verified by opening the document named_.

**What is not settled.** Whether `00` §10.1's row drops the `01` clause, and whether `00` §10.2's
count and `roadmap` §10 Q6 (unread) move as a result.

### A-23 — ADR-002 records a deletion the package forbids

**Cite:** ADR-002 _Documents revisited_ against `04` §10, `00` §8.5, `01` §11.4.
**Kind:** `contradiction`. Quoted verbatim.

> ADR-002: _"| `04-operations.md` | §5.1 and **O4** amended; §8 rewritten; §8.3's extension point withdrawn; **§10 row removed.** |"_

> `04` §10, as it stands: _"| ~~Renderer emits the derived config it used~~ | **Withdrawn** — dissolved by ADR-002. There is no derived config; `(seed, loadSalt)` reproduces any render (§8.3). Not carried to `roadmap.md`. |"_

The row was not removed; it was struck in place and annotated, which is what `00` §8.5 requires —
_"Nothing is deleted… a deleted thing is indistinguishable from a thing that never existed"_ — and
what `01` §11.4's tombstone discipline requires. `04` is right and the ADR's ledger is wrong about
what was done.

Recorded rather than smoothed because the ADR is the document a reader consults to find out what an
amendment did, and it describes the one operation the package prohibits.

### A-24 — `05`'s header undercounts its own §10.2 correction

**Cite:** `05` header block against `05` §10.2.
**Kind:** `contradiction`. Quoted verbatim.

> `05` header: _"**Amended:** **§10.2's last row corrected**, §11.1's tail, §13, Q5 — see `07-render-contract.md` §11"_

> `05` §10.2: _"**The last three rows replace one that was wrong.** It read *"editor-only or renderer-only change with identical grid output → patch or minor"*…"_

One row was replaced by three; the header says one row was corrected. Trivial in effect and recorded
because `00` §9's convention table makes the **Amended** line the mechanism by which a later pass
learns what moved, and a pass reading the header would look for one row.

### A-25 — `04` §5.1's `ctx` types `salt` as `number`

**Cite:** `04` §5.1 against `04` §3, `02` §6.4; ADR-002 _O4, amended_.
**Kind:** `contradiction`. Both in `04`, quoted verbatim.

> `04` §5.1, the `ctx` block: _"`salt: number`"_

> `04` §3, three sections earlier: _"`salt` was typed `number` in an earlier revision. It is a `uint32` — an integer in `[0, 2³²)` — and `06` §5.2 validates it… so `salt: 0` and `salt: 0.5` are the same input and the difference is invisible in the picture but visible in the file."_

`02` §6.4 carries the same correction — _"**Both are integers in `[0, 2³²)`, and this is validated**…
An earlier revision typed them as `number`"_ — and names `04` §5.2 as one of the consumers that
truncates. `04` §5.1 is the block a Source implementer copies, and it carries the superseded typing.
Neighbouring fields in the same block took the correction: `effectiveSeed: uint32`.

Note this is the _declared_ type of the field, distinct from A-4, which is about the _runtime sign_ of
the derived `oSalt`.

### A-26 — An Operation with `id: "asset"` occupies the asset channel

**Cite:** `04` §3, §4.3, **O3**; `02` §6.3, §6.6; `01` §10.2, §10.3.
**Kind:** `open`. _Recovered from an earlier independent pass over the same documents._

**What is not settled.** Channel strings and operation ids share one namespace, and `04` §3 says
so while reasoning about the colon:

> The excluded colon is §4.3's doing — that section builds the selection channel by concatenating
> `operationId + ":selection"`, which puts ids and channel strings in one namespace. An Operation
> with `id: "op7:selection"` occupies the same channel as Operation `op7`'s Selection, and nothing
> downstream of the concatenation can tell them apart.

The rule derived from it excludes `:` from the id charset (`[A-Za-z0-9_-]+`, `06` **C10**, restated
in `04` §3). It does not exclude the third channel string. `"asset"` matches `[A-Za-z0-9_-]+`.

The three channels (`02` §6.3, `04` §4.3):

| Channel             | Key                                                              |
| ------------------- | ---------------------------------------------------------------- |
| Operation source    | `hash(effective(op), operationId, x, y, op.salt)`                |
| Operation selection | `hash(effective(op), operationId + ":selection", x, y, op.salt)` |
| Asset selection     | `hash(effective(assets), "asset", x, y, config.assetSalt)`       |

For an Operation with `id: "asset"`, rows one and three have identical channel strings and
therefore identical `channelU32`. The remaining key components — the effective seed and the salt —
are equal whenever `op.salt == config.assetSalt` and `op.reseedOnLoad == config.reseedAssetsOnLoad`,
which is the case for a config left at defaults on both (`04` §3: `salt: uint32 = 0`; `04` §8:
`reseedOnLoad: boolean = false`).

The consequence is the one `04` §4.3 exists to prevent, in a different pair: that Operation's
Source value and the cell's asset selection are the same number at every cell, so which variant of
a Tile appears is perfectly correlated with the number the Operation is mapping. `01` §10.3 records
the `random` Selection / `random` Source collision as tolerated and notes it is safe precisely
because they occupy different hash channels by design. `01` §10.2 does not reserve `asset`.

**What must be chosen.** Whether `"asset"` — and any future channel string — is excluded from the
operation-id charset, whether the channel strings are namespaced away from ids some other way, or
whether the collision is accepted and recorded in `01` §10.3 alongside the others. Nothing is
proposed here.

### A-27 — The vector table's key and value columns have no stated type

**Cite:** `02` §6.6, §6.7; `05` §11, §11.1, **X10**. Distinct from A-4 (the `salt` column's
representation) and A-14 (how many artifacts **X10** names).
**Kind:** `under-specified` — **does not read as deliberate.**
_Recovered from an earlier independent pass over the same documents._

**What is not settled.**

_The key column._ `02` §6.6 says the table is `(seed, channel, x, y, salt) → expected uint32`. The
first column is called `seed`, but the function everywhere else takes `effectiveSeed`, a `uint32`
(`02` §6, §6.7; `04` **O4**). If the column holds a **string**, each row exercises Stage 1 and
Stage 2 together and Stage 1 is frozen by the table. If it holds a **`uint32`**, the table freezes
Stage 2 alone and Stage 1 is frozen by nothing except the reference-config snapshots — which freeze
it indirectly, through output that cannot be inverted to recover it. The package does not say
which, and the two produce different tables with different coverage. The same question applies to
the `channel` column: a string exercises Stage 1, a `channelU32` does not.

_The value column._ The table records `expected uint32`, but `hash()` as used at every call site
returns `[0, 1)`. The pre-division `uint32` is an intermediate that no specified interface exposes.
Whether the engine exports it, exports a second entry point for it, or the table is generated from
a test-only path, is unstated.

**A consequence of A-1 worth stating here.** A row is `input → output`. It records that some
sequence of constants and shifts produced that output; it cannot be inverted to say which. So after
first generation, `02` §6.6 still names a family, the code names one member, and **nothing in the
package records which member was chosen or why.** A later reader comparing spec to code cannot
distinguish a deliberate constant from a typo, because both reproduce the table.

**What must be chosen.** The key and channel columns' types; whether the pre-division `uint32` is
exposed and how; and whether the chosen family member is recorded anywhere other than in the code
that implements it.

---

## 4. Invariant census

Prefixes owned by this session: **G** (`02`), **D** (`03`), **O** (`04`), **X** (`05`).

| Prefix | Found              | Count  | `01` §13 claims    | Agrees |
| ------ | ------------------ | ------ | ------------------ | ------ |
| **G**  | G1–G5 (`02` §11)   | 5      | **G1**–**G5**, 5   | ✅     |
| **D**  | D1–D11 (`03` §7)   | 11     | **D1**–**D11**, 11 | ✅     |
| **O**  | O1–O8 (`04` §9)    | 8      | **O1**–**O8**, 8   | ✅     |
| **X**  | X0–X10 (`05` §12)  | 11     | **X0**–**X10**, 11 | ✅     |
|        | **Total in scope** | **35** | 35                 | ✅     |

Each summary table was checked against the invariant's declaration in the body; every ID declared in
a body section appears in its document's summary and vice versa. **No discrepancy with `01` §13 for
the four prefixes this session owns.** One caveat, which is A-14 rather than a census error: **X10**
appears in `05` twice with materially different text, so the _count_ agrees while the _content_ is
not single-valued.

### Classification

**Assertions** — a test can be written for them.

| ID      | Note                                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1**  | Repeated triple → identical grid; and a differing triple → the engine consulted nothing else. **Overstated until A-18 settles** (`00` §10.1). |
| **G2**  | Directly testable: a clipped-region config, and a `gradient` whose midpoint is checked against the whole grid.                                |
| **G3**  | Reorder the stack, assert each Operation's own contribution is bit-identical.                                                                 |
| **G4**  | `tileId: null` emits no output, attributes retained.                                                                                          |
| **D1**  | Rename a Tile, assert zero cells move.                                                                                                        |
| **D2**  | Structural: a TileAsset's engine-visible fields are `id` and `weight`.                                                                        |
| **D3**  | Permute a Tile's asset array, assert identical output.                                                                                        |
| **D4**  | Table completeness: every attribute in `03` §5.4 has all three declarations.                                                                  |
| **D5**  | The `1 → clamp(1.5) = 1 → 0.5` worked example of `03` §5.2 is the test.                                                                       |
| **D6**  | A Blend forced to `NaN`/`±Infinity`; previous value stands; emitted values all finite.                                                        |
| **D8**  | Defaults applied at `02` §9 step 1, before any `tileId` exists.                                                                               |
| **D9**  | No Target named `assetId`; resolution is the only writer.                                                                                     |
| **D10** | Type-level and structural: one `tileId` slot.                                                                                                 |
| **D11** | Assertable, but **not by this session's units** — discharged renderer-side by `07` **R15** (`05` §11.1). Cross-layer, see §6.                 |
| **O1**  | Every Source value passes exactly one mapping; instrument the loop.                                                                           |
| **O2**  | Signature-level: a Selection receives `(x, y)` and its params, never accumulated state.                                                       |
| **O3**  | Assert the three channel keys, and that Selection and Source at one cell differ.                                                              |
| **O4**  | Exact key-set equality on `ctx`.                                                                                                              |
| **O5**  | Two Operations, same attribute, different mappings — `04` §6.1's table is the test.                                                           |
| **O6**  | Permute a palette, assert output changes; contrast **D3**.                                                                                    |
| **O7**  | The derived accepted-set table of `04` §7.2 / ADR-001, row by row.                                                                            |
| **O8**  | Flagged vs unflagged across two `loadSalt` values — `02` §6.7's worked example is the test.                                                   |
| **X4**  | Registering into an occupied name throws.                                                                                                     |
| **X5**  | Every registration carries the flag; it matches `04` §5.2's column.                                                                           |
| **X6**  | `05` §6.3's sweep — but see A-16 and A-17 for what the sweep is.                                                                              |
| **X7**  | An unknown type name is a load failure; nothing substitutes, nothing is skipped.                                                              |
| **X10** | The tables exist and reproduce — `vectors:check`. Content is A-14.                                                                            |

**Postures** — they constrain how decisions get made, not what the code does. One line each.

| ID     | Why it is a posture                                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G5** | _"The engine never touches a graphical resource"_ is a claim about what may be written, not a value to assert; the nearest test — no import edge from engine code to any asset type — checks the boundary, not the invariant. |
| **D7** | Closure of the attribute set is a rule about future changes; a length assertion on `03` §5.4's table restates the count, it does not bind the next author.                                                                    |
| **X0** | A release-classification rule. Nothing in a running program can violate it.                                                                                                                                                   |
| **X1** | The extensible/closed table is a rule about what may be added; there is no registry for attributes, Targets, channels or mapping kinds to reject a registration _into_.                                                       |
| **X2** | _"Adding a Blend obliges a review of every Target's veto list"_ — an obligation on a person. `05` §4.2 says so: _"Forgetting the review does not error. It ships a control that produces nonsense."_                          |
| **X3** | _"never by constructing a channel string"_ binds a future Source's author. A test can assert the channel set is three today; it cannot assert the next Source obeyed the rule.                                                |
| **X8** | A naming discipline across releases. Violating it requires two builds and a reader comparing them.                                                                                                                            |
| **X9** | A versioning rule, enforced by `05` §11's tables in CI and by nothing in the engine.                                                                                                                                          |

**Count: 27 assertions, 8 postures, 35 total.** **D11** is an assertion this session's units cannot
discharge. **X6**'s testability is contingent on A-16/A-17. Session D's `test/untestable.md` takes the
eight postures with the reasons above.

---

## 5. Candidate units of work

Units these five documents imply. **Not ordered** — ordering is session D's (`00-method.md` §93).
Every unit is pure and browser-free unless its row says otherwise; the engine knows nothing of pixels
(`02` §4.2, **G1**) and lives in `packages/tileset`.

**U-A1 — Hash core.** `02` §6.6 (Stage 1, Stage 2), `02` §6.7 (`mixLoad`, effective seed), `04` §4.3
(channel strings). Discharges: none directly — it is the substrate **G1**, **O3** and **X10** are
asserted over. _Stated reason for zero:_ the invariants it enables are asserted by the units that
consume it; its own acceptance criterion is U-A2's table. Blocked on: **A-1, A-2, A-3, A-4** — the
irreversible choices. Pure, browser-free.

**U-A2 — Vector tables and `vectors:check`.** `02` §6.6, `02` §6.7, `05` §11, **X10**. Discharges
**X10** (partially — the reference-config half is U-A14). Blocked on: U-A1, and on A-14's reading of
what **X10** names. Pure, browser-free. _This unit performs the irreversible act of A-1._

**U-A3 — Attribute table, bounding, non-finite rejection.** `03` §5.1–§5.4, §5.6. Discharges **D4**,
**D5**, **D6**, **D8**, and **D7** as a posture. Blocked on: A-8 (`wrap`'s arithmetic). Pure.

**U-A4 — Tile, TileAsset, the weight walk.** `03` §3, §4.1–§4.3, `02` §10. Discharges **D1**, **D2**,
**D3**. Blocked on: U-A1 (the asset channel), A-6 (summation order). Pure.

**U-A5 — `TileState`, initialization, null semantics.** `02` §8, §8.1, `03` §6, §6.1, §6.4.
Discharges **G4**, **D9**, **D10**. Blocked on: U-A3, A-10 (the container's shape). Pure.

**U-A6 — The registry.** `05` §5, §5.1, §6.1, §7, §8. Discharges **X1** (posture), **X4**, **X5**,
**X7**, **X8** (posture). Blocked on: the `ParamSpec` encoding, which is `06` §7.4 — **not read**, see
§7. Pure.

**U-A7 — Selection presets.** `04` §4.2, §4.3, §4.4, §4.5's recursive shape. Discharges **O2**,
**O3** (the selection channel half). Blocked on: U-A1, U-A6. Note `04` §4.2's `%`-versus-modulo
analysis is unit-test material as written. Pure.

**U-A8 — Source presets.** `04` §5.2 (`constant`, `random`, `valueNoise`, `gradient`, `vignette`),
§5.3, §5.4, `05` §6.2, §6.4. Discharges **X6**, **O4**. Blocked on: U-A1, U-A6, and **A-5** (`vignette`
is not pinned), **A-7** (bilinear order), **A-18** (`gradient`'s transcendentals). Pure.

**U-A9 — Mapping.** `04` §6.1, §6.2 (numeric), §6.3, §6.4 (palette). Discharges **O1**, **O5**,
**O6**. Blocked on: U-A3 (domains), A-6 (palette total). Pure.

**U-A10 — Blend and Target tables.** `04` §7.1, §7.2, §7.3, ADR-001, `05` §8. Discharges **O7**, and
**X2** as a posture. Blocked on: U-A3. The accepted-set table is derived, not literal (ADR-001
_Consequences_). Pure.

**U-A11 — `generate()` and the evaluation loop.** `02` §4, §5, §9, `04` §3.1. Discharges **G1**,
**G2**, **G3**, **G5** (posture). Blocked on: U-A3 through U-A10, and A-9 (step (d) on the tile
Target), A-10. Pure.

**U-A12 — Effective seed wiring.** `02` §6.7, `04` §8, §8.1, §8.2, §8.4, ADR-002. Discharges **O8**,
and **G1**'s third argument. Blocked on: U-A1, U-A11. Pure.

**U-A13 — The `selection()` export.** `02` §12. Discharges **no invariant in this session's
prefixes.** _Stated reason:_ the invariant it exists for is **E8**, which lives in `09` and is out of
scope; `02` §12 marks it **Required by `09` §6.2, E8**. Its engine-side acceptance criterion is that
it is _"Total and unbounded in `(x, y)`, per `04` §4.2"_ and that it agrees cell-for-cell with U-A7 —
which is **R1**'s argument one layer up, per `02` §12. Blocked on: U-A7, U-A12, and **A-11**. Pure.

**U-A14 — Reference configs.** `05` §11.1, **X10**. Discharges **X10**'s second half; exercises
**G2** (_"at least one clipped-cell case"_), both mapping kinds, every Blend, both bounding
behaviours, every registered type, and at least one flagged config (_"since `02` §6.7's derivation is
otherwise untested by this table"_). Blocked on: U-A11, U-A12, A-14, A-20. Pure, browser-free.

**U-A15 — Dev-build totality assertion and the Source sweep.** `05` §6.3, §3.1. Discharges **X6**.
Blocked on: U-A8, and **A-16, A-17** — the obligation's scope and the sweep's definition. Pure.

---

## 6. Cross-layer suspicions

Explicitly unverified. Session D resolves each by opening both documents.

> `03` **D11** is declared engine-side but is discharged renderer-side. `05` §11.1 says _"transform
> order (`03` **D11**) — renderer-side, invisible to the grid, and equally breaking"_ and routes the
> test to `07` §11.3 / **R15**. **Not verified — `07` not read this session.** Consequence for this
> session: no unit in §5 can discharge **D11**, and session D should confirm `07` §11.3 actually
> carries it rather than assuming from `05`'s citation.

> `05` §11.1 and `05` §13 both claim `07` §11.3 and **R15** supply geometry and transform vector
> tables, and `05` Q5 marks the question _"Substantially resolved"_ on that basis. **Not verified —
> `07` not read this session.** This bears on A-1: if the renderer's tables are generated on the same
> pass as the engine's, four tables freeze at once, not two.

> `02` §12's `selection()` is _"Required by `09` §6.2, E8"_ while `00` §4.5's census says one engine
> entry point (A-11). Whether `09` §6.2 requires the exact signature `02` §12 states is
> **unverified — `09` not read this session.**

> `04` §2 routes _"What a renderer does with `reseedOnLoad`"_ to `07`, while `04` §8.3 and ADR-002
> route the `loadSalt` exposure decision to `08` (A-12). Which document actually carries it is
> **unverified — neither `07` nor `08` read this session.**

> `03` §5.5 says the attribute appliers are _"part of the surface `07` obliges every conformant
> renderer to implement"_ and cites `07` §10 and **R13** for the applier contract; `03` §8 says the
> open-attribute-registry gate _"no longer gated on `07`"_. Whether `07` §10 carries a per-attribute
> applier table in the shape `03` describes is **unverified — `07` not read this session.** See also
> A-13 on the _conformant renderer_ wording.

> `05` §5.1's `ParamSchema` is given a concrete encoding by `06` §7.4 per `05` Q4 (_"a map of name →
> `ParamSpec`, with four spec types (`number`, `integer`, `enum`, `cellList`)"_). U-A6 cannot be built
> without it. **Not verified — `06` not read this session.**

> `02` §6.4 and `04` §3 both defer `salt`'s and `id`'s validation to `06` §5.2 and **C10**
> (`[A-Za-z0-9_-]+`, unique in stack). A-3's question — whether channel strings are guaranteed ASCII
> — depends on **C10**'s charset actually covering `operationId`. **Not verified — `06` not read this
> session.**

> `02` §7.5's resize policy attaches to `09` §9.2/§9.3 and **E11**/**E12**, and `00` §10.1 records
> `07` §9.1's first row as still carrying the withdrawn drag premise. Nothing in this session's units
> depends on it, but session D should not take `02` §7.5's account of `09` as current without
> opening `09`. **Not verified.**

> `00` §10.1 makes `gradient`'s transcendental exposure (A-18) a `1.0.0` obligation and cites
> `roadmap` §7.1 A1 for the cost. **Not verified — `roadmap` not read this session.**

---

## 7. Needed but not read

What this session wanted from outside its scope, and where it lives.

| Wanted                                                                                                                                                                                         | From                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| The `ParamSpec` encoding — four spec types, bounds, defaults. U-A6 cannot be specified without it.                                                                                             | `06` §7.4 (via `05` Q4)           |
| `validate()`'s surface, and whether it counts as an engine entry point (A-11).                                                                                                                 | `06` §10 (via `00` §4.2, `03` Q1) |
| **C9**'s validation of `salt` / `assetSalt` as `uint32`, and **C10**'s identifier charset — bears on A-3 and A-4.                                                                              | `06` §5.2, §5.3                   |
| **C8** — how `mapping`'s two shapes are discriminated by `target` with no `kind` tag (`04` Q2).                                                                                                | `06` §7.3                         |
| The config's concrete key names and nesting: `00` §4.2 lists `rows`, `columns`, `tiles`, `operations`, `assetSalt`, `reseedAssetsOnLoad`, `defaultSeed` — no in-scope document gives the JSON. | `06` §3                           |
| **C5** — the exact scope of _"behaviour on an invalid config is undefined"_, which is what U-A11 is permitted to assume.                                                                       | `06` §10                          |
| `07` §10's applier table and **R13**, to confirm A-13 and the `03` §5.5 suspicion.                                                                                                             | `07` §10                          |
| `07` §11.3 and **R15**'s vector-table shape, to size the freeze A-1 describes.                                                                                                                 | `07` §11.3                        |
| Whether `loadSalt` is an `08` prop or sealed (ADR-002 leaves it to `08`); bears on A-12.                                                                                                       | `08` §4                           |
| `09` §6.2 / **E8**'s exact requirement on `selection()`; bears on A-11 and U-A13.                                                                                                              | `09` §6.2                         |
| `roadmap` §7.1 A1 — the recorded cost of A-18.                                                                                                                                                 | `roadmap` §7.1                    |
| `01` §7.1 and Q7, cited by three headers in scope as the source of the **D3** rewrite. Not opened; §13 was sufficient for A-22.                                                                | `01` §7.1, Q7                     |
