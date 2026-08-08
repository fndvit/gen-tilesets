# Audit — session C — the editor

## 1. Header

| | |
| --- | --- |
| **Session** | C — editor |
| **Date** | 2026-08-07 |
| **Writes** | `audit/c-editor.md` |

**Documents read, in full:**

- `/Users/poldarder/Documents/pol/projects/tileset-creator/generative-tileset-creator/spec/00-overview.md`
- `/Users/poldarder/Documents/pol/projects/tileset-creator/generative-tileset-creator/spec/09-editor.md`
- `/Users/poldarder/Documents/pol/projects/tileset-creator/generative-tileset-creator/spec/roadmap.md`

**Targeted lookups, permitted by `00-method.md` for `01`:**

- `spec/01-glossary.md` §13 — the invariant census, for section 4.
- `spec/01-glossary.md` §14–§15 — read because they sit immediately below §13 and were on screen.
  Q7 and Q9 are cited in sections 4 and 6; nothing else from them is used.

Nothing else was opened. `02`–`08`, `/adr`, and `_harvest.md` were not read this session.

### 1.1 `/spec/roadmap.md` was not in the folder

Reported in the reply before auditing began, per `00-method.md`'s _verify headers_ rule, and
recorded here because the incident is a finding about the package rather than about this session.

At session start `spec/` held `00`–`09` and `PROCESS.md`. **There was no `roadmap.md`**, and there
never had been: `git log --all -- spec/roadmap.md` is empty and `git ls-files spec/` lists eleven
files, none of them the roadmap. The only post-`09` copy was outside the repository at
`../specs-versions/0608-0806/roadmap.md`. Its header and §1.1 were opened to establish that it was
the right document rather than a stale one — §1.1's Passes table records a second pass sourced from
`09-editor.md` adding _"seven rows, an eighth cost tier, a new §4.5 and §5.5"_, which is what `00`
§10 and `09` Q11 both claim the roadmap pass produced. It was mis-placed, not stale — the inverse of
the incident `00-method.md` says happened once to `00`.

The user placed the file during this session. `spec/roadmap.md` is now byte-identical to that copy,
and the audit proceeds against `/spec`.

Two further observations, since the folder was inspected:

- `spec/PROCESS.md` is present and appears in no index. Its own header reads _"This document does
  **not** ship to the repo."_
- The pre-`09` roadmap survives at `../specs-versions/0408-2217/` and `../specs-versions/0508-1328/`
  (~35.8 KB against 58.0 KB). Anyone reaching for a sibling copy can reach the wrong one.

This is `00` §9's last row failing in the plainest available way — _a document is confirmed to have
arrived before the next pass runs against it_ (`01` Q9). Three harvest passes ran against a document
that was not in the folder. `01` Q9 names the general shape: _"The absence is invisible by
construction."_

### 1.2 Header check

One row per document, with what cites it and whether they agree.

| Doc | Status | Amended | Cited by, in scope | Agree? |
| --- | --- | --- | --- | --- |
| `00-overview.md` | Draft, agreed | §3.1, §4.3, §4.4, §4.5, §6, §7, §9, §10, §10.1, §10.2, §12, Q5 — the `09` pass, 2026-08-06 | `09` §3.1, §14.1, Q11; `roadmap` §2, §4.4, §5.5, §10 Q1 | **Yes**, except §10.1 — §1.3 |
| `09-editor.md` | Draft, agreed | **none — the header carries no Amended line** | `00` §4.4, §4.5, §6, §10, §10.1; `roadmap` §1.1, §4.1, §4.4, §5.5, §7.2, §10 Q1, Q3 | **Yes** on every count; see the anomaly below |
| `roadmap.md` | Draft, agreed | **no Amended line**; §1.1's Passes table serves the function, and §4.1 / §4.5 carry inline _Amended 2026-08-06_ | `00` §2, §4.3, §5.1, §5.2, §9, §10.1; `09` §2, §11.1, §14, Q6, Q7 | **Yes** — §1.1's second pass matches what `00` §10 and `09` Q11 claim |

**The `09` anomaly.** `09` has no **Amended** line, yet `09` Q11 has plainly been amended in place —
it reads _Resolved_ and cites `00` §10.2's correction, which post-dates the document's authoring.
`00` §9's convention row requires _"one **Amended** line per amendment."_ This is the same defect
`00` §10.1 records against `07` (_"`07` also carries no **Amended** line for either `09`-driven
change to it"_), one document over, and unrecorded anywhere.

**Counts reconcile.** `00` §4.5's census against `09`: manufactured guarantees 6 (`09` §3's table has
six rows) ✓; editor invariants 16 (`09` §13 lists E1–E16) ✓; advisory diagnostics 9 (`09` §12.2 has
4 + 5) ✓; overlay kinds 1 (**E7**) ✓.

**`roadmap`'s two resolutions against `09` are recorded on both sides**, verified this session:
`roadmap` §10 Q1 ↔ `09` Q7 (asset authoring, line drawn at bundling), and `roadmap` §10 Q3 ↔ `09` Q6
(the `editor-only` cost tier). These are the only cross-document resolutions this session can check,
and both hold.

### 1.3 `00` §10.1's last row is stale in two of its three residues

`00` §10.1's final row lists _"Three one-line residues, each verified by opening the document named,
2026-08-06"_ — in `07`, `09`, and `01`. Two of the three were checked this session by opening the
document named, and both are stale.

**Residue against `09`.** `00` §10.1:

> **`09` Q11** reads _open until the package's harvests run_, and they have run; its parenthetical
> claim of three amendments owed to `02` and `04` is the instance `_harvest.md` corrects.

`09` Q11 as it stands:

> **Resolved.** All three harvests have run — `01` §15 Q6, `roadmap` §1.1, `00` §13 Q5. The three
> amendments this row recorded as owed to `02` and `04` had already landed when it was written;
> `_harvest.md`'s tail carries the correction and `00` §10.2 counts it.

**Residue against `01`.** `00` §10.1:

> **`01` §13** says **D3** _is owed_ its rewrite; `03` carries it, rewritten in place, with a header
> line citing `01` Q7.

`01` §13 as it stands:

> **Rewritten in place, not renumbered:** **G1** (ADR-002), **O4** and **O8** (ADR-002), **O7**
> (ADR-001), **R3** (`08` Q2 …), and **D3** (open question 7's weight-walk rename). Each keeps its
> identifier; only the text moved.

Both residues describe work that has landed. The third — _"**`07` §9.1**'s first row still says the
author _drags the design page width_"_ — cannot be checked in scope and goes to section 6 as C-S2,
where it collides with a claim `09` §9.2 makes about the same table.

This is the pattern `00` §10.2 states and counts, in the form that section calls the harder one:
_"correct when written and stale when applied."_ Note what makes it worse here than in the general
case — the row asserts its own verification, dated. A reader has no cheaper signal than the one the
row already spends.

**The two sites are stated and not numbered.** `00` §10.2's table counts fourteen as that section
records them. What the running total is now is a whole-package question: session B's file has not
been read here, and a scoped session claiming an ordinal would be making precisely the kind of
unverified global claim the count exists to count. **The ordinal is session D's.**

---

## 2. Comprehension

These three documents give the V1 boundary from the inside, the one application that sits on all of
it, and the complement of both.

`00` is the front door and a harvest: it holds no authority of its own (`00` §1), states V1 as a
census of counts against owning tables (`00` §4), and records nine standing non-goals as postures
several documents reason from rather than as deferrals (`00` §5.1). `09` is the last document in the
package and the only one specifying an **application** rather than a boundary (`09` §1). Its
operating assumption — the editor is the only writer of a `TilesetFile` (`09` §3) — is not a
restriction but a statement about where six of the package's guarantees are **manufactured**, since
they are enforced nowhere else and cannot be checked after the fact. `roadmap` is the third harvest:
every deferral, once, with a cost tier from a fixed eight-tier vocabulary and a gate saying what must
land before it (`roadmap` §3.2), and deliberately no priority, no ordering, and no _next_
(`roadmap` §3.3).

**The boundary they sit on is the editor/package boundary**, and it is asymmetric in a way the other
two boundaries are not. The engine/renderer split is drawn three times in three registers (`00`
§3.2) and is enforced by types — `06` **C1** makes a prohibited engine input unstateable. The
editor/package boundary is enforced by nothing. `09` §3's six guarantees are manufactured by
convention, and four of the six appear on the other side as `06` §10.4's advisory diagnostics:
legal configs that the schema can enumerate but cannot prevent. `09` §3 draws the general form —
**an advisory diagnostic is the shadow of a guarantee the editor manufactures.**

Two consequences shape everything below. First, several of `09`'s invariants constrain architecture
and build configuration rather than output, which is why the posture proportion in section 4 is
higher than a boundary document's would be. Second, `09` consumes all eight preceding documents and
restates none of them, so most of what it asserts is a claim about a document this session did not
open — which is why section 6 is the longest section in this file. That is the split working, not
the split failing.

---

## 3. Under-determination

Sixteen entries. Kinds are kept apart: `open` (the spec is silent and something must be chosen),
`contradiction` (two documents in scope say incompatible things), `under-specified` (a constraint is
stated but does not determine a unique behaviour).

Nothing below is resolved, and no default or preference is indicated.

### C-1 · `selection()` does not exist

- **Cite** — `09` §6.2, **E8**; `roadmap` §4.1 row 2.
- **Kind** — `open`.
- **What is not settled** — **E8** requires overlay cell sets to come from the engine package, and
  §6.2 states the required signature exactly:

  ```
  selection(config: TilesetConfig, operationId: string, seed: Seed, loadSalt: uint32 = 0)
    -> (x: number, y: number) -> boolean
  ```

  §6.2 then says _"`02` §12 gains this export"_ and calls **E8** _"the invariant that requires
  something the package does not currently export, and it is this document's one substantive ask of
  a completed spec."_ `roadmap` §4.1 files the export as an **extension point** — _agreed, unbuilt_
  — with cost _minor engine bump_ and gate _nothing_, raised by `02` §12 and `09` §6.2.

  So the package's own roadmap classifies as deferred an export that a V1 invariant makes mandatory.
  Whether `02` §12 carries the row, and in what status, is unverifiable here (C-S1).
- **What must be chosen** — whether `02` gains the export as V1 work or **E8** is amended. There is
  no third option that ships an overlay: §6.2 forecloses the alternative explicitly (_"Why not diff
  two grids"_ — a diff shows effect, not selection, and misses every cell an Operation writes a
  value identical to the one already there).

### C-2 · The undo stack's lifetime is unstated, and it is the repair

- **Cite** — `09` §4.4 **E6**; §4.1; §9.4 step 3.
- **Kind** — `open`.
- **What is not settled** — §4.4 says _"Undo is a stack of files."_ §4.1 says transient UI state
  _"is session-scoped in V1 and does not survive a reload."_ Nothing says which the undo stack is,
  and nothing bounds its depth.

  This is load-bearing rather than housekeeping. §9.3 is the editor's one destructive edit, and §9.4
  resolves `04` Q4 by making undo the repair: _"Undo restores the file whole (E6) … Undo being the
  repair is not a fallback."_ If the stack is session-scoped, the repair for the only destructive
  edit in the editor expires with the session, and §9.4's resolution of `04` Q4 holds only within
  one sitting. If it is persisted, it is a second persisted artifact `06` does not know about —
  which is the shape `09` §14's first row files as `[POSTPONED]`.
- **What must be chosen** — the undo stack's lifetime and depth, and whether §9.4's repair claim is
  scoped to a session.

### C-3 · **E5** says _legal_, §4.2 says _parses_

- **Cite** — `09` §4.2, **E5**.
- **Kind** — `under-specified`.
- **What is not settled** — **E5** requires every file-touching action to be _"a function
  `TilesetFile → TilesetFile` that is defined on every legal file and **produces a legal file**."_
  The prose immediately under it gives the mechanism as _"Text commits on parse, not on keystroke …
  The control commits on a successful parse, or on blur, or is reverted."_

  Parse-success and legality are different gates. `"0"` parses as a number and is a `cellSize` that
  breaks `columns = ceil(referenceWidth / cellSize)` (`02` §7.1, via §9.3). A negative
  `referenceWidth` parses. Under the invariant these must not reach the file; under the prose they
  do, and `validate()` then fails during editing — which **E15** classifies as an editor defect.
  The three consequences §4.2 draws are consistent with the invariant; the mechanism sentence is
  weaker than the invariant it implements.
- **What must be chosen** — whether the commit gate is parse-success or transition-legality, and
  where the per-field legality predicate lives given that field domains are `06`'s.
- Does not read as deliberate. §4.2's other two consequences (cascading deletion, unreachable
  validation error) are both stated at the legality level.

### C-4 · **E9**'s totality is asserted over a set that will grow

- **Cite** — `09` §7.1 **E9**, §7.3; `roadmap` §4.2 row 2.
- **Kind** — `under-specified`.
- **What is not settled** — **E9** says _"The mapping from `ParamSpec` to affordance is total. A
  registered type declaring only a `ParamSchema` gets a working control with no editor code written
  for it."_ §7.1's table covers five forms and carves out `cellList` (§7.3), which §7.3 says is
  _"permitted because the schema names it explicitly rather than because the mapping ran out."_

  `roadmap` §4.2 carries **Selection-valued parameters in `ParamSchema`** as an extension point,
  cost _package-internal_, gating §4.1's Selection composition. When it lands, `ParamSpec` has a
  sixth form and §7.1's table has a hole. Whether **E9** is thereby violated, or whether **E9**
  describes the V1 five, is not stated. §7.2's last paragraph leans the first way — _"E9's totality
  is what permits that"_ — by treating totality as a standing property rather than a snapshot.
- **What must be chosen** — whether **E9** binds every future `ParamSpec` form (so that adding one
  obliges an affordance in the same change), or describes the forms `06` §7.4 declares today.

### C-5 · **E2** is stated twice with different scope

- **Cite** — `09` §3.1 **E2**; `09` §13.
- **Kind** — `under-specified`.
- **What is not settled** — §3.1's normative text:

  > **Invariant E2** — _The editor's preview component and its `engineVersion` writer come from a
  > single pinned version of the **engine and renderer** package._

  §13's summary:

  > **E2** | The preview component and the `engineVersion` writer come from one pinned package
  > version.

  The summary drops _engine and renderer_. §3.1's own gloss settles the intent — _"the cheapest
  instance of it in the package: **one dependency entry rather than two**"_ — but the summary table
  is what a later reader consults, and it is satisfiable by two packages each pinned.
- **What must be chosen** — nothing about the invariant's meaning; §3.1's gloss determines it. What
  is open is whether §13 is corrected, which is `01` §13's _amended in place keeps its identifier_
  convention applied to a summary row.

### C-6 · Where `engineVersion`'s string comes from

- **Cite** — `09` §11.3; §3.1 **E2**; §3's table row 4.
- **Kind** — `open`.
- **What is not settled** — §11.3 says the editor writes _"`engineVersion`, naming the pinned package
  of E2."_ **E2** requires preview and writer to share one pinned version. Nothing says how the
  writer obtains the version string at build or run time.

  This is not a detail. §3's table row 4 — _`engineVersion` names the engine that actually wrote the
  file_ — is _"Checked by: nothing — advisory by **C3**"_. **E1** makes producing it the editor's
  obligation. So the guarantee is manufactured, checked nowhere, and its mechanism is unspecified;
  the three together mean nothing in the package can distinguish a truthful `engineVersion` from a
  fabricated one.
- **What must be chosen** — the source of the version string, and whether **E2** is discharged
  structurally (preview and writer share one import) or by a check.

### C-7 · Advisories have no lifecycle

- **Cite** — `09` §12.2 **E16**; §9.4 step 2.
- **Kind** — `open`.
- **What is not settled** — nine advisories are enumerated (four from `06` §10.4, five coined at
  §12.2). **E16** constrains what an advisory must not do — _"never blocks an action, never modifies
  the file, and is never reported as an error"_ — and nothing constrains presentation, dismissal,
  persistence, or recomputation.

  §9.4 step 2 is the only lifecycle statement in the document: an orphaned Selection is carried
  _"as a §12.2 advisory until the author touches it."_ It covers advisory 3 and, by extension, the
  `cellList` case. The other eight have none. Several are naturally standing conditions (6, two
  Tiles sharing a name; 7, a non-square asset), one is a historical event that cannot be recomputed
  from the file at all (8, _"a palette **is reordered** under a `random` Source"_ — the file records
  the order, not the reordering), and three are import-only by §12.2's own table.
- **What must be chosen** — whether advisories are recomputed from the file, latched at an event, or
  a mix; and whether dismissal exists, given that dismissal state would be UI state under §4.1 and
  would not survive a reload.

### C-8 · **E14**'s export shape

- **Cite** — `09` §11.1 **E14**, §11.2.
- **Kind** — `under-specified`.
- **What is not settled** — **E14** requires _"a `TilesetFile` and an asset folder together"_, laid
  out as:

  ```
  tileset.json
  tiles/<tileId>/<assetId>.<ext>
  ```

  `<ext>` is determined by nothing in the package. It is not in the file — `meta` carries `src`,
  `width`, `height` (§10.3) and **E4** forbids a fourth key — so it must come from the editor's own
  asset store, which is unspecified (`09` Q8, `roadmap` B8). The export's physical form — a browser
  download, a directory write, an archive — is also unstated, and §11.2 makes the file's correctness
  depend on it (_"every `meta.src` is a path relative to that folder's root"_).
- **What must be chosen** — where the extension is carried, and what artifact an export produces.

### C-9 · What **E13** measures for an asset with no intrinsic pixel size

- **Cite** — `09` §10.3 **E13**; `roadmap` §4.3 row 3.
- **Kind** — `open`.
- **What is not settled** — **E13**: _"An asset attach measures the asset's intrinsic dimensions and
  writes all three keys, or it fails."_ §10.3 types `width` and `height` as _number, design px_,
  _measured at attach, then frozen_, and adds _"An asset that will not decode is a failed attach,
  not an attach with two keys missing."_

  An SVG referenced by `src` is a legal V1 asset — `Drawable` is `{ src: string }` and it is drawn
  as an `<img>` (`00` §4.3, `08` **S5**) — and may carry no intrinsic pixel dimensions at all
  (`viewBox` only, no `width`/`height`). Under **E13** that is a failed attach. `roadmap` §4.3
  reserves _inlined SVG markup_ as a **future** `Drawable` shape, which does not cover this case:
  the question is SVG as an ordinary `src`, today.
- **What must be chosen** — whether **E13** admits a source with no intrinsic size, or V1 restricts
  attachable assets to those that have one. The second is a real restriction stated nowhere.

### C-10 · Mute-by-removal's reload behaviour

- **Cite** — `09` §4.1; `09` Q10; `roadmap` §5.5, B10.
- **Kind** — `open`.
- **What is not settled** — muting an Operation removes it from `config.operations` and holds it in
  session-scoped UI state. §4.1 records the cost: _"It does not survive a reload, which is the cost
  of session-scoped UI state and is recorded rather than solved."_ Q10 asks whether that reads as a
  feature or as data loss and answers **Open**.

  What is not settled is narrower and is not the same question: whether the editor is obliged to
  _tell_ the author before a reload discards muted Operations. §12.2's advisory vocabulary exists
  and **E16** would permit one; nothing says whether this is one.
- **What must be chosen** — whether an affordance obligation attaches, given §3.1's rule that an
  affordance carries an obligation and the obligation is what a later reader needs.

### C-11 · What the import screen shows when import fails

- **Cite** — `09` §12.4, §12.1.
- **Kind** — `open`.
- **What is not settled** — §12.4 says _"the file is not opened"_ and that the screen _"has no
  preview and cannot have one"_ (**S3**). It lists errors by JSON Pointer and stable code and offers
  no automatic repair. Unstated: what the editor's state is at that moment. Is there an empty-editor
  state? If a document is already open, does a failed import leave it untouched, and does the error
  list replace the editing surface or sit beside it? **E3** says the editor's document state _is_ a
  `TilesetFile`, which does not obviously admit _no document_.
- **What must be chosen** — whether the editor has a no-document state, and what a failed import does
  to an open document.

### C-12 · The memorable seed generator

- **Cite** — `09` §8.2.
- **Kind** — `open`.
- **What is not settled** — _"the editor offers a **generated memorable seed** in word-word-number
  form, per `02` §6.6."_ The vocabulary is nowhere in the package, and nothing says whether
  generation must itself be reproducible. Low cost, but it is a deliverable with no source.
- **What must be chosen** — where the word list lives, and whether the generator is seeded.

### C-13 · _Soft_ track semantics

- **Cite** — `09` §7.5.
- **Kind** — `under-specified`, and it **reads as deliberate in part**.
- **What is not settled** — _"Soft means the track extends to contain any value typed, and never
  clamps one."_ Undetermined: whether it extends symmetrically, whether it shrinks back when the
  value is removed, and whether the extension survives a session. The extension is UI state under
  §4.1 and would not survive a reload.

  The `[−2, 2]` figure is explicitly _"a UI constant with no authority anywhere"_ and its
  indeterminacy is plainly deliberate. The _behaviour_ of softness is not obviously in the same
  category: §3.1 says the document specifies affordances and their obligations, and _never clamps_
  is an obligation while _extends_ is a behaviour with several readings.
- **What must be chosen** — the extension rule, or an explicit statement that it is unconstrained.

### C-14 · `09` §2 routes to a row that specifies nothing

- **Cite** — `09` §2; `roadmap` §4.4 row 1; `00` §9.
- **Kind** — `open`.
- **What is not settled** — `09` §2 routes _"Asset optimization, source formats, and sprite sheets"_
  to `roadmap` §4.4. That row's cost is **unknown** and its gate is _"nothing here"_, and its note
  says the cost reads unknown _"honestly so: nothing in the specified surface constrains it."_

  `00` §9 names this exact row as the package's instance of _"a routing with no destination is how
  work disappears"_, and `roadmap` §10 Q1 records the routing as repaired. It is repaired in the
  sense that a destination now exists; the destination holds no design, by construction, since
  `roadmap` binds nothing (`roadmap` §8). So the V1 question — what formats the editor accepts at
  attach — is answered by a document that cannot answer it.
- **What must be chosen** — which document states the accepted source formats for **E13**'s attach,
  given that `roadmap` cannot and `09` §2 has routed it away.

### C-15 · `09` declares **Constrains: nothing** and constrains `02`

- **Cite** — `09` header; §6.2; `00` §6, §7.
- **Kind** — `under-specified`.
- **What is not settled** — `09`'s header reads _"**Constrains:** nothing. It is the last document in
  the package."_ `00` §7's graph shows the chain terminating at `09`. Yet §6.2 requires a new export
  from `02`, §14.2 raises a feature it says is _"**Owned by `04`** … and `05`"_, and §11.1 takes
  scope from `roadmap` §4.4.

  The convention's sense of _Constrains_ is document load-order, not behaviour — `00` §6 keeps the
  distinction elsewhere (_"Documents with no invariant prefix bind nothing"_, and `09` has the **E**
  prefix). But the dependency arrow genuinely reverses at §6.2: `02` cannot be implemented to `09`'s
  satisfaction without a section `09` specifies. `00` §7's graph does not show that edge, and neither
  does `09`'s header.
- **What must be chosen** — whether the header convention needs a form for _requires an amendment
  to_, distinct from _constrains_. This is a package-convention question, not an editor one.

### C-16 · Development vs production build

- **Cite** — `09` §12.1; `roadmap` §7.2 B2.
- **Kind** — `open`.
- **What is not settled** — §12.1's table makes editing-time `validate()` _"an assertion"_ whose
  failure is _"a development-build failure."_ **E15** rests on the distinction. `roadmap` B2 records
  that no document says who decides it, and that `07` §4.3 splits behaviour on the same distinction:

  > **B2** How does the component know whether it is a development or a production build? (`08` Q3)
  > — `07` §4.3 splits behaviour on it and no document says who decides. A bundler flag ties the
  > package to one toolchain; a prop is a host lie waiting to happen; always throwing loses `07`
  > §4.3's production posture.
- **What must be chosen** — the mechanism, and whether the editor's answer and the component's answer
  are the same answer. Listed again in section 5's gate table: the build trips this immediately.

---

## 4. Invariant census

### 4.1 Count

**Found: E1–E16. Sixteen. No gaps, no duplicates, no invariant declared twice.**

Declaration sites, in document order:

| ID | Declared at | ID | Declared at |
| --- | --- | --- | --- |
| **E1** | §3 | **E9** | §7.1 |
| **E2** | §3.1 | **E10** | §8.1 |
| **E3** | §4.1 | **E11** | §9.2 |
| **E4** | §4.1 | **E12** | §9.3 |
| **E5** | §4.2 | **E13** | §10.3 |
| **E6** | §4.4 | **E14** | §11.1 |
| **E7** | §6.1 | **E15** | §12.1 |
| **E8** | §6.2 | **E16** | §12.2 |

**Agrees with `01` §13**, opened this session, which gives `09-editor.md` → **E1**–**E16**, count 16,
within its total of _"Eighty-six invariants across eight documents."_ **Agrees with `00` §4.5**,
whose census row reads _Editor invariants · 16 · `09` §13_. **No discrepancy to report against the
declared set.**

Two structural notes, neither a discrepancy:

- **§5 declares no invariant.** The preview is where `08` **S2** lands and where `09` §5's _"The
  editor does not pass a `seed`"_ decision lives — a decision §5 justifies by reaching for `07`
  §3's stated worst outcome. It binds nothing of its own.
- **§7.2–§7.7 declare none either.** Six sections of authoring affordances, five of which resolve an
  open question from another document, carrying one invariant between them (**E9**, at §7.1).

### 4.2 Classification

**Postures — 4 of 16.** Each with its one-line reason.

| ID | Reason it is a posture |
| --- | --- |
| **E2** | Constrains the build graph, not runtime behaviour. No observation of a running editor distinguishes a compliant build from one that happens to agree today. Enforced by dependency configuration and review. |
| **E3** | A negative existential over the implementation — _"There is no second document model."_ Nothing observable distinguishes state-is-the-file from an equivalent projection kept in sync; the failure it prevents is a projection drifting later. |
| **E7** | _"exactly one kind of overlay"_ is a V1 scope statement. A test can confirm the overlay that exists is correct; it cannot confirm no second kind was added. |
| **E15** | Classifies a failure rather than specifying behaviour — _"A validation failure during editing is a defect in the editor's edit vocabulary."_ It assigns blame; the behaviour it implies is **E5**'s. |

**Assertions — 12 of 16:** E1, E4, E5, E6, E8, E9, E10, E11, E12, E13, E14, E16.

Three of these carry qualifications worth stating, since section 5 tests against them:

- **E1** is a conjunction of six conditions over emitted files, each individually checkable. It is
  assertable as a property of the writer — _for every file the editor emits, all six hold_ — which is
  why it earns a unit of its own (`U-C21`) rather than dissolving into the units that produce each
  row.
- **E2** and **E7**, though classified postures, each have an **assertable residue**: for E2, that
  the written `engineVersion` equals the version of the package the preview imports; for E7, that
  overlay geometry equals `cellBox`. The residue is the assertion half of an invariant whose
  substance is a posture — it does not make the invariant an assertion.
- **E8** is the mirror image: an assertion whose **second clause is a posture**. _"The set of cells
  an overlay covers is obtained from the engine package"_ is testable against `selection()`. _"The
  editor contains no implementation of any Selection's test"_ is a negative existential over the
  source, enforceable at the import boundary — a lint rule or a dependency-graph check, not a test.

### 4.3 The arithmetic

4 postures + 12 assertions = **16**, reconciling with `01` §13 and `00` §4.5.

**Five** invariants carry a posture component: the four postures, plus **E8**. E2's and E7's
assertable residues do not add to that figure — the residue is the assertion half of an invariant
already counted on the posture side.

So: **4 / 16 posture; 5 / 16 with any posture content.**

That is a higher proportion than a boundary document would produce, and the reason is structural
rather than incidental. `09` is the only document in the package specifying an application
(`09` §1), so several of its invariants constrain **architecture** (E3), **build configuration**
(E2), **scope** (E7), and **fault attribution** (E15) rather than output. `00` §5.2's own
distinction is the same one, arrived at from outside: it separates non-goals that carry invariant
IDs — **D10**, **G1**, **X7** — from those that _"do not, and are postures rather than invariants"_,
and `00` Q4 records that whether the distinction is principled or accidental _"has not been
examined."_ `09` supplies four instances where the two forms sit in one numbered series.

Each of the four is proposed for `test/untestable.md` in session D's terms, with the reason above as
its entry. That file is session D's to write; this is the input to it.

---

## 5. Candidate units of work

Twenty units, numbered to twenty-one — `U-C16` is present as a withdrawn tombstone, §5.1. **Not
ordered.** Ordering is a whole-package question and belongs to session D.

_Pure and browser-free_ is judged as `pnpm --filter @tileset/core test` would judge it: no DOM, no
pointer events, no image decode.

| # | Unit | Implements | Discharges | Must land first (as far as this scope sees) | Pure & browser-free |
| --- | --- | --- | --- | --- | --- |
| `U-C1` | **Document core and the edit vocabulary** — state is the file; every action a total legal→legal transition | `09` §4.1, §4.2 | **E5**; **E3**'s shape | `06`'s `TilesetFile` types and `validate()` | **Yes** — the transition layer is data→data |
| `U-C2` | **Undo stack** | `09` §4.4, §9.4 step 3 | **E6** | `U-C1` | **Yes** |
| `U-C3` | **Identifier generation** — generated, unique in scope, colon-free, never reassigned | `09` §4.3 | **E1** row 3 (with `U-C21`) | `06` **C10**'s scoping | **Yes** |
| `U-C4` | **`selection()` export** — the predicate `09` §6.2 specifies | `09` §6.2 | **E8**'s precondition | **An amendment to `02` §12 — C-1.** Lands in `packages/tileset`, not the editor | **Yes** |
| `U-C5` | **Preview host** — `<Tileset>` mounted on the editor's file, props per §5's table | `09` §5 | **none** — reason: the constraint is `08` **S2**'s and §5 specifies prop wiring only. **Not verified — `08` not read this session; see C-S9** | `<Tileset>`; `U-C1` | No |
| `U-C6` | **Selection overlay** | `09` §6.1, §6.2 | **E7**'s residue; **E8** | `U-C4`, `U-C5`, `cellBox` | No |
| `U-C7` | **`ParamSchema`-driven controls**, plus the optional `editor` block | `09` §7.1, §7.2 | **E9** | `05`'s registry, `06` §7.4's `ParamSpec` encoding | Mapping table **yes**; widgets no |
| `U-C8` | **`cellList` brush** — pointer events through `cellAt`, bounded at the call site | `09` §7.3 | **none** — reason: **E9**'s one declared exception, and its correctness rests on `cellAt`, owned by `07` §8.2 / `08` **S10**. **Not verified — `07`, `08` not read this session; see C-S10** | `U-C5`, the render box element | No |
| `U-C9` | **Numeric mapping control and authoring ranges** — crossing handles, soft tracks, `steps` | `09` §7.4, §7.5 | **none** — reason: §7.5 states its own figure is _"a UI constant with no authority anywhere"_, and §7.4's presentation is fixed by `04` §6.1. Verified in scope; the `04` half is C-S13 | `U-C7` | Soft-track logic **yes** |
| `U-C10` | **Palette builder** — the contiguous weight-segmented bar | `09` §7.6 | **none** — reason: presentation only; order semantics are **O6**'s and asset ordering is **D3**'s. **Not verified — `03`, `04` not read this session; see C-S11** | `U-C14` (tiles must exist) | No |
| `U-C11` | **Blend control** — accepted set computed from the registry | `09` §7.7 | **none** — reason: the accepted-set rule is ADR-001's and `04` §7.2's; the editor consumes the registry. **Not verified — `04` and `/adr/001` not read this session; see C-S12** | `05`'s registry | Set computation **yes** |
| `U-C12` | **Seed, salts, reroll, load preview** — four affordances, three persisted | `09` §8.1–§8.5 | **E10**; **E1** row 6 (with `U-C21`) | `U-C1`, `05` **X5**'s `stochastic` declaration | Salt arithmetic **yes** |
| `U-C13` | **Layout authoring** — preview width, design width, the derivation, orphan advisories | `09` §9.1–§9.4 | **E11**, **E12**; **E1** rows 1–2 (with `U-C21`) | `02` §7.1's derivation; `U-C2` (undo is the repair) | Derivation **yes**; controls no |
| `U-C14` | **Tile library, asset attach, the editor's provider** | `09` §10.1–§10.4 | **E13**; **E4** (attach half); **E1** row 5 | C-8 / C-9 / `roadmap` B8 — the asset store | **No** — measures intrinsic dimensions |
| `U-C15` | **Export** — file plus folder, relative `src`, everything explicit but `steps` | `09` §11.1–§11.3 | **E14**; **E4** (export half); **E1** row 4; **E2**'s residue | `U-C14`, `U-C20`, C-8 | Path construction **yes** |
| `U-C16` | **Withdrawn — kept as a tombstone.** A `meta` write-discipline unit (§4.1 **E4**, §10.3), folded into `U-C14` and `U-C15` because **E4** is discharged at the two sites that write `meta` and nowhere else | — | — | — | — |
| `U-C17` | **Advisory diagnostics** — the nine of §12.2 | `09` §12.2 | **E16** | `U-C1`; C-7 (lifecycle) | **Yes** — `advisories(file) -> Advisory[]` |
| `U-C18` | **Import screen** — gate, error list, no preview, no partial import | `09` §12.1, §12.4 | **E15**'s import half | `06` **C7**'s codes and paths; C-11 | Error presentation no |
| `U-C19` | **Asset error surface** — prominent, beside the preview, never a placeholder inside it | `09` §12.3 | **none** — reason: the channel is `08` **S6**'s and the empty cell is `07` **R3**'s; §12.3 adds a prohibition that rides on both. **Not verified — `07`, `08` not read this session; see C-S14** | `U-C5` | No |
| `U-C20` | **E2 pinning — one package, one dependency entry** | `09` §3.1 | **E2**, and its assertable residue | C-6 (the version string's source) | Residue test **yes** |
| `U-C21` | **E1 conformance suite** — six checks over every file the editor emits | `09` §3 | **E1** | `U-C3`, `U-C12`, `U-C13`, `U-C14`, `U-C15` | **Yes** — reads emitted files |

### 5.1 On `U-C16`

Recorded rather than renumbered, per `00` §8.5: _"a deleted thing is indistinguishable from a thing
that never existed, and the next reader has no way to tell whether they are looking at new material
or at a gap."_ A gap in this table would have read as a lost unit.

### 5.2 Five units are excused by ownership this session cannot check

`U-C5`, `U-C8`, `U-C10`, `U-C11`, and `U-C19` carry no invariant, and each states a reason as the
method requires. **In every case the reason is a claim about an out-of-scope document** — that
**S2**, **S10**, **O6**/**D3**, ADR-001, or **S6** owns the constraint the unit would otherwise have
to discharge.

That is the same form section 6 exists to quarantine, arriving in section 5 where it looks settled.
Each therefore carries an explicit _Not verified_ on its reason above and points at a matching
section 6 entry (C-S9 through C-S14). If any of those five ownership claims is wrong, the unit has
no acceptance criterion at all and the invariant it assumed was discharged elsewhere is discharged
nowhere.

`U-C9` is the one exception in that group: half its reason is verifiable in scope, because §7.5
states its own lack of authority in as many words.

### 5.3 Coverage check — every E invariant against a unit, or a stated reason

| ID | Class | Unit | If none, the reason |
| --- | --- | --- | --- |
| **E1** | assertion | `U-C21`, fed by `U-C3`, `U-C12`, `U-C13`, `U-C14`, `U-C15` | — |
| **E2** | posture | `U-C20` | — (the posture half is discharged by build configuration within that unit; the residue is tested) |
| **E3** | **posture** | — | A negative existential over the implementation. Its content is `U-C1`'s shape — an editor built to `U-C1` satisfies it by construction and one built otherwise is not detectably different. Proposed for `test/untestable.md`. |
| **E4** | assertion | `U-C14`, `U-C15` | — |
| **E5** | assertion | `U-C1` | — |
| **E6** | assertion | `U-C2` | — |
| **E7** | **posture** | `U-C6` discharges the residue (geometry equals `cellBox`) | The _exactly one kind_ clause is a V1 scope statement, not assertable. Proposed for `test/untestable.md`. |
| **E8** | assertion (second clause posture) | `U-C4` + `U-C6` | The second clause — no Selection test in the editor — is enforced at the import boundary rather than by a test. |
| **E9** | assertion | `U-C7` | — |
| **E10** | assertion | `U-C12` | — |
| **E11** | assertion | `U-C13` | — |
| **E12** | assertion | `U-C13` | — |
| **E13** | assertion | `U-C14` | — |
| **E14** | assertion | `U-C15` | — |
| **E15** | **posture** | `U-C18` covers the import half | Its assertable content **is E5's**, discharged at `U-C1`; what E15 adds is attribution. Proposed for `test/untestable.md`. |
| **E16** | assertion | `U-C17` | — |

**All sixteen resolve.** Twelve assertions each land on at least one unit; the four postures carry
stated reasons and three are proposed for `test/untestable.md`. **No invariant classified as an
assertion in section 4 lacks a unit here**, so there is no finding of that kind to report.

**E2 is the one to watch.** It is classified a posture and it does have a unit, because the posture
half is dischargeable by configuration rather than merely unfalsifiable. §5.4 is that unit's content.

### 5.4 What **E2** forbids structurally

`U-C20`'s content, called out because **E2** is the one invariant in this document whose discharge
is a repository-layout decision rather than code.

**E2** (`09` §3.1): _the editor's preview component and its `engineVersion` writer come from a single
pinned version of the engine and renderer package._ The gloss that determines its reading: _"the
cheapest instance of it in the package: **one dependency entry rather than two**."_ Its purpose is
stated as the failure it prevents — _"An editor previewing with engine `1.5` while stamping `1.4`
shows the author a picture no consumer of that file will get."_

**Six things it forbids:**

1. **Engine and renderer as two independently versioned packages.** If `@tileset/engine` and
   `@tileset/renderer` version separately, `engineVersion` has two candidate values and the field
   `06` **C3** describes has no referent. CLAUDE.md's layout puts both in `packages/tileset` and
   says why — _"E2 requires one pinned version"_. E2 is the reason the workspace has the shape it
   has, not a consequence of it.
2. **A hand-maintained version string.** A constant in the editor's source, an environment variable,
   a value in the editor's own manifest, or a build-time injection from anything other than the
   resolved package's manifest. Each of those can be correct on the day it is written and silently
   wrong afterwards, which is the entire failure §3.1 describes.
3. **Stamping the dependency _range_ rather than the resolved version.** `"@tileset/core": "^1.4.0"`
   resolving to `1.5.2` and stamping `1.4.0` is §3.1's example exactly.
4. **Two resolution paths to the package in one module graph.** A duplicated install, a
   peer-dependency arrangement that admits a second copy, a bundler alias, a `resolutions` override
   applied to one entry point and not the other. The preview would import one instance and the
   writer another, each internally consistent, with nothing reporting the disagreement — `00` §8.2's
   stated failure mode, _"a plausible-looking wrong picture with nothing reporting it."_
5. **Any preview whose version can differ from the stamped one at runtime.** A dynamically or
   remotely loaded renderer, a lazy import resolved against a CDN, or a version-picker affordance.
   E2 is a statement about a _single pinned version_, and anything that defers the choice past build
   time defeats it.
6. **Reading the version from the editor.** `roadmap` §3.2's `editor-only` tier says in as many
   words that _"nothing pins the editor's version … there is no number to move."_ So `engineVersion`
   names the package or it names a number no consumer can pin.

**What it does not forbid:** a workspace protocol dependency during development. `workspace:*` gives
one resolution path to one package, which is what E2 asks; the obligation it creates is that the
stamped version be read from that same resolved package rather than from anywhere else. That is C-6,
and it is open.

**The structural test available to `U-C20`** is the residue named in section 4: assert that the
`engineVersion` the editor writes equals the version of the package module the preview imports,
obtained through the same import. If preview and writer share one import, the two-value case becomes
unstateable rather than merely checked — which is `00` §8.3's principle (_"Make the wrong thing
unstateable, rather than detecting it"_) applied to E2. **This audit does not choose that
mechanism**; C-6 records the decision as open, and §8.3 is explicitly non-binding (`00` §8's
preamble).

### 5.5 Deferrals whose gate opens during the build

Held separate from the units, as instructed, and **not folded into them**. `roadmap` §3.2 gives each
deferral a cost tier and a gate; §3.3 refuses to schedule any of them. The rows below are those
whose **gate opens during V1 development rather than after it** — where the act of building V1
either satisfies the gate, forecloses it, or forces the decision the gate names.

| Row | Cost | Gate as written | When it opens, and why |
| --- | --- | --- | --- |
| **`roadmap` §4.1 · `selection()` as an export** | minor engine bump | _"nothing. An added export that moves no output, the same shape as `generateRegion`."_ | **Immediately, and it is not really a deferral.** Filed as an extension point — _agreed, unbuilt_ — while **E8** makes it mandatory for V1's only overlay. The gate is already open; what is missing is the row's classification. See C-1. |
| **`roadmap` §7.1 A1 · `gradient` transcendental reproducibility** | — (a correctness obligation, not a deferral) | Before `1.0.0`; _"Doing neither leaves **G1** overstated."_ | **At the first `gradient` implementation.** `00` §10.1 calls it _"the first thing implementation forces"_ and _"the only row here that outlives the package."_ Two exits are named — an integer approximation for the angle projection, or the exposure accepted and recorded as known-bad in the manner of `02` §10.1. |
| **`roadmap` §7.2 B2 · development vs production build** | — | _"no document says who decides"_ | **The first time a preview mounts in a development build.** `09` §12.1 makes editing-time `validate()` a dev-build assertion and `07` §4.3 splits its own behaviour on the same distinction. Two consumers, one undecided mechanism. **E15** rests on it. See C-16. |
| **`roadmap` §7.2 B8 · the editor's asset store** | — | _"stays unspecified until an editor exists in more than one deployment shape, at which point the answer is probably not one answer."_ | **At the first asset attach.** The gate is written to open _after_ the build, but the first deployment shape must still choose: **E13** must measure an asset the editor holds, and **E14** must copy it at export. The gate's wording defers the general answer; it does not defer the first one. See C-8, C-9. |
| **`roadmap` §4.3 · author-controlled cropping** | none | _"shipping with a default equal to the centre square. Without that default its arrival changes drawn output and breaks **R14**."_ | **At the `meta` key's V1 shape — and the build trips it by omission.** This gate is satisfiable only while V1 is being written. Ship the key with a centre-square default and the feature stays free forever; ship without it and its later arrival moves drawn output, making it a **major renderer bump** permanently. Doing nothing is the expensive choice, and nothing in the row says so. |
| **`roadmap` §4.3 · DPR-aware selection; recolourable tiles** | none / minor renderer bump | _"`srcset` / `sources` reserved"_; _"`markup` / `inline` reserved"_ | **At any `Drawable` or `meta` key V1 adds.** A reserved name is only reserved if V1 honours the reservation. `01` §10.2 owns the reserved-word list; **E4** already forbids the editor writing outside `07` §4.4's three keys, which protects the `meta` half. |
| **`roadmap` §7.2 B1 · provider memoization** | — | _"`08` leans yes without deciding."_ | **When the editor's provider is written** (`U-C14`). `09` §10.4 requires that provider to obey **R2** in V1, so V1 produces the second provider written to the obligation. B1 asks whether the component should enforce what providers are asked to promise; building one is what makes the question concrete. Not a blocker — the editor can simply obey. |
| **`roadmap` §5.5 · persisted editor state / B10** | editor-only, or `schemaVersion` bump — by shape | B10: _"an observation nobody can make before an editor exists"_ | **The first time a muted Operation is lost to a reload.** `09` §4.1 ships mute-by-removal in V1 with session-scoped state and records the cost. The gate is _the observation_, and V1 produces it by construction. See C-10. |

**Excluded, with the reason, so the omissions are visible:** `roadmap` §5.3's pixel-level compositing
artifact (gated on an artifact that is neither brittle nor a test of one implementation — the build
does not supply it, though §5.3's note gives it a second consumer in §5.5's image export); §4.2's
Selection-valued `ParamSpec` (gates composition, not V1 — but see C-4); §4.1's open attribute
registry (gated on reversing **D7**); §5.1's expression language and everything gated behind it;
§5.2 / B7's strictness relaxation (gated on _"a demonstration that the strictness is obstructive in
practice"_ — V1 is arguably that demonstration, but the gate opens only if the demonstration
happens, which is not something the build forces).

---

## 6. Cross-layer suspicions

`09` consumes all eight preceding documents and restates none of them, so most of what it asserts is
a claim about a document this session did not open. This section is long for that reason, and the
length is the split's cost made visible rather than a defect.

**Every entry is explicitly unverified.** None is a finding. Session D resolves them by opening both
sides.

### The highest-yield checks

> `09` §6.2 asserts _"`02` §12 gains this export"_, and `roadmap` §4.1 files `selection()` as _Raised
> by_ `02` §12 with the gate _nothing_. Whether `02` §12 carries the row, and whether it carries it
> as an extension point or as V1 work, determines whether **E8** has a specification or an
> aspiration. **Not verified — `02` not read this session.** [C-S1]

> **`07` §9.1 is described two ways inside this session's scope.** `00` §10.1: _"**`07` §9.1**'s
> first row still says the author _drags the design page width_, the premise `09` §9.2 withdrew and
> **E11** / **E12** replaced"_. `09` §9.2: _"`07` §9.1 already has exactly two rows, and preview
> width is the second"_ — and reproduces the table as correct. One says the table is stale, the
> other builds on it. **Not verified — `07` not read this session.** [C-S2]

> `09` §4.1 rests mute-by-removal entirely on **G3**: _"**G3** attaches an Operation's randomness to
> its `operationId` and `salt` rather than to its stack position — a muted-then-unmuted Operation
> draws exactly what it drew before."_ If **G3** is narrower than `09` reads it — if anything in the
> effective seed depends on stack index — muting silently moves the picture, and `09` §14's first
> row and `roadmap` B10 are both arguing about the wrong cost. **Not verified — `02` not read this
> session.** [C-S3]

> **Five resolutions `09` claims against out-of-scope documents.** §7.5 resolves `03` Q4; §7.6
> resolves `04` Q3; §9.4 resolves `04` Q4; §7.2 resolves `05` Q6; §7.3 resolves `07` Q6 and `08` Q6.
> Whether those tables record the resolution or still read _Open_ is the highest-yield sweep
> available to session D, given `00` §10.2's count. The two resolutions `09` claims against
> `roadmap` — Q1 at §15 Q7 and Q3 at §15 Q6 — **are** recorded on both sides, verified this session,
> which is weak evidence the others are too. **Not verified — `03`, `04`, `05`, `07`, `08` not read
> this session.** [C-S4]

> **E4**'s content is defined by a document out of scope: it binds _"the keys `07` §4.4 declares."_
> If `07` §4.4 ever declares a fourth key, **E4** moves without `09` changing, and `09` §10.3's
> three-row table and §12.2's diagnostic 7 move with it. **Not verified — `07` not read this
> session.** [C-S5]

> `roadmap` §4.1's note: _"**`05` §13 was missing the explicit-region row and now carries it.** …
> Amended 2026-08-06, verified by opening `05`."_ This is the class of claim `roadmap` §10 Q6 calls
> the document's characteristic failure, made by the pass that raised Q6. **Not verified — `05` not
> read this session.** [C-S6]

> `01` Q7, seen during the §13 lookup, states that the weight-walk rename owes _"Eight amendments …
> across `02`, `03`, and `04`"_, with **D3** rewritten in place. `00` §10.1 asserted `01` §13 still
> said **D3** was owed, and §1.3 above shows it does not. Whether the other eight have landed is
> unchecked, and `09` §7.6 is cited in Q7 as deciding evidence. **Not verified — `02`, `03`, `04`
> not read this session.** [C-S7]

> `09` §9.3 extends `02` §7.5's rule from one field to three — _"Three fields rather than one,
> because `columns` derives from all three and `02` §7.5 names only the first"_ — while calling the
> decision _"adopted unchanged."_ Whether that is an extension `02` should record, or a reading `02`
> already supports, is unchecked. **Not verified — `02` not read this session.** [C-S8]

### The five ownership claims that excuse a unit from carrying an invariant

Each of these is an acceptance criterion section 5 assigned to a document it did not open. Section
5.2 records why they are listed here.

> `U-C5` carries no invariant on the grounds that the preview constraint is `08` **S2**'s. `09` §5
> and `00` §4.4 both state **S2** as requiring the preview to be `<Tileset>` mounted on the editor's
> file. **Not verified — `08` not read this session.** [C-S9]

> `U-C8` carries no invariant on the grounds that `cellAt`'s correctness is `07` §8.2 / `08`
> **S10**'s. `09` §7.3 also inherits `07` §8.2's warning that this is _"the single most likely place
> to get the coordinate space wrong"_, and resolves `07` Q6 in passing. **Not verified — `07`, `08`
> not read this session.** [C-S10]

> `U-C10` carries no invariant on the grounds that palette order is **O6**'s and asset ordering is
> **D3**'s. `09` §7.6's entire presentation argument — a bar against a plain list — rests on those
> two taking opposite rules. **Not verified — `03`, `04` not read this session.** [C-S11]

> `U-C11` carries no invariant on the grounds that the accepted Blend set is ADR-001's and `04`
> §7.2's, computed from the registry rather than a hardcoded list, and that `tileId`'s type accepts
> `set` only. **Not verified — `04` and `/adr/001` not read this session.** [C-S12]

> `U-C9`'s `04` half: §7.4 attributes the two-handles-on-a-track presentation to `04` §6.1, the
> crossing handles to `04` §6.2, the collapse-to-one under `constant` to `04` §5.2, and diagnostic 9
> to `04` §6.2's `[0, 360]`-with-`steps` gotcha. **Not verified — `04` not read this session.**
> [C-S13]

> `U-C19` carries no invariant on the grounds that the error channel is `08` **S6**'s and the empty
> cell is `07` **R3**'s, with §12.3 adding only a prohibition on a preview placeholder. **Not
> verified — `07`, `08` not read this session.** [C-S14]

### The remainder

> `09` §5 asserts _"`08` §5.2 already gives the regeneration behaviour: `generate()` runs when
> `file.config`, `seed`, or `loadSalt` changes, and nothing else"_, which is what makes a
> weight-slider drag correct and cheap. **Not verified — `08` not read this session.** [C-S15]

> `09` §5's prop table omits `seed` so that _"the component falls back to `file.config.defaultSeed`
> (`07` §9.2)"_, while `00` §4.3 attributes the caller policy to `07` §9 and `roadmap` §4.3 says
> _"`07` §9's caller policy moves to the caller half"_ under a bare-grid split. Which document owns
> the fallback is unclear from outside. **Not verified — `07`, `08` not read this session.** [C-S16]

> `09` §7.1's four `ParamSpec` forms — `number`, `integer`, `enum`, `cellList` — must match `06`
> §7.4 exactly for **E9**'s totality to mean anything. `roadmap` §4.1's note independently gives the
> same four. **Not verified — `06` not read this session.** [C-S17]

> `09` §8.3 asserts `06` **C9** narrows `salt` to an integer in `[0, 2³²)`, and that the editor
> _"increments by one and wraps at `2³²`"_. Internally consistent — wrapping to `0` stays in range.
> **Not verified — `06` not read this session.** [C-S18]

> `09` §8.4 requires the editor to read _"the registry's `stochastic` declaration and never a
> hardcoded list of Source names"_, citing `04` §8.4 and `05` **X5**, and to leave an imported file's
> inert flag alone rather than clearing it. **Not verified — `04`, `05` not read this session.**
> [C-S19]

> `09` §8.5 attributes to `07` §9.3 the warning against `| 0` when drawing a `loadSalt` — _"coerces
> to `int32` and yields a negative number for half of all draws"_ — and to `08` **S7** the structural
> reason the value need not be redrawn. **Not verified — `07`, `08` not read this session.** [C-S20]

> `09` §10.4 requires the editor's provider to key on the `(tileId, assetId)` **pair** per `07`
> §4.1, because `06` §6 scopes `TileAsset.id` to its Tile. `09` §11.1's export directory structure
> mirrors the same key for the same reason. Both rest on `06` §6's scoping. **Not verified — `06`,
> `07` not read this session.** [C-S21]

> `09` §12.2's diagnostic 7 claims to be _"the only consumer of `meta.width` and `meta.height` in the
> entire package"_, computed against `07` **R8**'s centre-crop. A package-wide negative asserted from
> the last document in the chain. **Not verified — `02`–`08` not read this session.** [C-S22]

> `09` §12.4 places `06` §4.2's warning on the import screen and distinguishes
> `SCHEMA_VERSION_UNKNOWN` as meaning the file was written by a newer build (`06` §4.1), with **C6**
> forbidding partial import and **C7** supplying codes and paths. **Not verified — `06` not read this
> session.** [C-S23]

> `09` §14.1's image-export argument rests on **R15** shipping exact geometry and transform vectors,
> `07` §6.4 naming `preserveAspectRatio="xMidYMid slice"`, **R10** being satisfied by DOM document
> order via `08` §4.2, and **R9** being one `clipPath`. `roadmap` §5.3's note repeats the chain.
> CLAUDE.md corroborates **R15**, but CLAUDE.md is not the specification. **Not verified — `07`,
> `08` not read this session.** [C-S24]

> `09` §3's first table row asserts the derivation gives `originX ≤ 0` and therefore no gutters,
> which is `07`'s geometry read from `02` §7.1's parity correction. **E1** row 1 and `06` §10.4's
> fourth diagnostic both depend on it. **Not verified — `02`, `07` not read this session.** [C-S25]

> `09` §6.2 requires `selection()` to resolve _"the Operation's effective seed per `02` §6.7 and its
> selection channel per `04` §4.3"_, and to be total and unbounded in `(x, y)` matching `07` §8.2's
> reasoning for `cellAt`. Three documents constrain one signature. **Not verified — `02`, `04`, `07`
> not read this session.** [C-S26]

> `09` §12.2's diagnostic 5 fires when the document is _"legal but has nothing to draw — empty
> `tiles` or `operations`"_. Whether `06` permits an empty `tiles` array is unchecked; §10.1 says
> only that a Tile has at least one asset. **Not verified — `06` not read this session.** [C-S27]

> `roadmap` §4.3's reserved names (`srcset`, `sources`, `markup`, `inline`) and §9.2's reservation of
> _breakpoint_ for `06` §12's `layouts` are claims about `01` §10.2's reserved-word list. `09` §9.2
> repeats the `breakpoint` reservation. **Not verified — `01` §10.2 not opened this session.**
> [C-S28]

---

## 7. Needed but not read

What this session wanted from outside its scope, by document and section. Listed so the split's cost
stays visible.

**`02-generation-contract.md`** — §6.4 (the two reroll affordances behind `09` §8.1's table), §6.6
(the memorable-seed form, C-12), §6.7 (effective seed, for `selection()`), §7.1 (the `columns`
derivation **E12** re-runs and **E1** rows 1–2 depend on), §7.3 (the field division `09` §9.1
re-divides), §7.5 (the destructive-edit rule `09` §9.3 extends from one field to three), §7.4 (the
coercion precedent §7.5 invokes), §10.1 (the known-bad precedent `roadmap` A1 offers), §12 (whether
`selection()` and `generateRegion` are there), **G3** (mute-by-removal's whole basis), **G5**.

**`03-domain-model.md`** — §4.1 (zero weights), §4.2–§4.3 (**D3**'s canonical order, and the weight
walk after `01` Q7's rename), §5.4 (the open domains behind `09` §7.5's tracks, and flip as a
negative), §5.5 (the lossy clamp `roadmap` §4.1 says `min`/`max` would recover), §6.4, §8, **D1**,
**D3**, **D5**, **D7**, **D10**, **D11**, Q4.

**`04-operations.md`** — §4.2 (`rect`'s half-open bounds and out-of-grid extent), §4.3 (the selection
channel), §4.4 (procedural vs coordinate-bound, which **E12** and §9.4 both turn on), §4.5, §5.1
(spanning-Source normalization, §14.2's premise), §5.2, §6.1–§6.4 (mapping presentation, reversal,
`null` entries, palette order), §7.1–§7.2 (Blend partiality, `tileId`'s type, vetoes), §8.2–§8.4
(the load dimension), §10, **O2**, **O4**, **O6**, **O7**, Q3, Q4, Q8, Q9.

**`05-extension-model.md`** — §3, §3.1 (the non-goal `09` §3.1 says its posture does not touch),
§4.2, §4.4, §5.1 (`ParamSchema`'s three consumers, and the `cellList` flag), §6.1 (_"reads as a
broken engine rather than a mislabelled Source"_, which §8.4 and §8.5 both invoke), §6.2, §6.3, §10.2
(the minor-bump rule every `roadmap` cost cites), §10.3, §11, §13, **X3**, **X5**, **X6**, **X7**,
**X8**, **X9**, Q2, Q3, Q5, Q6.

**`06-config-schema.md`** — §3–§3.4 (the file's shape, and why `loadSalt` has no slot), §4.1–§4.3
(`schemaVersion`, the newer-build warning, the bump table), §4.4, §5.1 (defaults, and the `steps`
exemption `09` §11.3 relies on), §5.2, §5.3 (generated ids, `Tile.name`'s deliberate freedom), §6
(Tile and asset shape, and `TileAsset.id`'s scoping), §7.2–§7.4 (`ParamSpec`'s forms, and
package-internal), §9.1–§9.2 (strictness, coercion), §10–§10.4 (validation, the error vocabulary,
and the four advisories), §12, **C1**–**C10**, Q4, Q12.

**`07-render-contract.md`** — §2, §3, §3.1, §4.1–§4.4 (the provider contract, the error posture, and
`meta`'s three keys — **E4**'s actual content), §5, §5.3, §6.4 (crop), §8.1–§8.2 (`cellBox`,
`cellAt`), §9.1 (**the table `00` §10.1 and `09` §9.2 disagree about**), §9.2–§9.3, §10 (the applier
contract), §11.2–§11.3, §13, **R1**–**R5**, **R8**–**R15**, Q1, Q5, Q6.

**`08-renderer-svelte.md`** — §2, §3, §3.1 (the split-props rejection `09` §4.1 argues from), §3.4
(the never-invalid obligation **E5** implements), §4 (props), §4.2, §4.3 (the default provider),
§4.5 (decorative output, and the refused grid callback), §5.2 (regeneration triggers), §7 (the
exported surface and the render box element), §8, §10, **S1**–**S8**, **S10**, Q1, Q3–Q6.

**`/adr/001`** — the inverted **O7** that `09` §7.7's Blend control and `roadmap` §4.1's `min`/`max`
row both depend on. **`/adr/002`** — cited in `09`'s header and in `01` §13's rewritten-in-place list;
its content is unknown here.

**`01-glossary.md`** — §10.1 (rejected forms, for any name this audit's units would coin), §10.2
(reserved words, for C-S28), §10.3, §11.2 (the marker definitions `roadmap` §3.1 says it misread),
§11.4, §11.5. Only §13 and the adjacent §14–§15 were opened.

**`_harvest.md`** — cited by `00` §10.2, `09` Q11, and `01` Q9 as the source of two corrections and
one structural gap. Not read; not in any session's list in `00-method.md`.

**`audit/a-engine.md`, `audit/b-render.md`** — deliberately not read, per the method. Their contents
bear directly on section 6's twenty-eight entries and on §1.3's refusal to claim an ordinal.
