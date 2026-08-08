# roadmap.md

> **Status:** Draft, agreed
> **Depends on:** `01`–`09`, and `/adr`. This document is a harvest, not an authorship.
> **Constrains:** nothing. It records what is not yet constrained.

---

## 1. Purpose

This document is the complement of `00-overview.md`. `00` states what V1 is; this states what
V1 is not, and what each excluded thing would cost to include.

Every entry here was raised by another document. Nothing is invented here, and nothing here
binds behaviour — an item becomes real by being written into the document that owns it, at
which point its row moves to §6 as delivered.

The reason the package needs this document at all is that its deferrals are scattered across
nine extension-point tables, and most items appear in three or four of them at once. Layer
compositing is raised by `03`, `07`, and `08`; the open attribute registry by `03`, `05`, and
`07`. Read in place, each looks like a separate deferral with a separate gate. Collected, they
are one item apiece with one gate apiece, and several of those gates have since been discharged
by work that did not know it was discharging them.

### 1.1 Passes

| Pass   | Source            | What it added                                                                                                                                  |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| First  | `02`–`08`, `/adr` | The document.                                                                                                                                  |
| Second | `09-editor.md`    | Seven rows, an eighth cost tier, a new §4.5 and §5.5, and four corrections to notes in §4 and §5 that were already stale when the pass opened. |

The second pass is recorded because of what it found rather than what it added. Four notes in
this document asserted that an amendment was owed to another document, and all four had already
landed — `04` §10's `curve` marker, `08` §10's layers marker, `03` §8's typed-attribute gate, and
`01` §14's cross-reference gate. Three of the four cite this document back.

**The pass then produced two more instances of its own.** It repeated a stale claim from
`_harvest.md` about missing **Amended** header lines without opening `02` and `04`, both of which
carry them; and it drafted an amendment to `01` §14 for a change `01` had already made, having
filed the row wrongly in the first place by trusting §3.1's paraphrase over `01` §11.2. Both were
caught by opening the document. §10 Q6 is the question that follows, and it is no longer only
about notes.

---

## 2. Not in this document

| Belongs elsewhere                                                    | Owner                                   |
| -------------------------------------------------------------------- | --------------------------------------- |
| Scope, non-goals, and the V1 boundary stated positively              | `00-overview.md`                        |
| Rationale for any decision that was actually made                    | the owning document                     |
| Terminology, including the vocabulary reserved for items listed here | `01-glossary.md` §10.2                  |
| Decisions that were reversed, or are likely to be re-proposed        | `/adr`                                  |
| Editor features, authoring UI, and every advisory diagnostic         | `09-editor.md`                          |
| **Schedule, priority, and sequencing**                               | nowhere — deliberately absent, see §3.3 |

---

## 3. How to read an entry

### 3.1 The two sections

`[EXTENSION POINT]` (§4) and `[POSTPONED]` (§5) mean exactly what `01` §11.2 says, and the
wording is worth quoting rather than paraphrasing. An extension point is _"enabled by a decision
already made; deliberately not built."_ A postponement is _"deliberately deferred beyond V1; no
design work done."_ Neither is about scheduling.

**The paraphrase this section used to carry is close enough to be dangerous.** It read _an
extension point is agreed and unbuilt; a postponement is not yet agreed_, and it cost this
document a misfiled row in the `09` pass: §4.5's cross-reference item had its gate discharged, the
paraphrase suggested that discharging a gate does not make an item _agreed_, and the row was filed
under §5. Under §11.2's actual wording the discharged gate **is** the decision that enables it, and
`01` §14 had already moved it. Recorded because the paraphrase was this document's own, applied to
a definition it does not own.

The sections are subdivided by area — engine and operations, config and file, renderer,
authoring — because a single table of thirty rows is not readable.

### 3.2 The columns

**Point** — the item, stated once. An item appears in exactly one row of this document, no
matter how many tables raised it.

**Cost** — what its arrival costs, in the vocabulary the package already fixed:

| Tier                 | Means                                                                                                                     | Fixed by                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| none                 | No version number changes. Additive inside `meta`, or entirely inside the asset provider.                                 | `06` **C4**, `07` **R4** |
| editor-only          | Real work, landing in the editor, where nothing pins a version. No number moves because there is no number to move.       | `09` §14.1               |
| package-internal     | Changes the registry, crosses no boundary, appears in no file.                                                            | `06` §7.4                |
| minor engine bump    | A new registered type, or a parameter with a behaviour-preserving default. Output for every existing config is unchanged. | `05` §10.2               |
| minor renderer bump  | A new draw path or a new export. Moves no picture already drawn.                                                          | `07` §11.2               |
| `schemaVersion` bump | Any new or changed key in a `TilesetFile`, because `06` §9.1 rejects unknown keys.                                        | `06` §4.3                |
| major engine bump    | `generate()`'s output changes for an unchanged `(config, seed, loadSalt)`.                                                | `05` **X9**              |
| major renderer bump  | Drawn output changes for unchanged inputs.                                                                                | `07` **R14**             |

**editor-only is not cheaper than none, and the two must not be conflated.** Both move no
version number, and that is the whole of their similarity. `none` says the arrival is invisible
to the package's versioning because it is additive inside a place with no schema. `editor-only`
says the arrival is invisible because the editor is unversioned — the work is real, potentially
large, and lands where no consumer can pin it. Reading either as _free_ is the error the tier
exists to prevent. `09` §14.1 coined it and is its first row; §5.5 holds three.

Where the design does not exist, the cost reads **unknown**, and that is itself information: an
item whose cost cannot be stated is not ready to be scheduled.

**Gated on** — what must land, or be reversed, before the item can. Reads _nothing_ where the
item is merely unbuilt.

**Raised by** — every document that carries it. Where two documents assigned it different
status markers, the entry records which was taken and why.

### 3.3 What this document deliberately does not say

There is no priority column, no ordering, and no "next". Nothing here is scheduled, and a
sequence invented now would be invention rather than harvest — the failure mode `01` §1.1 and
the authoring order in the process notes both exist to avoid. The cost and gate columns are
enough to plan from; the plan itself is not a specification.

---

## 4. Extension points

Agreed, unbuilt.

### 4.1 Engine and operations

| Point                                                                | Cost                 | Gated on                                                                                                                                                                      | Raised by                                        |
| -------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Selection composition — `and`, `or`, `not` as registered types       | minor engine bump    | §4.2's Selection-valued `ParamSpec`. See the note below on the word _schema_.                                                                                                 | `04` §10, §4.5; `05` §13, §7; `06` §12; `09` §14 |
| `selection(config, operationId, seed, loadSalt)` as an export        | minor engine bump    | nothing. An added export that moves no output, the same shape as `generateRegion`.                                                                                            | `02` §12; `09` §6.2, **E8**                      |
| `min` / `max` Blends                                                 | minor engine bump    | nothing. `rotation` must veto both (`05` §4.2). Enabled by the inverted **O7**; would make `03` §5.5's lossy clamp recoverable.                                               | `04` §10; `05` §13; ADR-001                      |
| Additional noise Sources — `simplexNoise`, `worleyNoise`             | minor engine bump    | nothing. Each pins itself to `02` §6.6 and **X3**, and declares totality per **X6**.                                                                                          | `04` §10; `05` §13                               |
| Exposed `lacunarity` / `persistence` on `valueNoise`                 | minor engine bump    | nothing. Pinned at `2` and `0.5` in V1; a behaviour-preserving default is minor by `05` §10.2.                                                                                | `04` §10; `05` §13                               |
| `vignette` shape parameters                                          | minor engine bump    | nothing. Elliptical only in V1; the same shape as the row above.                                                                                                              | `04` §10                                         |
| An explicit region on spanning Sources — `gradient { angle, over? }` | minor engine bump    | nothing. `06` §4.3 row 5 makes a registered type's parameter-schema change no `schemaVersion` bump. **O4** stays closed: the region is a config parameter, not a `ctx` field. | `04` §10; `09` §14, §14.2                        |
| `generateRegion(x0, y0, w, h)`                                       | minor engine bump    | nothing. Positional hashing already permits it (`02` §6.2); it is an added export, not a change of output.                                                                    | `02` §12; `01` §14                               |
| Parallel / worker generation                                         | none                 | nothing. Order independence (`02` §9) already permits it, and it changes no signature.                                                                                        | `02` §12                                         |
| Open attribute registry                                              | `schemaVersion` bump | reversing `03` **D7**. **No longer gated on `07`** — the applier contract it was blocked on now exists (`07` §10, **R13**).                                                   | `03` §8; `05` §13; `07` §13                      |

**On the word _schema_.** `04` §10 records that Selection composition needs _no schema change_,
while `05` §13 and `06` §12 record that it needs a schema type first. Both are correct and they
are speaking about different schemas. The **config** schema needs nothing: `{ type, ...params }`
is recursive from the outset, so an operand slot already holds the shape it would need to hold
(`04` §4.5). The **parameter** schema is the gap: `ParamSpec` has four forms — `number`,
`integer`, `enum`, `cellList` — and none of them expresses a Selection-valued parameter
(`06` §7.4). Recorded here because the two rows contradict each other on their face, and the
next reader will assume one of them is stale.

**Composition in the overlay is not a second item.** `09` §14 lists Selection composition as an
inherited extension point, on the grounds that `selection()` takes an `operationId` and returns
a predicate, so composition arrives with no change to the editor's surface. That is a property of
the row above, not a new row, and it is recorded there rather than given one — §3.2's rule about
an item appearing once. The useful content is that the editor imposes **no additional gate**: when
composition lands, the overlay follows for free.

**`05` §13 was missing the explicit-region row and now carries it.** `09` §14.2 names `04` and
`05` as joint owners; `04` §10 had it and `05` §13 did not. Amended 2026-08-06, verified by
opening `05`. Kept rather than deleted, per §6's discipline, and because §10 Q6 counts it: the
note went stale inside the conversation that wrote it.

### 4.2 Config and file

| Point                                                            | Cost                 | Gated on                                                                                                                        | Raised by                              |
| ---------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `schemaVersion: 2` and a migration path                          | `schemaVersion` bump | something to migrate from. The field ships in V1; no migration exists because no second shape does.                             | `06` §12, §2                           |
| Selection-valued parameters in `ParamSchema`                     | package-internal     | nothing. `ParamSchema` is not a wire format (`06` §7.4), so this costs no bump of any kind. Gates §4.1's Selection composition. | `05` §7; `06` §12, §7.4                |
| `curve` on a numeric mapping                                     | `schemaVersion` bump | nothing. An optional added key: a bump, not a break.                                                                            | `04` §10, §6.2; `06` §12               |
| Parameterized Blends — `blend` promoted to `{ type, ...params }` | `schemaVersion` bump | a Blend that actually needs a parameter. One bump and one migration (`06` §7.2).                                                | `06` §12, §7.2                         |
| `layout` becoming `layouts`, keyed by `minWidth`                 | `schemaVersion` bump | nothing. Changes which `Layout` parameterizes `07` §5, not the formula. The term _breakpoint_ is reserved for it.               | `02` §12; `06` §12; `07` §13; `01` §14 |
| Vertical bleed as a `Layout` field                               | `schemaVersion` bump | a reason. Achievable today through the render box's height (`07` §7.3), so the field buys authoring convenience only.           | `07` §13                               |

**Marker reconciled — `curve`.** `04` §10 held this `[POSTPONED]`; `06` §12 held it
`[EXTENSION POINT]`. `06` was taken: it is later, it is the document that owns the file format,
and it states the cost exactly. **The amendment has landed** — `04` §10 now reads
`[EXTENSION POINT]` and cites this section. It is recorded rather than deleted because the note
this replaces asserted the amendment was still owed, and was wrong; see §1.1 and §10 Q6.

### 4.3 Renderer

| Point                                                            | Cost                                                                    | Gated on                                                                                                                                                                            | Raised by                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Author-controlled cropping — a `meta` key carrying a source rect | none                                                                    | shipping with a default equal to the centre square. Without that default its arrival changes drawn output and breaks **R14** (`07` §6.4).                                           | `07` §13, §6.4                  |
| DPR-aware asset selection                                        | none inside the provider; minor renderer bump if `Drawable` gains a key | nothing. **R2** requires only that one session sees one answer; `07` §13 already places the selection inside the provider. `srcset` / `sources` reserved.                           | `07` §13; `08` §10              |
| Recolourable tiles — inlined SVG markup                          | minor renderer bump                                                     | a sanitisation story. A second `Drawable` shape and a second draw path; moves no picture already drawn, so **R14** is untouched. Loses image caching. `markup` / `inline` reserved. | `08` §10                        |
| A bare-grid drawing surface                                      | minor renderer bump                                                     | nothing. Splits `<Tileset>` into a caller and a surface; `07` §9's caller policy moves to the caller half and **S1** is restated, not removed.                                      | `08` §10, §3.1                  |
| Layer compositing — N grids stacked by the renderer              | `schemaVersion` bump                                                    | enforcing agreement on `rows`, `columns`, `cellSize`, and `referenceWidth`. The layer supplies the paint order **R10** leaves no room for within a grid.                            | `03` §8; `07` §13; `08` §10, §8 |
| Canvas or WebGL substrate                                        | major renderer bump                                                     | node count actually biting. Forecloses SSR (`08` §4.2). `02` **G5** and `07` §3.1 keep it live.                                                                                     | `08` §10                        |

**Marker reconciled — layers.** `03` §8 and `07` §13 hold this `[EXTENSION POINT]`; `08` §10 once
held it `[POSTPONED]` on the stated grounds that a `schemaVersion` bump is _"not `08`'s to
settle"_. That is a statement about ownership rather than about agreement, and this document is
where the ownership landed (`08` §8). Filed as an extension point. **The amendment has landed** —
`08` §10 now reads `[EXTENSION POINT]` and cites this section back. §10 Q2 recorded that in the
previous pass; this note did not, and went on asserting the old marker for a full pass afterwards.
Two statements about the same fact, in one document, disagreeing.

**The trap, recorded.** Unenforced stacking already works today: a host can absolutely position
two `<Tileset>` elements over each other with CSS, and it will look correct for exactly as long
as the two files happen to agree on `rows`, `columns`, `cellSize`, and `referenceWidth`. Nothing
detects the disagreement, and the failure is a slow misalignment rather than an error. The
feature's real content is the enforcement, not the stacking.

### 4.4 Authoring and tooling

| Point                                                                                 | Cost             | Gated on                                                                                                                                                   | Raised by                 |
| ------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Asset authoring — file formats, optimization, sprite sheets                           | unknown          | nothing here. The division of labour landed: `09` §11.1 and **E14** take bundling, and this row keeps the pipeline upstream of a file the editor can open. | `07` §2; `08` §2; `09` §2 |
| A public config-writing surface — docs, or checks, for third-party writers            | none             | nothing, for the documentation shape. See the note below on the shape that is not free.                                                                    | `09` §14, §3.1            |
| A registered type's `editor` block growing beyond `label` / `description` / `control` | package-internal | nothing. **E9**'s totality keeps every addition optional, and an unrecognized hint falls back to §7.1's mechanical mapping.                                | `09` §14, §7.2            |

**The routing now has a destination.** This row was `00` §9's named instance of _a routing with no
destination is how work disappears_: `07` §2 and `08` §2 both sent asset authoring here, and no
extension-point table in the package carried it. §10 Q1 proposed a split and `09` took it, **with
the line drawn at bundling** — import, attach, the tile library UI, and export of the folder are
`09` §11.1; optimization, source formats, and sprite sheets stay in this row. The cost reads
**unknown** and honestly so: nothing in the specified surface constrains it. The provider receives
`meta` verbatim and the V1 convention reads one key from it, `meta.src` (`07` §4.4, `08` §4.3);
everything upstream of that string is unspecified and deliberately so.

**The config-writing surface has two shapes and only one is free.** `09` §3.1 offers the choice:
promote §3's table of manufactured guarantees into published prose, or into checks. The prose
shape costs nothing — `validate()` and **C7** already ship, and `00` §5.2 needs no change. The
checks shape is not the same item. Four of the six guarantees are exactly `06` §10.4's advisory
diagnostics, which are **legal configs by construction**; making them reject would turn files that
validate today into files that do not. As advisories the checks cost nothing; as errors they are a
`schemaVersion` question and a different row. Recorded because the two shapes read as one feature
in `09` §14 and diverge sharply on cost.

### 4.5 Glossary and process

| Point                                              | Cost | Gated on                                         | Raised by |
| -------------------------------------------------- | ---- | ------------------------------------------------ | --------- |
| Cross-references from each term to its first _use_ | none | nothing. **The gate is discharged** — see below. | `01` §14  |

**Gate discharged, and the row moved here from §5.4.** `01` §14 held this `[POSTPONED]` on the
grounds that it was gated on the package being complete and _"valueless now"_. The package is
complete: `09` landed, and `01` has been re-harvested against it with §3.1 empty and no
`[UNHARVESTED]` marker remaining. **`01` §14 discharged the gate and promoted the row before this
pass opened**; this document filed it under §5 anyway, on the misreading of `01` §11.2 that §3.1
now records. `01` is right.

**`01` §14's citation was stale in the other direction and has been corrected.** Its row read
_"`roadmap` §5.4 carries the row"_, which was true when written and stopped being true when the
row moved here. Amended 2026-08-06 to cite §4.5, verified by opening `01`. Nothing is now
outstanding against `01`.

---

## 5. Postponed

Not yet agreed. Several of these are blocked on each other; the gates say which.

### 5.1 Engine and operations

| Point                                                                  | Cost                                     | Gated on                                                                                                                   | Raised by    |
| ---------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Expression language replacing Source presets                           | unknown                                  | nothing structural — viable because Sources are pure (`02` §12). Would subsume stateful Selections and, arguably, `curve`. | `02` §12     |
| Stateful Selections                                                    | unknown                                  | the expression language above. Conditionals belong there, not in the Selection presets (`04` §4.1).                        | `04` §10     |
| Multiple Sources per Operation                                         | `schemaVersion` bump                     | its own blend semantics. Until those exist the feature does not mean anything (`04` §3.2).                                 | `04` §10     |
| Typed (non-numeric) attributes                                         | `schemaVersion` bump                     | `03` **D7**. **Its originally stated gate is discharged** — see the note below.                                            | `03` §8      |
| A third mapping kind                                                   | `schemaVersion` bump                     | a third Target type, which is gated on the row above (`05` §4.4).                                                          | `05` §13     |
| Per-Tile attribute defaults                                            | `schemaVersion` bump                     | answering what _the defaults_ means when `tileId` changes mid-stack (`03` §5.6).                                           | `03` §8      |
| Multi-cell Tiles                                                       | major engine bump                        | reversing **D10**, and reconciling with the per-cell purity of `02` §9.                                                    | `03` §8      |
| Conditional or positional asset weights                                | major engine bump                        | nothing but the decision. Weights are constant per Tile in V1.                                                             | `03` §8      |
| Compilation phase — validation, constant folding, Selection precompute | none if output-preserving; **X9** if not | nothing. Also receives `02` §2's routing of caching and optimization generally.                                            | `02` §12, §2 |
| Automated detection that a change is output-affecting                  | unknown                                  | a research result. `05` §11 catches it in CI; inferring it from a diff is a different problem.                             | `05` §13     |
| Public registration API for third parties                              | unknown                                  | reopening `05` §3, and with it §6.3's asserted-not-enforced posture. Earns an ADR if ever taken.                           | `05` §13     |

**Gate discharged — typed attributes.** `03` §8 originally recorded this as _"requires Blends to
become partial and declare accepted types"_. ADR-001 inverted **O7** and did exactly that: Blends
are partial, and a Blend declares the Target types it accepts (`04` §7.2). What remains is `03`
**D7** and a `schemaVersion` bump — the same residue the open attribute registry carries. **`03`
§8 has been amended** and now states the discharge in place. The previous pass recorded the
amendment as owed; it had already landed, which is the third of the three §1.1 records.

### 5.2 Config and file

| Point                                                       | Cost | Gated on                                                                                                                   | Raised by     |
| ----------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| A machine-readable schema artifact generated from `06`      | none | a reason to accept two encodings of one rule set. `06` §10.3's codes and paths are the contract; a second encoding drifts. | `06` §12, Q12 |
| Relaxing `06` §9.1 so that added optional keys need no bump | none | a demonstration that the strictness is obstructive in practice. **Earns an ADR if reversed** (`06` Q4 points at itself).   | `06` §12, Q4  |

### 5.3 Renderer

| Point                                             | Cost                 | Gated on                                                                                                                                                                                             | Raised by                         |
| ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Pixel-level compositing regression artifact       | none                 | an artifact that is neither brittle across browsers nor a test of one implementation. Paint order, clipping, crop, and alpha all resist this. **It now has a second consumer** — see the note below. | `07` §13, Q1; `05` Q5; `09` §14.1 |
| Skipping work for provably invisible cells        | none                 | reconciling with `07` §4.3. A skipped resolution is an unreported failure, so the optimization silently changes the error channel's behaviour.                                                       | `07` §13; `03` §6.4               |
| Non-decorative output — accessible names on tiles | `schemaVersion` bump | a reason for a background to be content, and a place for the description to live — `AssetRef` or `meta`.                                                                                             | `08` §10, §4.5                    |

**A second consumer, and a narrower gate.** `09` §14.1 argues that image export from the editor
is cheap via SVG serialization, because **R15**'s geometry and transform vectors make the
serializer testable against the contract rather than a blind second implementation. Its residue is
exactly this row and nothing else. That does not discharge the gate — the artifact is still hard
for the reasons `05` Q5 gave — but it changes who wants it: the row was previously a renderer
concern alone, and is now also what stands between §5.5's image export and a picture the author
can trust. Whether the two are built together is this row's question, which `09` §14.1 says
explicitly and correctly.

### 5.4 Glossary and process

The cross-reference row that used to sit here is now §4.5, for the reason recorded there.

| Point                                                                 | Cost | Gated on                 | Raised by              |
| --------------------------------------------------------------------- | ---- | ------------------------ | ---------------------- |
| Generated navigation artifacts — `01` §12's index, `00` §6–§7's graph | none | nothing but the tooling. | `01` §14, Q5; `00` §12 |

**Four sites want derivation tooling; three of them are one item.** `01` §14 wants §12's index
generated from the body, `00` §12 wants §6 and §7's dependency graph generated from the header
blocks, and `01` Q5 and `00` §12 each note the kinship without either owning it. Those are one
row: a script that reads the package and emits navigation. **`06` Q12 is deliberately not folded
in**, and the reason is the gate rather than the shape. A generated index is a navigational aid
that encodes no contract and can be regenerated or discarded at no cost; `06`'s machine-readable
schema is a **second encoding of the validation rules**, and its gate is a reason to accept that
two encodings of one rule set will drift. Merging them would force one gate to swallow the other,
and §5.2's row is the one that would lose its reason for existing. Same tooling instinct, different
risk.

`01` §14 and `01` Q5 both lump all four — _"the same question in four places"_, and _"the first
document to build it settles it for all of them"_. That is true of the tooling and false of the
rows: building the index generator settles nothing about whether `06` should ship a second
encoding of its own validation rules, which is B6's question and nobody else's.

### 5.5 Authoring and tooling

`01` §11.4's append-only rule governs section numbers here as everywhere: this section takes the
next unused number rather than slotting in beside §5.1–§5.3's areas, and the ordering that results
is not a mistake to be tidied.

| Point                                                       | Cost                                            | Gated on                                                                                                                                                                                                                                  | Raised by       |
| ----------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Persisted editor state — collapsed panels, muted Operations | editor-only, or `schemaVersion` bump — by shape | choosing among three shapes. A sidecar file is editor-only; a top-level `editor` block is a bump for a key no consumer reads; `meta` is **forbidden by E4**, because **R4** makes anything put there permanent and shipped to every host. | `09` §14, §4.1  |
| Image export from the editor                                | editor-only                                     | nothing structural. The objection is `00` §8.2's, not §5.2's — see below. Its residue is §5.3's first row.                                                                                                                                | `09` §14, §14.1 |
| Migrating orphaned Selections rather than reporting them    | editor-only                                     | a stated rule the author can predict. `09` §9.4 rejects the feature outright; undo is the repair.                                                                                                                                         | `09` §14, §9.4  |

**Image export is not a second renderer, and that is the wrong objection.** `00` §5.2's permanent
non-goal is about the preview: one renderer, and the editor's preview is it (`07` **R1**, `08`
**S2**). A rasterizer is not the preview, so that non-goal is untouched. The real objection is `00`
§8.2's — an exporter that draws differently from the preview produces a picture that is not the one
the author approved, and it fails in the one place they cannot check by looking, because they are
looking at the preview. `09` §14.1's route out is SVG serialization built from `cellBox` and the
transform six-tuple, testable against **R15**, with paint order as document order (**R10**) and
clipping as one `clipPath` (**R9**).

**Persisted editor state is where mute-by-removal lands.** `09` §4.1 makes muting an Operation a
removal held in session-scoped UI state — correct for free under **G3**, and invisible in the file,
which is the point. It does not survive a reload, and `09` Q10 records that whether authors read
that as a feature or as data loss is an implementation observation. That question is this row's
strongest argument, and it is §7.2's B10.

---

## 6. Delivered and withdrawn

Recorded so they are not re-listed by a later harvest. A row leaves §4 or §5 by landing here,
never by being deleted — the same discipline as `01` §11.4's tombstones and `05` **X8**'s
retired names.

| Point                                         | Outcome                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Renderer-side regression snapshots            | **Delivered** — `07` §11.3, **R15**. Two exact vector tables, geometry and transform. The compositing residue is §5.3 and is a separate item.                                  |
| ~~Renderer emits the derived config it used~~ | **Withdrawn** — ADR-002. There is no derived config; `(seed, loadSalt)` reproduces any render (`04` §8.3). `04` §10 marks it explicitly not carried here, and this row is why. |

**Nothing moved here in the `09` pass, and that is a finding rather than an omission.** Every row
in §4 and §5 was checked against the section it cites. Three notes were stale; no row was. The
distinction matters: a stale note misdescribes the state of another document, while a stale row
would mean this document is advertising work that already exists. The first happened three times
and the second has not happened yet.

---

## 7. Questions with no owning document

Distinct from §10, which holds this document's own open questions. These are questions raised
in a completed spec, answered by no document, and deferred to no document. They are collected
here because a question with no owner exists only in the table that raised it, and the
conversations that raised them are discarded.

Nothing here is a feature. These are decisions that implementation will force.

### 7.1 Before `1.0.0`

| #   | Question                                                                              | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Is `gradient`'s use of `cos` / `sin` reproducible across runtimes? (`05` Q3, `04` Q9) | **A correctness obligation, not a deferral.** ECMAScript leaves transcendental precision implementation-defined, so `cos(37°)` may differ in its last bits between runtimes or engine versions. Consequences are confined to values landing exactly on a `steps` boundary or a palette threshold — rare, real, and silent. It bears directly on `02` §6.6's reproducibility claim and on **G1**. Two ways out: specify an integer approximation for the angle projection, or accept the exposure explicitly and record it as known-bad in the manner of `02` §10.1. Doing neither leaves **G1** overstated. `vignette` is unaffected — IEEE 754 specifies `sqrt` exactly. |
| A2  | When is `1.0.0` declared? (`05` Q2)                                                   | A project decision, not a spec one (`05` §10.3). It cannot precede an implemented and exercised V1, and A1 should be settled before it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 7.2 At implementation time

| #   | Question                                                                                       | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Should the component memoize resolution per session, keyed on `(tileId, assetId)`? (`08` Q1)   | Would make **R2** structural rather than a provider obligation the component cannot check. Against: it silently repairs an impure provider, and would cache a lazy provider's rejection too. `08` leans yes without deciding. `09` §10.4 supplies the editor's provider and states that it obeys **R2**, which is one more provider written to the obligation rather than an answer to whether the component should enforce it.                                                                                       |
| B2  | How does the component know whether it is a development or a production build? (`08` Q3)       | `07` §4.3 splits behaviour on it and no document says who decides. A bundler flag ties the package to one toolchain; a prop is a host lie waiting to happen; always throwing loses `07` §4.3's production posture.                                                                                                                                                                                                                                                                                                    |
| B3  | Should `meta` be validated at all? (`07` Q5, `08` Q5)                                          | **Narrowed by `09` §11.1, which cites this row.** `06` **C4** makes `meta` the one place a typo is silent. Export of the asset folder alongside the file (**E14**) closes the `src` case without validating anything: `src` stops being a string an author typed and becomes one the editor wrote beside a file it just copied. What remains is hand-authored or hand-edited files, and any `meta` key other than `src`. **Reopening `06` §9.1 is not the answer** — that is a different trade, and it is §5.2's row. |
| B4  | Is `Wpx` ever needed before first paint? (`08` Q4)                                             | **Still no, and the predicted instance has now been specified.** `08` Q4 guessed that an editor converting a pointer event would get `Wpx` from the exposed element; `09` §7.3 does exactly that for the `cellList` brush, using the render box element `08` §7 exposes. Becomes a real question only if some host needs it earlier.                                                                                                                                                                                  |
| B5  | Should `everyNth` accept both axes in one Selection rather than needing composition? (`04` Q8) | Composition (§4.1) would answer it, but a `both` axis is a cheap alternative that does not wait on the `ParamSpec` gate. Undecided, and cheap either way.                                                                                                                                                                                                                                                                                                                                                             |
| B6  | Should `06` ship a machine-readable schema artifact? (`06` Q12)                                | The feature is §5.2's first row; the decision is here. Revisit if hand-written validation proves error-prone. §5.4's note records why it is not merged with the navigation-tooling row.                                                                                                                                                                                                                                                                                                                               |
| B7  | Should `06` §9.1's strictness be relaxed? (`06` Q4)                                            | The feature is §5.2's second row; the decision is here. Reversal earns an ADR.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| B8  | Where does the editor's own asset store live? (`09` Q8)                                        | `09` §10.4 and §11.2 both require the editor to load an asset it has not yet exported, and neither says where it lives — IndexedDB, the file system, a server. It stays unspecified until an editor exists in more than one deployment shape, at which point the answer is probably not one answer.                                                                                                                                                                                                                   |
| B9  | Is `selection()` enough, or will an overlay want per-cell values? (`09` Q9)                    | **E7** ships one overlay and nothing in V1 wants more. Showing an Operation's mapped value per cell would need a second export of the same shape as §4.1's, and would reopen `08` §4.5's refusal of a grid callback. No instance has arisen.                                                                                                                                                                                                                                                                          |
| B10 | Does mute-by-removal confuse an author when it does not survive a reload? (`09` Q10)           | It is correct — **G3** returns the Operation's exact randomness — and invisible in the file, which is the point. Whether that reads as a feature or as data loss is an observation nobody can make before an editor exists, and it is the strongest argument for §5.5's first row.                                                                                                                                                                                                                                    |

---

## 8. Invariants summary

**None, and deliberately.**

This document constrains nothing. It records what is not yet constrained, which is the opposite
job. `01` §11.1 reserves an invariant prefix for every document that binds behaviour and none
for this one; that gap is intentional and should stay.

If an entry here ever needs to bind something, the binding belongs in the document that will own
the feature, written at the time the feature is specified — not asserted in advance from a
roadmap row, where nothing downstream would inherit it.

---

## 9. Extension points

| Point                                                        | Status                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Harvest passes for `09`~~                                  | **Delivered** — the `09` pass, §1.1. Every document in the package is now harvested. `00` landed and added no row: it is itself a harvest and coins no deferral. The row is kept rather than deleted, per §6's discipline |
| Re-harvest when a completed spec is amended                  | `[EXTENSION POINT]` — replaces the row above as the mechanism by which this document grows. The package is complete, so future rows arrive from amendments and from items landing in §6 rather than from new documents    |
| A _next_ marker distinguishing intended-soon from indefinite | `[POSTPONED]` — §3.3. Nothing is scheduled, and adding sequence before anything is scheduled is invention                                                                                                                 |
| Recording, per item, which documents would need revisiting   | `[POSTPONED]` — the _Raised by_ column is a weak proxy; the real answer is the dependency graph in each document's header block                                                                                           |

---

## 10. Open questions

This document's own. §7 holds the package's homeless questions and is content rather than
housekeeping; the two do not overlap.

| #   | Question                                                                                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does asset authoring belong here or to `09`? (§4.4)                                                                | **Resolved as proposed, with the line at bundling.** `09` §11.1 and **E14** take import, attach, the tile library UI, and export of the asset folder; optimization, source formats, and sprite sheets stay in §4.4. Recorded as closed rather than silently updated, because `00` §9 cites this row as its named instance of a routing with no destination.                                                                                                                                                                                                                                                                                             |
| 2   | Should `08` §10's `[POSTPONED]` marker on layers be amended to match `03` §8 and `07` §13? (§4.3)                  | **Resolved by inspection — it already was.** `08` §10 carries `[EXTENSION POINT]` and cites §4.3 as the reconciling document. The question outlived the amendment that answered it, and was found only by opening `08`. **Extended this pass:** §4.3's own note went on asserting the old marker for a full pass after this row recorded otherwise, so the document contradicted itself in two places. See Q6.                                                                                                                                                                                                                                          |
| 3   | Does the cost vocabulary need a tier for _changes the editor only_? (§3.2)                                         | **Resolved — yes.** §3.2 gains **editor-only** as an eighth tier, from `09` §14.1 and `09` Q6. §5.5 holds three rows that need it. The tier's note exists to stop it being read as a synonym for _none_.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | Is _unknown_ an acceptable value in the Cost column, or should such rows be excluded until costed? (§3.2)          | **Resolved — acceptable, and load-bearing.** An uncosted item is not ready to schedule, and saying so is more useful than omitting the row. Five rows carry it, §4.4's asset-authoring row included.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 5   | Should §6 grow to record items that were _considered and rejected_, as distinct from withdrawn?                    | **Open, and the case weakens.** `09` produced seven rejected alternatives — a second document model, a `disabled` flag, a separate preview seed, diffing two grids, a draggable design width, orphan migration, a placeholder glyph — and every one found a home in `01` §10.1 or in a `[POSTPONED]` row here. Two passes have now failed to produce the instance this question is about.                                                                                                                                                                                                                                                               |
| 6   | **New this pass.** Should a note here that asserts an amendment is _owed_ to another document exist at all? (§1.1) | **Open, and it is this document's characteristic failure.** Four such notes were stale, three of them citing documents that cite this one back. The note is a claim about a document this one does not own, and nothing updates it when the claim stops being true. Three options: date each note, drop them and record the amendment only where it is owed, or keep them and make verification a step in the process rather than a habit. **The pass that raised this question then failed it twice**, which is evidence for the third option and against the first two — a discipline that depends on remembering is the discipline that just failed. |
