# Audit session B — file & render

## 1. Header

**Session:** B — file & render.

**Documents read, in full, in this session:**

| Document                                                             |
| -------------------------------------------------------------------- |
| `/Users/poldarder/.../generative-tileset-creator/audit/00-method.md`  |
| `/Users/poldarder/.../generative-tileset-creator/spec/00-overview.md` |
| `/Users/poldarder/.../generative-tileset-creator/spec/06-config-schema.md` |
| `/Users/poldarder/.../generative-tileset-creator/spec/07-render-contract.md` |
| `/Users/poldarder/.../generative-tileset-creator/spec/08-renderer-svelte.md` |

**Nothing else was opened.** `01`, `02`, `03`, `04`, `05`, `09`, `roadmap.md`, and `/adr` were not
read, including for a single lookup. `01` §13's invariant census is used below only as
`audit/00-method.md` quotes it, and that is stated where it is used.

**Date:** 2026-08-06.

### 1.1 Header check

Per the method's _Verify headers before auditing_ rule. Each document's header block was read
before its body, and checked against what the other documents in scope cite from it.

| Doc  | Status        | Amended lines                                                                                                          | Cited in scope by                                     | Agree?                                                             |
| ---- | ------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `00` | Draft, agreed | §3.1, §4.3, §4.4, §4.5, §6, §7, §9, §10, §10.1, §10.2, §12, Q5 — the `09` pass, 2026-08-06                             | `07` §3.1, `07`'s second Amended line                 | **No** — §6 and §10.1 misdescribe `07`. B-1, B-2, B-3             |
| `06` | Draft, agreed | §10.4 rewritten in place — see `07` §5.2                                                                                | `07` §2, §4.4, §9.4; `08` §2, §3.4, §4, §4.3, §8      | **Yes** — `07` §5.2 does produce §10.4's fourth row                |
| `07` | Draft, agreed | (1) §2, §3.1, §9, §11.1, §14 — see `08` §3.1, §3.2, **S1**, **S2**. (2) §3.1's title gloss, §9.1's first row — see `09` §9.2, §9.3, **E11**, **E12**, and `00` §6 | `08` §1, §2, §4.4, §5, §6.1, §6.2, §7, §11 Q2; `00` §6, §10.1 | **No** — **R3** and §4.3 changed with no Amended line. B-4 |
| `08` | Draft, agreed | none                                                                                                                    | `07` §14 Q2, Q3, Q4, Q7; `07` §2's routings           | **Yes** — every `07` routing lands, and `08` has not been amended  |

Two rows disagree, and they disagree in the same direction: a document's header or bookkeeping
describes a state that opening the document contradicts. The `00` row is stale about `07`; the `07`
row is silent about a change `08` §11 Q2 records as taken. **This is the shape `00` §10.2 counts,
found twice more in the course of this audit.** It is treated as a package finding (§3, B-1 to B-4),
not as a build decision, and it blocks no unit in §5.

The `00` row was reported in the session reply before the body of any document was audited, as the
method requires. `07` is treated as correct and `00` as stale throughout. Whether that is the right
way round cannot be settled from this session — it turns on `09`, which was not read (§6, §7).

---

## 2. Comprehension

These three documents are the file and the renderer.

`06` fixes **the file**: the concrete JSON, its key names, the `config`/`layout` split, `schemaVersion`,
strictness, and a `validate()` that produces a JSON Pointer and a stable code per error and nothing
else. `07` fixes **what happens to a `Grid<TileState>` after the engine returns it**: where a cell
goes, what a drawable is and how one is obtained, how attributes become a picture, what clips, what
paints over what, and what the caller is obliged to do. `08` fixes **the component**: who calls
`generate()`, what props exist, what a `Drawable` concretely is, what happens under SSR, and what
surface the editor calls into.

The boundary they sit on is `00` §3.2's engine/renderer split, seen from the renderer's side, and
each document states it in a different register. `06` **C1** makes it a property of the file's shape,
so a prohibited input cannot be passed. `07` **R5** makes the cell box a function of `Layout`,
`rows`, `columns`, and `Wpx` alone, so geometry never waits on an asset. `08` **S1** makes the
pairing unbreakable by having the component take a whole `TilesetFile` and call the engine itself.

They also sit on a second boundary, less obviously: **the line between what is fixed by an exact
table and what is fixed by prose.** `07` §11.3 draws it explicitly — geometry and transform reduce
to vector tables, compositing does not — and most of this session's substantive findings are on it.

---

## 3. Under-determination

Entries are prefixed `B-`. Each carries **Cite**, **Kind**, **What is not settled**, and **What
must be chosen** — the shape of the decision, not the decision. The three kinds are kept apart.

### Package bookkeeping — B-1 to B-4

These four are findings about the package's own record-keeping, not decisions the build waits on.
Nothing in §5 is blocked by any of them. They are kept here because `contradiction` is where a
document saying something false about another document belongs, and because `00` §10.2 is counting
instances of exactly this shape.

#### B-1 — `00` §10.1's claim about `07` §9.1 is false

- **Cite** — `00` §10.1, last row; `07` §9.1's table, first row.
- **Kind** — `contradiction`.
- **What is not settled.** `00` §10.1 says, of three residues _"each verified by opening the document
  named, 2026-08-06"_:

  > **`07` §9.1**'s first row still says the author _drags the design page width_, the premise `09`
  > §9.2 withdrew and **E11** / **E12** replaced

  `07` §9.1's first row says:

  > **Authoring resize** — the author sets the design width, a numeric field (`09` §9.3, **E12**)

  The residue is discharged. The row recording it as owed is not.

- **What must be chosen.** Whether `00` §10.1's row is struck as delivered, per `00` §8.5's
  tombstone discipline, or whether `07` moved after `00`'s pass — which would make the recorded
  verification date wrong rather than the row. Session D can settle it by opening `09`; session B
  cannot.

#### B-2 — `00` §6 and §10.1 misdescribe `07`'s header block

- **Cite** — `00` §6, closing paragraph, and §10.1, last row; `07`'s header block.
- **Kind** — `contradiction`.
- **What is not settled.** `00` §6 says:

  > What is left is smaller and is §10.1's: `07`'s header block carries **Amended** lines for
  > `/adr` and `08` only, so nothing in it records that §3.1 changed.

  `07`'s header carries two **Amended** lines, the second of which is:

  > **Amended:** §3.1's title gloss, §9.1's first row — see `09-editor.md` §9.2, §9.3, **E11**,
  > **E12**, and `00` §6

  It records exactly the change `00` says is unrecorded, and cites `00` §6 while doing so. `07`'s
  header names no `/adr` amendment at all — `/adr/002` appears under **Depends on**.

- **What must be chosen.** Whether `00` §6 and §10.1 are struck. Same root cause as B-1, same owner.

#### B-3 — `00` contradicts itself between §4.3 and §10.1

- **Cite** — `00` §4.3, final bullet; `00` §10.1, last row.
- **Kind** — `contradiction`.
- **What is not settled.** §4.3 says:

  > It is a numeric field, not a drag — `09` §9.2 withdrew that premise and **E11** replaced it.

  §10.1 says the drag premise _"still"_ stands in `07`. One document, one pass, both directions.
  Recorded separately from B-1 because it is checkable without leaving `00`, which makes it the
  cheaper detection site — and because it was not caught.

- **What must be chosen.** Nothing about the system. Session D decides whether B-1 to B-3 raise
  `00` §10.2's count of fourteen, and by how much. Note §10.2's own observation applies here: _"Four
  were produced by conversations that were **actively auditing for the pattern**."_

#### B-4 — `07`'s **R3** was amended with no Amended line

- **Cite** — `07` header; `07` §4.3 **R3** and §12's R3 row; `08` §11 Q2.
- **Kind** — `contradiction`.
- **What is not settled.** `08` §11 Q2 reads:

  > **Resolved — taken.** `07` **R3** now binds resolution failure and load failure alike and cites
  > **S6**. The general statement lives in `07`; the error channel and the substrate-placeholder
  > clause stay here.

  `07` **R3** does carry it: _"This binds a failure to resolve and a failure to load alike: a
  `Drawable` that names a resource rather than carrying one moves the failure later without changing
  what it is (`08` **S6**)."_ `07`'s first Amended line lists _"§2, §3.1, §9, §11.1, and §14 updated
  in place — see `08` §3.1, §3.2, **S1**, **S2**"_ — neither §4.3, nor **R3**, nor §12 appears, and
  **S6** is not among the cited drivers.

- **What must be chosen.** Whether `07`'s Amended line is extended, and — the general question —
  whether an invariant's text changing without a header record is the same class of defect as a
  section's. `00` §9's convention table says _"one **Amended** line per amendment"_ and `01` §13's
  rule that an amended invariant keeps its identifier does not say whether the header must note it.

### Build decisions — B-5 onward

Each of these is something implementation must resolve, or knowingly proceed past.

#### B-5 — `08` §6.3 derives placement independently of `cellBox`

- **Cite** — `08` §6.3; `08` **S10**; `07` **R1**, §5.2, §8.1.
- **Kind** — `contradiction`.
- **What is not settled.** **S10** says:

  > `cellBox` and `cellAt` are exported as pure functions of `(layout, rows, columns, Wpx, …)`,
  > independent of the component. **The component computes placement from them**, and `09` draws
  > every overlay from them. Neither reimplements the arithmetic.

  **R1** says:

  > There is one implementation of the coordinate mapping. The geometry an overlay is drawn with is
  > the geometry the renderer drew with, obtained from the same function and not recomputed.

  `08` §6.3 then gives placement as

  ```
  left  in sides  = (referenceWidth − columns * cellSize) / (2 * cellSize) + x
  top   in sides  = y − yOffset
  ```

  — an algebraically equivalent but separately written derivation, in a different unit space (cell
  sides, not render px), producing quantities `cellBox` does not return and from which `cellBox`
  cannot be read back. §6.3 opens by calling itself _"an illustration in the manner of `07` §3.1"_,
  which cuts one way; **S10**'s _"computes placement from them"_ cuts the other.

- **What must be chosen.** Whether §6.3 is illustrative only or is the draw path; and if the latter,
  whether **S10** obliges the component to call `cellBox` and convert to relative units, or obliges
  only that one algebra exist in one place. The two readings differ in what **R1** is testable
  against, which is why it is not a stylistic question.

#### B-6 — nothing binds the draw path to the tested transform function

- **Cite** — `07` §11.3's transform row and **R15**; `07` §6.2, §6.3's CSS note; `08` §6.3's CSS
  note; `08` **S10**.
- **Kind** — `open`.
- **What is not settled.** **S10** binds the renderer and every overlay to the exported `cellBox`
  and `cellAt`. There is no counterpart for the transform. **R15**'s transform table tests
  `(scaleX, scaleY, rotation, cellBox) → [a b c d e f]`, but `08` §6.3 composes the transform as a
  CSS list — `translate(...) rotate(...) scale(...)` — which never materializes a six-tuple. Both
  `07` §6.3 and `08` §6.3 warn that inverting the list produces _"a picture that looks deliberate"_,
  and the transform table cannot catch that inversion, because the table's subject and the draw
  path's subject are different artifacts.
- **What must be chosen.** Either an invariant in `08`'s **S** series binding the draw path's
  transform to the tested function — the shape **S10** already has for the mapping — or a stated
  acceptance that the transform table tests an exported function rather than the picture, with the
  gap named. This is the sharpest instance of the general shape recorded in §3's R15 subsection.

#### B-7 — **R15** says _exact_ and fixes no sampling, serialization, or tolerance

- **Cite** — `07` **R15**, §11.3; `07` §5.2, §5.4, §8.3.
- **Kind** — `under-specified`.
- **What is not settled.** **R15** requires _"two vector tables — geometry and transform — in the
  manner of `02` §6.6. Both are exact."_ §11.3 gives each table's input tuple and output. Nothing
  fixes how many rows, which `(Layout, rows, columns, Wpx, x, y)` tuples, whether §5.4's worked
  example — three `Wpx` values, one cell — is the table or an illustration of it, how a fractional
  result is written down, or whether comparison is bit-exact or to a stated precision. §5.2 produces
  fractional pixels at almost every width, and §8.3 explicitly accepts that a point on a shared edge
  _"may land on either side of it depending on the width"_. A table row sampling a boundary point
  therefore asserts something §8.3 says is indeterminate, and nothing says to avoid those points.
- **What must be chosen.** The sampling policy, the numeric encoding, the comparison rule, and
  whether boundary points are in or out. **This reads as genuinely under-determined rather than
  deliberate.** §11.3's deliberate postponement is the compositing row, which it names as such; the
  two tables it does claim are stated as settled, so the missing detail is absence rather than
  design. Contrast `02` §6.6, which the method file records as specifying the hash as a family on
  purpose — that document was not read (§6, §7).

#### B-8 — the two tables compose nowhere

- **Cite** — `07` §11.3's table; `07` §6.2's `e` and `f`.
- **Kind** — `under-specified`.
- **What is not settled.** The transform table takes `cellBox` as an _input_, not
  `(x, y, Layout, Wpx)`. The matrix's `e` and `f` are functions of the cell box's centre
  (`e = cx − (a·cx + c·cy)`). So a geometry error and a transform error are each caught in
  isolation, and their composition — the actual placed, rotated drawable — is asserted by neither
  table. Feeding a synthetic `cellBox` into the transform table means a wrong `cellBox` never
  surfaces there.
- **What must be chosen.** Whether a third table, or a composed column in one of the two, covers
  `(Layout, rows, columns, Wpx, x, y, scaleX, scaleY, rotation) → [a b c d e f]`; or whether the
  composition is accepted as covered by the two taken independently. §11.3 does not say.

#### B-9 — `07` §6.2's matrix uses `cos`/`sin` and no document names the exposure

- **Cite** — `07` §6.2; `00` §8.1's second exception; `00` §10.1's `gradient` row.
- **Kind** — `open`.
- **What is not settled.** `00` §8.1 records:

  > `gradient`'s use of `cos`/`sin` may not be bit-reproducible across runtimes, which bears directly
  > on **G1** and is a correctness obligation before `1.0.0` rather than a deferral

  and `00` §10.1 calls it _"the only row here that outlives the package"_. Both name the engine side
  only. `07` §6.2's `a = scaleX · cos θ`, `d = scaleY · cos θ`, `b`/`c` with `sin θ`, is the same
  transcendental in the same position — its output feeds an _exact_ table under **R15**, and any
  drift in it is an **R14** major bump that nothing detects. `07` says nothing about it anywhere.
- **What must be chosen.** Whether the renderer-side transcendental inherits the engine-side
  obligation, is exempt because drawn output is not hashed, or is sidestepped by pinning the
  transform table's θ to values whose sine and cosine are exactly representable. Cross-checks against
  `roadmap` §7.1 A1, not read (§6).

#### B-10 — **R15**'s artifact has no location, format, or regeneration procedure

- **Cite** — `07` **R15**, §11.3; `07` §13's postponed compositing row.
- **Kind** — `open`.
- **What is not settled.** **R15** says the tables are _"regression tests in the sense of `05` §11,
  and both are regenerated only alongside a major bump."_ Nothing in `07` or `08` says where they
  live, in what format, who may regenerate them, or what mechanically prevents regeneration outside
  a major bump. Both defining references — `02` §6.6 for the manner, `05` §11 for the sense — are
  outside this session (§6).
- **What must be chosen.** The artifact's home and encoding, and whether _"regenerated only
  alongside a major bump"_ is a posture or something a check enforces. Recorded as spec
  under-determination; repository convention is not spec and is not cited here as settling it.

#### B-11 — `opacity` appears in neither vector table nor in **R14**'s list

- **Cite** — `07` §11.3's table and **R15**; `07` §11.2's bullet list; `07` §6.2's opacity
  paragraph; `07` §10.1's applier table.
- **Kind** — `open`.
- **What is not settled.** `07` §10.1 gives `opacity` the `compositing` facet and no ordinal.
  §11.3's transform table takes `(scaleX, scaleY, rotation, cellBox)` — `opacity` is not an input,
  and a six-tuple is not where it would land. §11.3's compositing row is empty. And §11.2's list of
  _"changes that are major under **R14** and invisible to every table `05` owns"_ does not name
  opacity at all, though §6.2 pins three separate properties of it — it multiplies the drawable's own
  alpha, it is applied to the transformed result, and it is _"per-cell, and never inherited or
  accumulated across cells"_ — each of which is a picture change if broken.
- **What must be chosen.** Whether opacity is accepted as part of §11.3's open compositing row — its
  declared facet says compositing, which points that way — or whether §11.2's list is incomplete and
  owes three more entries. The readings differ in whether anything is owed now.

#### B-12 — **C6**'s summary text is broader than its declaration, and §9.2 carries no ID

- **Cite** — `06` §10.1 (C6 declared), `06` §11 (C6 restated), `06` §9.2.
- **Kind** — `under-specified`.
- **What is not settled.** §10.1 declares:

  > **Invariant C6** — _Validation produces errors only. A file validates completely or not at all;
  > there is no partial load and no severity axis._

  §11's summary reads:

  > **C6** | Validation produces errors only **and never coerces**. A file validates completely or
  > not at all.

  The no-coercion rule is §9.2's, stated in full prose with no invariant ID of its own, and it is
  load-bearing: §5.2's salt narrowing rests on it (_"Truncating `0.5` to `0` would be the coercion
  the whole section exists to catch"_) and so does §8's rejection of `yOffset: 1.4`.
- **What must be chosen.** Whether §11's text is the amendment — C6 covers both, and the count stays
  at ten — or whether the summary has drifted and §9.2 owes an eleventh **C** invariant. A test named
  `C6:` has to know which behaviour it discharges, so this is not cosmetic. Note that raising the
  count would put `06` at odds with `01` §13's census as the method file quotes it.

#### B-13 — `06` §9's strictness: what it costs

- **Cite** — `06` §9.1, §9.2, §4.2, §4.3, §12's last row, §13 Q4; `06` §6.1 and **C4**; `07` §4.4,
  §13, §14 Q5; `08` §4.3, §11 Q5.
- **Kind** — `open`.
- **What is not settled.** The decision itself is resolved: §9.1 and §13 Q4 reject unknown keys, at
  every depth, with `meta` the sole exception. What is not settled is the **trigger and owner for
  revisiting it**. §9.1: _"If that proves genuinely obstructive during implementation, the decision
  to revisit is this one and not `schemaVersion` — recorded in §13 rather than left to be
  rediscovered."_ §13 Q4: _"If that proves obstructive in implementation, this is the decision to
  reopen, not `schemaVersion`."_ §12's last row carries the relaxation as `[POSTPONED]` — _"the cost
  is recorded in §9.1 and revisited in open question 4."_ Three sites, each pointing at another,
  none defining _obstructive_ and none naming who judges it. This is the self-reference the audit
  brief names.
- **What must be chosen.** A criterion and an owner, or an explicit statement that there is neither.

  **The cost, recorded without a position on either side:**

  1. **Every added key anywhere in §5–§8 is a `schemaVersion` bump**, optional or not — §4.3's first
     row, and §9.1's own summary of it. Keys already anticipated within this session's scope:
     `curve` on a numeric mapping (§12, `04` §6.2), `blend` promoted to `{ type, ...params }` (§7.2,
     §12), Selection-valued parameters in `ParamSchema` (§7.4, §12), `layout` becoming `layouts`
     keyed by `minWidth` (§12), a pinned-`loadSalt` field (§3.4's _"Adding the field later is a new
     key and therefore a `schemaVersion` bump"_), and vertical bleed as a `Layout` field (`07` §13).
     **Six bumps are queued before implementation begins.**
  2. **Each bump obliges a migration-table row** that §4.3 predicts will mostly say nothing: _"Most
     bumps will carry a no-op migration, which is the correct cost: the migration table gains a row
     saying _nothing to do_."_ Against this, §12 carries _"`schemaVersion: 2` and a migration path"_
     as `[EXTENSION POINT]` — _"no migration exists because there is nothing yet to migrate from."_
     The ladder accretes rungs before the ladder is designed.
  3. **The number carries less information than a reader will assume.** §4.2 is emphatic — a file can
     be _"shape-perfect … and produce a different picture than it did last year"_ — so `schemaVersion`
     counts schema edits and says nothing about output, and §4.2 exists to keep saying so. The more
     bumps the rule generates, the more often that clarification is needed.
  4. **Strictness creates an incentive gradient toward the exempt namespace.** **C4** exempts `meta`;
     §4.3's rows 5 and 6 exempt registered type names and their parameter schemas. So the two cheapest
     ways to add renderer-facing data are the unvalidated block and a new registered type — and `07`
     §13 routes author-controlled cropping there on exactly that basis: _"costs no `schemaVersion`
     bump (**C4**, **R4**)."_ The bump cost pushes new data toward the one place where, by `07` §4.4,
     _"a typo is silent."_
  5. **The cost lands on published sites, not on the editor.** **C2** makes an unknown version a load
     failure and §4.1 refuses to read it optimistically, so every bump makes every pinned older build
     refuse every newer file. What the bump buys, per §4.3, is that the loader can say _"this file is
     newer than this build"_ rather than _"I do not recognize the key `curve`."_
  6. **The `meta` question cannot pay the cost down.** `07` §14 Q5 and `08` §11 Q5 both fence it off:
     _"Reopening `06` §9.1 is **not** the answer — that is `06` open question 4 and a different
     trade."_ So the loop is fenced but not closed, and the one live proposal for validating `meta`
     is required not to touch §9.1.

#### B-14 — **R2** binds a party the package cannot check

- **Cite** — `07` **R2**, §4.2; `08` §4.3, §11 Q1.
- **Kind** — `open`.
- **What is not settled.** **R2** requires that within a render session the same `AssetRef` resolves
  to the same `Drawable`. `08` §4.3 states plainly that this is _"a requirement the component cannot
  currently enforce — a provider returning a fresh drawable per call reintroduces `Math.random()`
  one layer out, and nothing here detects it."_ `08` Q1 holds memoization as the candidate fix,
  _"Leaning yes; recorded rather than decided"_, with its counter-argument stated: _"it silently
  repairs an impure provider instead of surfacing it, and a lazy provider's rejection would then be
  cached too."_
- **What must be chosen.** Memoize and make **R2** structural, or leave it an unenforceable
  obligation on the host and say so in the invariant's own text. It decides how **R2** is classified
  in §4 and what unit 8 in §5 can actually assert.

#### B-15 — no document says how the build knows it is development or production

- **Cite** — `07` §4.3's two-row table; `08` §11 Q3.
- **Kind** — `open`.
- **What is not settled.** `07` §4.3 splits behaviour on the distinction — development throws;
  production draws nothing and reports through the error channel. `08` Q3 records that _"no document
  says who decides"_, and rejects all three candidates in turn: a bundler flag _"ties the package to
  one toolchain"_, a prop _"makes it a host lie waiting to happen"_, always throwing _"loses `07`
  §4.3's deliberate production posture."_ Marked _"Resolve during implementation."_
- **What must be chosen.** The mechanism. It gates **R3**'s and **S6**'s testable behaviour, because
  the two builds have different observable outcomes for one input, and a test must know which it is
  asserting.

#### B-16 — **R13** is unreachable in V1 and still requires a test

- **Cite** — `07` **R13**, §10.2.
- **Kind** — `under-specified`.
- **What is not settled.** §10.2 says R13 _"is unreachable in V1, because `03` **D7** closes the set
  and `06` validates the target names (`06` §7). It exists so that the day the set opens, the failure
  mode `05` §4.1 identified is already prevented rather than newly introduced."_ An invariant that
  cannot be reached from a valid file can be exercised only by constructing a `TileState` the engine
  cannot emit — which **S3** and **C5** place in undefined-behaviour territory.
- **What must be chosen.** Whether R13 is discharged by a test against a hand-built state, by the
  existence of §10.1's dispatch table itself, or is listed in `test/untestable.md`. The intent reads
  as deliberate; the method does not.

#### B-17 — three formatting defects that damage normative text

- **Cite** — `06` §5.3 (**C10**'s statement); `07` §12's table; `07` §14's table.
- **Kind** — `under-specified`.
- **What is not settled.** `06` §5.3's **C10** renders with collapsed spacing and an unterminated
  emphasis marker, in the sentence that _is_ the invariant:
  ``_Identifiers match `[A-Za-z0-9_-]+`. `Tile.id`is unique within the library;`Operation.id`is
  unique within the stack;`TileAsset.id`is unique within its Tile.`Tile.name` is unconstrained.\__``
  `07` §12's header rule carries an extra column and its **R3** row a trailing cell separator. `07`
  §14 is split into three separate tables, so Q3 and Q4/Q5 render outside the question table. None
  changes meaning; each makes the normative statement harder to quote exactly, and citation depends
  on exact quotation.
- **What must be chosen.** Whether cosmetic repair to a normative sentence goes through the
  amendment route or is exempt from it. `01` §11.4's append-only rule may bear on this; `01` was not
  read (§6, §7).

### R15, stated in full

Not a numbered finding and not a B-entry: a closing subsection answering the first attention item
directly, placed last so that B-6 through B-11 can be cited from it.

#### What **R15** concretely requires as a deliverable

Two exact tables, per `07` §11.3 and **R15**:

| Layer         | Artifact, verbatim from §11.3                                               | What §11.3 says it catches                                                       |
| ------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Geometry**  | `(Layout, rows, columns, Wpx, x, y) → cellBox`, plus `(…, px, py) → cellAt` | The placement formula, `s`, bleed, centring, `yOffset`, the half-open round trip |
| **Transform** | `(scaleX, scaleY, rotation, cellBox) → [a b c d e f]`                       | **D11**'s order, the rotation sign, the centre, scale-1 tangency                 |
| **Compositing** | —                                                                          | Paint order, clipping, crop, opacity                                             |

Both are _"in the manner of `02` §6.6"_, both are _"regression tests in the sense of `05` §11"_, and
both are _"regenerated only alongside a major bump"_ — three defining references, none of them in
this session's scope (§6, §7). The compositing row is empty **by decision**, carried to `07` §13 as
`[POSTPONED]` and to `07` §14 Q1 as the open half of an otherwise-resolved question. §11.3 states
its reason: paint order is testable against a substrate with an observable order, _"but that is a
test of one implementation and not of the contract"_, and clipping, crop, and alpha _"resist
everything short of pixel comparison, which is the brittle artifact `05` Q5 already rejected."_

What **R15** does not fix about its own deliverable is B-7 (sampling, encoding, tolerance), B-8 (the
two tables compose nowhere), and B-10 (location, format, regeneration procedure).

#### What output changes pass both tables undetected

**Named by §11.3's own compositing row:**

- **Paint order — R10.** Reversing it leaves every cell box and every matrix byte-identical and
  changes every background where drawables overlap. §7.1 and §6.3 establish that overlap is the
  default case rather than an edge case: _"Rotation puts a square drawable outside its cell with no
  scaling at all."_ §7.4 names the exact failure — _"a refactor that reverses a loop changes every
  overlapping background with no version number moving."_
- **The clipping boundary — R9.** Clipping per cell, or failing to clip the render box, changes the
  horizontal bleed and row 0's top. Both tables are blind: `cellBox` still returns a negative
  `originX` and `originY`, and the matrix is unchanged.
- **Crop — R8.** `cover` → `contain`, stretch instead of crop, or a crop window moved off centre,
  changes every non-square asset. §6.4 marks crop-before-transform as _"the load-bearing half"_ and
  neither table observes it.

**Not named by §11.3, and falling between the two tables:**

- **Opacity**, in all three properties §6.2 pins — B-11. Absent from the transform table's input
  tuple, absent from §11.2's list of major-under-R14 changes, and inside the empty compositing row
  only by inference from its declared facet.
- **The render box's natural ratio and height** — `07` §5.3, `08` **S8**. `rows` is an input to the
  geometry table but the natural height is not among its outputs, so changing
  `naturalRatio = referenceWidth : (rows − yOffset) * cellSize` changes how many rows are visible and
  where the last row is cut, with both tables passing.
- **Asset resolution** — which `TileAsset` a cell resolves to. `07` §4.1 keys on the
  `(tileId, assetId)` pair and warns that keying on `assetId` alone would resolve _"one of them to
  the other's drawable, correctly and silently, for as long as the config lives."_ No asset appears
  in either table's input tuple. The selection itself is `03` §4.3's canonical ordering, not read
  (§6).
- **The substrate** — `08` §4.2 and §4.5: `object-fit`, `loading="lazy"`, `alt=""`, `aria-hidden`.
  **S5**'s decision that a `Drawable` is an `<img>` is invisible to both tables.
- **The CSS transform-list order** — B-6, and the most consequential of the set, because both `07`
  §6.3 and `08` §6.3 predict the mistake in advance and the table that exists to catch transform
  order cannot see it.

The pattern across the second list: **both tables test exported pure functions, and only the
coordinate mapping has an invariant (`08` **S10**) binding the draw path to the function that was
tested.** Everything the tables do not reach is either compositing — which §11.3 declines
knowingly — or the gap between a tested function and the picture, which no document names.

---

## 4. Invariant census

Prefixes owned by this session: **C** (`06`), **R** (`07`), **S** (`08`). Counted by opening each
document's body and its invariants-summary table, and reconciling the two.

| Prefix | Found in body | Found in summary table | Claimed by `01` §13 | Agrees? |
| ------ | ------------- | ---------------------- | ------------------- | ------- |
| **C**  | C1–C10 = 10   | `06` §11, 10 rows      | C1–10               | Yes     |
| **R**  | R1–R15 = 15   | `07` §12, 15 rows      | R1–15               | Yes     |
| **S**  | S1–S10 = 10   | `08` §9, 10 rows       | S1–10               | Yes     |

**35 in total, no discrepancy to report on count.** One caveat on method: `01` §13's claim is used
here as `audit/00-method.md` quotes it, because `01` was not opened (§7). One caveat on content:
**C6**'s body text and summary text differ — B-12 — so the count agrees while one row's meaning does
not.

### Classification

**Assertions** — a test can be written for them: **C2**, **C3**, **C4**, **C6**, **C7**, **C8**,
**C9**, **C10**, **R3**, **R5**, **R6**, **R7**, **R8**, **R9**, **R10**, **R11**, **R12**, **R13**,
**R15**, **S1**, **S4**, **S5**, **S6**, **S7**, **S8**, **S9**, **S10**.

**Postures** — they constrain how decisions get made, not what the code does. One line each:

| ID      | Why it is a posture                                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **C1**  | A property of the file's shape, not of a running function; the assertable residue is a type-level check that `generate(file)` is an error |
| **C5**  | _"Behaviour on an unvalidated config is undefined"_ cannot be asserted; the assertable residue is that `generate` never calls `validate` |
| **R1**  | _One implementation_ is a structural claim about imports, not an output; and B-5 leaves what counts as one implementation unsettled     |
| **R2**  | Binds any provider the host supplies, which the component cannot check (`08` §4.3) — B-14                                              |
| **R4**  | `meta` additive-only across releases; there is no published key set to diff a release against                                          |
| **R14** | A release-process rule about version numbers, discharged by no build artifact                                                          |
| **S2**  | Constrains the editor's preview; nothing in this session's scope can violate or verify it                                              |
| **S3**  | _"Undefined behaviour on a file `validate()` would reject"_, as **C5**; the assertable residue is that the component imports no validator |

Three assertions carry a qualification rather than a reclassification, and it is the same one:
**R8**, **R9**, and **R10** are assertions with **no artifact under R15** — §11.3's compositing row
is empty by decision. They are testable only against the DOM realization, which §11.3 itself calls
_"a test of one implementation and not of the contract."_ §5's unit 10 records what that leaves.

**R13** is an assertion whose subject is unreachable in V1 — B-16. **S7**'s
_"`Math.random()` does not appear in the component"_ is an assertion discharged by lint rather than
by a runtime test, which is noted because the test name will not look like the others.

---

## 5. Candidate units of work

Each unit: name; the sections it implements, cited; **the invariant IDs it discharges**, which is
the acceptance criterion; what must land before it, as far as this scope shows; whether it is pure
and browser-free. **Not ordered globally** — ordering is a whole-package question and belongs to
session D.

Every **C**, **R**, and **S** invariant appears against at least one unit below, or with a stated
reason for having none. The coverage check at the end is what makes that claim checkable.

1. **`validate()` and the error vocabulary** — `06` §5–§10, §10.2, §10.3. Discharges **C2**, **C4**,
   **C6** (subject to B-12), **C7**, **C8**, **C9**, **C10**, and **C3** negatively — the test is
   that no error code is ever raised against `engineVersion`'s content. Needs unit 2's types. Pure,
   browser-free.
2. **File and config types** — `06` §3, §3.1–§3.4. Discharges **C1** as a type-level assertion
   (`generate(file)` does not compile; no member of `TilesetConfig`, at any depth, is a `Layout`
   field) and **C5** structurally (`generate` does not import or call `validate`). Nothing in scope
   before it. Pure, browser-free.
3. **Coordinate mapping** — `07` §5.2, §5.3, §8.1, §8.2, §8.3; `08` §7, **S10**. Discharges **R5**,
   **R6**, **R11**, **S10**, and **R1** structurally. Needs unit 2's `Layout` type. Pure,
   browser-free. Blocked on B-5's reading of whether `08` §6.3 is this implementation or an
   illustration of it.
4. **Geometry vector table** — `07` §11.3 row 1, **R15** first half. Discharges half of **R15**.
   Needs unit 3. Pure, browser-free. Blocked on B-7 and B-10.
5. **Transform composition and applier dispatch** — `07` §6.1, §6.2, §10.1, §10.2. Discharges
   **R7** and **R13** (subject to B-16). Needs unit 3 for the cell box the matrix is taken against.
   Pure, browser-free.
6. **Transform vector table** — `07` §11.3 row 2, **R15** second half. Discharges the other half of
   **R15**. Needs unit 5. Pure, browser-free. Blocked on B-6, B-8, B-9.
7. **`<Tileset>` component** — `08` §3, §4, §4.1, §4.5, §6.1, §6.2. Discharges **S1**, **S3**,
   **S5**, **S8**, **S9**. Needs units 2, 3, 5. Not browser-free.
8. **Provider and error channel** — `07` §4.1–§4.5; `08` §4.2, §4.3, §4.4. Discharges **R2** (only
   as far as B-14 allows — the default provider can be asserted pure, a host's cannot), **R3**,
   **R4** as a posture with no artifact, and **S6**. Needs unit 7. Partly browser-free; **S6**'s
   load half needs a substrate.
9. **Caller policy and the render session** — `07` §9, §9.1–§9.4; `08` §4.1, §5, §5.1, §5.2.
   Discharges **R12**, **S4**, **S7**, and `07` §9.4's obligation that the caller passes
   `file.config` and never `file` — its sibling obligation, that the caller does not validate, is
   **S3**'s and belongs to unit 7. Needs unit 7. Not browser-free: **R12**'s assertion is that a
   `file.config` change within one mounted session regenerates with an unchanged `loadSalt`, which
   requires a session to exist. **S7**'s lint half is browser-free.
10. **The draw path — crop, clip, and paint order** — `07` §6.4, §7.1, §7.2, §7.4; `08` §4.2's
    substrate table, §6.2's clip and positioning context, §6.3's composition note. Discharges
    **R8**, **R9**, **R10**. Needs units 3, 5, 7. Not browser-free, and see the note below: this is
    the one unit whose invariants have no artifact under **R15**.

**On unit 10's acceptance criterion.** The unit exists; what it cannot supply is a clean acceptance
criterion, and that is a fact about `07` rather than about the unit:

- **R8** (crop) — `08` §4.2 obtains it from `object-fit: cover`, one of three `07` invariants listed
  there as becoming _"free rather than implemented"_. The available test is that the declaration is
  present and that no measurement occurs. §6.4's load-bearing half — crop **before** transform — is
  what the substrate makes structural, since `object-fit` applies to the element the transform is
  then applied to.
- **R9** (clipping) — `08` §6.2's **S9** puts the clip on the render box element the component owns:
  _"The element also establishes the positioning context for cells and carries the clip **R9**
  requires."_ The available assertion is that the element carries the clip and no cell does. That it
  produces the correct picture is not assertable here.
- **R10** (paint order) — `07` §7.4 says row-major _"is what document order gives a naive DOM
  implementation, so the correct behaviour is the free one and any deviation costs effort."_ So the
  assertion is DOM sequence — and §11.3 anticipates it and declines it in the same breath: _"that is
  a test of one implementation and not of the contract."_

Unit 10's tests exist and its invariants are named `R8:`, `R9:`, `R10:` in the ordinary way, but each
tests the DOM realization rather than the contract, by `07`'s own assessment. `07` §13 carries the
pixel-level compositing artifact as `[POSTPONED]` and `07` §14 Q1 keeps compositing open. This is a
real hole in **R15**'s coverage. Session D decides whether the three are listed in
`test/untestable.md` as postures despite being assertions, tested at the substrate level with the
limitation recorded, or left until §13's postponed artifact arrives — but _absent and untestable
must never be indistinguishable_, so it cannot be left silent.

**On `07` §9.1's authoring-resize row.** It is **not** a session-B unit. The row describes an editor
action and its consequences — _"`referenceWidth`, `cellSize`, or `horizontalAlignment`, and
`columns` is re-derived"_, _"A destructive config edit; confirm where a coordinate-bound Selection
exists"_ — and cites `09` §9.3 and **E12** for both halves. The derivation that re-derives `columns`
is `02` §7.1's, which `07` §5.2 relies on for `originX ≤ 0` without owning. Session B owns only the
row beneath it — a viewport resize changes `Wpx`, hence `s`, and nothing regenerates — which is unit
9's, tested through **R12** and `08` §5.2's _"not a viewport resize"_. Also session B's is §9.1's
neighbouring claim that _"a `layout`-only edit moves every cell box and leaves every `TileState`
alone"_, which units 3 and 9 discharge between them. The assignment of the authoring half to `09` and
`02` is carried to §6 as a suspicion, since neither was read.

**Coverage check.** C1 (2), C2 (1), C3 (1), C4 (1), C5 (2), C6 (1), C7 (1), C8 (1), C9 (1), C10 (1).
R1 (3), R2 (8, partial per B-14), R3 (8), R4 (8, posture), R5 (3), R6 (3), R7 (5), R8 (10), R9 (10),
R10 (10), R11 (3), R12 (9), R13 (5), R14 (**no unit** — a release-process posture, discharged by no
build artifact; belongs in `test/untestable.md`), R15 (4 and 6). S1 (7), S2 (**no unit in this
session** — it constrains the editor's preview and is discharged by `09`'s work; recorded so it is
not counted as missing), S3 (7), S4 (9), S5 (7), S6 (8), S7 (9), S8 (7), S9 (7), S10 (3).

Thirty-five accounted for: thirty-three against a unit, **R14** and **S2** with a stated reason for
having none.

---

## 6. Cross-layer suspicions

Anything that looks like it conflicts with, or depends on, a document outside this session's scope.
Explicitly unverified.

> `07` **R15** defines both vector tables as being _"in the manner of `02` §6.6"_. What that manner
> requires — row count, encoding, portability constraints, tolerance — may already be fixed there,
> in which case B-7 is smaller than it looks. **Not verified — `02` not read this session.**

> `07` **R15** also calls them _"regression tests in the sense of `05` §11"_, and `07` §11.1 asserts
> that `05` §10.2 _"requires the amendment, and carries it: three rows now stand where the original
> one did."_ That is a claim about another document's current state, of exactly the shape B-1 to B-4
> record. **Not verified — `05` not read this session.**

> `07` §6.2's `cos`/`sin` in the transform matrix may fall under `roadmap` §7.1 A1's transcendental
> row and `02` **G1**, which `00` §8.1 describes as engine-side only. **Not verified — `02` and
> `roadmap` not read this session.** B-9.

> Which `TileAsset` a cell resolves to is `03` §4.3's canonical ordering and **D3**'s determinism
> claim, and it is invisible to both of **R15**'s tables. Whether `03` supplies an artifact for it is
> unknown here. **Not verified — `03` not read this session.** Bears on §3's R15 subsection.

> `07` §10.1's applier table claims to be _"`03` **D11** … read in order"_, and §10.2 says **R13** is
> unreachable because _"`03` **D7** closes the set."_ **Not verified — `03` not read this session.**

> `00` §10.1 and `07` §9.1 both cite `09` §9.2, §9.3, **E11**, **E12**. B-1 to B-3 cannot be closed
> without them: which of `00` and `07` is stale turns on when `09` landed. **Not verified — `09` not
> read this session.**

> `07` §5.2's guarantee that `originX ≤ 0` rests entirely on `02` §7.1's upward parity correction,
> and `06` §10.4's fourth advisory diagnostic exists because a hand-edited file can violate it. §5's
> ownership call for the authoring-resize row rests on the same. **Not verified — `02` and `09` not
> read this session.**

> `06` §12's queued bumps cite `04` §6.2 for `curve` and `05` §7 for Selection-valued parameters;
> B-13's cost list counts them. **Not verified — `04` and `05` not read this session.**

> `06` §5.2's salt narrowing is justified by `04` §5.2's `oSalt = salt XOR imul(o + 1, 0x9E3779B1)`
> and by `02` §6.6's Stage 2 mixer being `uint32` throughout. **Not verified — `02` and `04` not read
> this session.**

> `08` §3.3's **S2** and `07` §3.1 both describe the editor's preview as the renderer plus overlays,
> and §5 assigns **S2** no unit on that basis. **Not verified — `09` not read this session.**

> `06` §11 lists ten **C** invariants and B-12 asks whether §9.2 owes an eleventh. Raising the count
> would put `06` at odds with `01` §13's census. **Not verified — `01` not read this session.**

---

## 7. Needed but not read

What this session wanted from outside its scope, and which document it wanted it from.

| Wanted                                                                                                   | From                    | For                                        |
| -------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| §6.6's vector-table pattern — row count, encoding, tolerance, portability. **The largest single gap for this session's first attention item**, since **R15** is defined by reference to it and by nothing else | `02`                    | B-7, B-10, and §3's R15 subsection         |
| §7.1's parity derivation, on which `07` §5.2's `originX ≤ 0` and §5's ownership call both rest           | `02`                    | §5, §6                                     |
| §11's sense of _regression test_, and whether §10.2's three amended rows landed as `07` §11.1 asserts    | `05`                    | B-10, B-4's general shape                  |
| §4.3's canonical asset ordering and **D3**'s determinism claim                                           | `03`                    | §3's R15 subsection, uncovered changes     |
| **D11** and §6.3, which `07` §10.1's applier table claims to restate in order                            | `03`                    | §4's classification of R7 and R13          |
| **D7**, which makes **R13** unreachable                                                                  | `03`                    | B-16                                       |
| §9.2, §9.3, **E11**, **E12** — to decide whether `00` or `07` is the stale one                           | `09`                    | B-1, B-2, B-3                              |
| §7.1 A1's transcendental row                                                                             | `roadmap`               | B-9                                        |
| §13's invariant census, read directly rather than through `audit/00-method.md`'s quotation of it         | `01`                    | §4, and B-12's count question              |
| §11.4's append-only rule, to decide whether cosmetic repair to a normative sentence needs an amendment   | `01`                    | B-17                                       |
| §6.2 (`curve`) and §7 (Selection-valued parameters), counted in B-13's queued bumps without being opened | `04`, `05`              | B-13                                       |
