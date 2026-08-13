# Decisions

Append-only. One entry per answer: the date, the question, the answer, and the step it
arose in. Nothing else references this document.

It records **only what the specification does not answer.** Where the spec answers a
question, the citation belongs in the code, not here.

---

### 2026-08-10 — Build `selection()`, or ship without the overlay?

**Arose in:** planning, before Step 0.

`09` §6.2 and E8 require the editor's overlay cell sets to come from an engine export that
was not built. The alternative was shipping manual selection with no overlay.

**Answer:** build it. `02` §12 already carries the export as required, so this is
spec-mandated work rather than a new surface, and E8 forbids the second implementation
that the alternative would eventually invite.

---

### 2026-08-10 — Where does a dropped asset live before export?

**Arose in:** planning, for Step 4. `09` §15 Q8 leaves it open — "IndexedDB, the file
system, a server".

**Answer:** an in-memory `Blob` plus `URL.createObjectURL`, session-scoped, keyed on the
`(tileId, assetId)` pair. `meta.src` is written to its export path and the editor's
provider bridges the two, which is the bridge `09` §11.2 describes. Nothing persists
across a reload.

---

### 2026-08-10 — Does the editor read a file back?

**Arose in:** planning, for scope.

**Answer:** export ships, import does not. Import requires `validate()` (`09` §12.4, `08`
**S3**, `06` **C6**), which `CLAUDE.md` defers deliberately. The round trip is therefore
one-way in v1: every session starts from a new document.

**Consequence, recorded because it is easy to forget:** E15's development-build assertion
— `validate()` run after every transition — is not available, so E5 is held by discipline
rather than by a check.

---

### 2026-08-10 — Is there a `yOffset` control?

**Arose in:** planning, for Step 2.

`06` §8 makes `yOffset` a required `Layout` field. `09` §9.1's table of controls does not
list it, and no other control reaches it.

**Answer:** yes, a numeric control beside `cellSize`. This is an addition to §9.1's table,
made deliberately, because the field is required and would otherwise be frozen at whatever
a new document starts with.

---

### 2026-08-10 — Undo?

**Arose in:** planning, for Step 10.

**Answer:** yes — a stack of whole `TilesetFile`s, per `09` §4.4 and **E6**. §9.4 makes
undo *the repair* for the destructive edit of §9.3, which is in scope via **E12**, so
shipping E12 without E6 would ship the destructive action with its specified remedy
missing.

---

### 2026-08-10 — A new document's numbers

**Arose in:** planning, for Step 1. `08` §3.4 requires a document to "begin life as a valid
skeleton"; no spec document supplies the numbers.

**Answer:** `cellSize: 100`, `referenceWidth: 1000`, `rows: 5`,
`horizontalAlignment: "gutter"`, `yOffset: 0`.

`02` §7.1 then derives `ceil(1000 / 100) = 10`, which is already even and so takes no
parity correction: `columns: 10`, grid width 1000, **no bleed**. A new document is a grid
that exactly fills its box, and the bleed of `02` §7.2 appears the moment the author
touches the design width.

**These are UI constants with no authority anywhere** and nothing cites them.

---

### 2026-08-10 — When does a half-built Operation reach the file?

**Arose in:** planning, for Step 6. The create-operation workflow has four steps, so
between them the Operation is incomplete; **E5** forbids an illegal file at any instant,
and `09` supplies no default Selection type, Source type, or Target.

**Answer:** the draft lives in transient UI state and commits to the file as one
`TilesetFile -> TilesetFile` transition when complete. This is E5's own rule for text
inputs — "in-flight input lives in the input control and reaches the file only when it
parses" — applied to a compound value. The `Operation.id` is generated up front and never
reassigned (`09` §4.3).

**Consequence:** the Step 8 overlay calls `selection()` against a shadow config,
`{ ...config, operations: [...operations, draft] }`, because the export resolves an
Operation by id and the draft is not in the file yet. A pure local value; it touches
nothing.

---

### 2026-08-10 — Step order inside the create-operation workflow

**Arose in:** planning, for Step 6.

The requested order is Selection → attribute → Source → Blend, with the mapping folded into
the attribute step per `09` §7.4. But two spec rules make the mapping control depend on the
**Source**, which comes after it: §7.4's collapse to a single handle under `constant`, and
§7.6's advisory about a reordered palette under `random`.

**Answer:** keep that order, and make the mapping control live — it re-collapses when the
Source changes. The four steps stay navigable after the fact rather than forming a one-way
wizard.

---

### 2026-08-10 — How does export produce a folder?

**Arose in:** planning, for Step 11. **E14** requires a `TilesetFile` and an asset folder
*together*; a browser cannot write a folder unaided, and `09` §11.1 does not say how.

**Answer:** a zip, via `fflate` — the repo's first runtime dependency. Rejected: the File
System Access API (Chromium only, so a Chrome-only editor) and N separate downloads (the
author reassembles the folder by hand, which reopens the exact hole §11.1 exists to close).

---

### 2026-08-10 — Does the reroll button wrap or saturate at 2³²?

**Arose in:** planning, for Step 9.

`09` §8.3 answers it — "The editor increments by one and wraps at 2³²" — so this is not an
open question. It is recorded only because the literal `2**32` appears in editor code and
every numeric constant there owes an entry.

**Answer:** wraps, per §8.3.

---

### 2026-08-10 — What does `selection()` do with an unresolvable `operationId`?

**Arose in:** Step 0. `09` §6.2 gives the signature and says nothing about the case.

**Answer:** it throws. Raised at the Step 0 boundary and confirmed there.

The alternative is a predicate answering `false` everywhere, which draws an empty overlay —
indistinguishable from a Selection that legitimately matches nothing, on the one screen
where the author is judging exactly that. It is `05` **X7**'s reasoning applied to an id
rather than to a type name: a plausible-looking wrong answer with no error anywhere is
worse than a stack trace.

Implemented in `packages/tileset/src/selection.ts` and asserted in `selection.test.ts`.

---

### 2026-08-10 — The memorable seed's word lists and number range

**Arose in:** Step 1. `09` §8.2 requires "a generated memorable seed in
word-word-number form" and supplies no words and no range.

**Answer:** 24 adjectives and 24 nouns in `apps/editor/src/seed.ts`, and a number in
`[0, 100)`. Short, unambiguous spoken aloud, needing no escaping anywhere.

**These carry no authority and nothing cites them.** No output depends on which words are
in the lists: a seed is a string, every string hashes (`02` §6.6), and adding or removing
a word moves no picture. `06` §5 constrains `defaultSeed` only to length ≥ 1.

---

### 2026-08-10 — How dropped files group into Tiles

**Arose in:** Step 4. `09` §10 specifies what an attach *writes* (**E13**) and says nothing
about the gesture that starts one.

**Answer:** two drop targets. Dropping on the library background creates one Tile per
file, each with a single asset. Dropping onto an existing Tile adds those files as further
assets of it.

Both gestures have to exist regardless — `03` §4.1 requires at least one asset per Tile,
and `09` §10.1 makes a Tile's assets variants of one family — so this is the rule that
reaches both with one thing to learn.

---

### 2026-08-10 — The generated id scheme

**Arose in:** Step 4. `09` §4.3 requires `Tile.id` and `TileAsset.id` to be generated and
never authored, matching `[A-Za-z0-9_-]+` and excluding the colon (`06` **C10**). It does
not say what they look like.

**Answer:** opaque counters — `t1`, `t2`, … for Tiles and `a1`, `a2`, … within each Tile.

The alternative was a slug of the name, which reads better in the `tiles/<tileId>/<assetId>.<ext>`
export path of §11.1. It loses to §4.3's other half: an id is "assigned at creation and
**never reassigned**", so a name-derived id disagrees with its own Tile the first time the
author renames it — and §10.1 forbids the editor from ever blocking a rename. An id that
is meaningless is never wrong.

---

### 2026-08-10 — Deleting a Tile a palette references

**Arose in:** Step 4. `09` §4.2 permits **either** behaviour: such a deletion "either
removes those entries in the same transition or is refused with the references named".

**Answer:** refused, with the referencing Operations and palette entries named.

Both satisfy E5 — what §4.2 forbids is the deletion *landing* as a dangling `tileId` and
waiting for validation to notice. Refusal is chosen because until **E6**'s undo arrives at
Step 10 there is nothing to reverse a cascade with, and a cascade edits Operations the
author was not looking at.

---

### 2026-08-10 — Where a bounded integer stops being a slider

**Arose in:** Step 6a. `09` §7.1 maps a bounded integer to "a slider with integer steps, **or
a stepper where narrow**" and does not define *narrow*.

**Answer:** five or fewer admissible values becomes a segmented stepper; more becomes a
slider. `octaves` (`1–3`) is the only V1 parameter it decides.

Also a UI constant: a slider over a `number` with both bounds gets 100 positions. Typed
entry stays exact either way, so the granularity decides feel and nothing else.

---

### 2026-08-10 — The preview width control's minimum and its presets

**Arose in:** Step 3. `09` §9.2 specifies the control's *obligation* — it sets `Wpx` and
writes no field (**E11**) — and says presets "carry no spec content". It supplies no
minimum width and no preset values.

**Answer:** a minimum of 160 px, and presets 375 / 768 / 1024 / 1440 plus *fill*.

The minimum exists so the two handles cannot be dragged past each other, **not** because
any width is illegal: `07` §5.3 makes the layout correct at every `Wpx`, with no minimum
anywhere in the contract.

**The presets are deliberately not called breakpoints.** §9.2 reserves that term for `06`
§12's `layouts` extension point. These select a preview width and nothing in the file
responds to them; a breakpoint would eventually select a `Layout`.

---

### 2026-08-10 — A preview width wider than the editor's own column

**Arose in:** Step 3, corrected during Step 6a. `09` §9.2 requires the control to set `Wpx`
and says nothing about a `Wpx` larger than the room the editor has.

**Answer:** `Wpx` is **not clamped**. The frame is laid out at the requested width and the
whole render box is scaled down for display, with the readout naming both — *render box
1440px · shown at 60%*.

The first version clamped instead, so asking for 1024 in an 866px column silently produced
an 866px preview. That is `07` §3's stated worst outcome in miniature: the author approving
a composition at a width the file was never asked about. `07` §5.3 is what makes the zoom
exact rather than approximate — every horizontal quantity is a fixed fraction of `Wpx`, so
the box at 1440 *is* what a 1440px viewport shows, shrunk.

**The display zoom is not `s`.** `s = Wpx / referenceWidth` lives inside the component and
turns design px into render px. The zoom is the editor fitting a finished render box onto
the author's monitor. Two scalings; conflating them would mean reporting a `Wpx` the
component never saw.

**It follows into Step 7.** Converting a pointer event to render space — `07` §8.2's
explicitly-assigned caller work, and "the single most likely place to get this wrong" — must
divide by the zoom before reaching `cellAt`. The drag handles already do.

---

### 2026-08-10 — Dragging one edge moves both

**Arose in:** Step 3. `09` §9.2 requires a drag handle and says nothing about its geometry.

**Answer:** the frame stays centred and dragging either edge outward by `d` moves the
other outward by `d`, so the width changes by `2d`.

Beyond matching how a browser's responsive mode feels, the centring is load-bearing for
what the author is judging: `07` §5.2 centres the grid on the render box's **centre axis**,
and that axis is what `horizontalAlignment`'s parity is about. A frame that grew from one
side would move the axis under the author while they were looking at the alignment.

---

### 2026-08-10 — The editor's dev-server port

**Arose in:** Step 1.

**Answer:** 5174. `apps/demo` holds 5173, so the two run side by side. A development
convenience with no spec content; recorded only because it is a numeric constant in editor
code.

---

### 2026-08-10 — What happens to the Blend when the Target changes?

**Arose in:** Step 6c. `04` §7.2 gives every Target a default Blend and `09` §7.7 requires
that default to be *shown*, but the accepted set is the **Target's** (**O7**) — so
retargeting can strand a Blend the new Target does not accept. `multiply` on `scaleX`,
retargeted to `rotation`, is §7.2's own vetoed pair. No section says which of the two wins.

**Answer:** a Blend the new Target still accepts is kept; one it does not falls back to that
Target's declared default. A Target chosen for the first time therefore arrives with its
default, which is what gives §7.7 something to show.

Rejected: resetting to the default on **every** retarget, which is simpler and throws away a
choice the author made for no reason — switching `scaleX` to `scaleY` would silently undo an
`add`. Also rejected: leaving the stranded pair and letting the commit gate refuse it, which
is `06` **C6**'s error vocabulary doing an editing job **E5** assigns to the transition.

**Consequence:** `blend` is the one draft field with a default, and that is not Q7's invented
default reappearing. A Selection type, a Source type and a Target have no default anywhere in
the spec, so picking one would be the editor deciding what the Operation does; a Blend's
default is in `04` §7.2's table.

---

### 2026-08-10 — Where the create-operation workflow commits

**Arose in:** Step 6c, as the last thing the four steps needed to be worth walking.

**Answer:** a single **Add operation** button in the draft panel's footer, enabled only when
`isComplete`, applying `addOperation` — one `TilesetFile -> TilesetFile` transition, per Q7
above.

Recorded not because the mechanism was open — Q7 fixed it — but because the *affordance*
was: the panel is a rail of four navigable steps rather than a wizard, so there is no final
step whose "next" doubles as the commit. The button therefore names what is still open rather
than being disabled silently.

---

### 2026-08-10 — Does the seed field trim?

**Arose in:** Step 9's seed field, pulled forward. `09` §8.2 says the author "types a string"
and `06` §5 constrains `defaultSeed` only to length ≥ 1. Neither says what to do with
surrounding whitespace.

**Answer:** trim, and refuse a value that is empty afterwards.

`02` §6.6 hashes the string, so `"sunset "` and `"sunset"` are **two different pictures
separated by a character that is not visible in the field**. That is the failure `06` §5.2
describes in the reroll control — the config visibly changes and the picture does not — with
the sign reversed: here the config looks unchanged and the picture moves.

The refusal is **E5**'s boundary, not a validation: an empty field is in-flight input that
has not parsed yet, so it stays in the control and the file keeps its previous seed.

---

### 2026-08-10 — A light editor, and a white render box

**Arose in:** after Step 8, on request.

`09` §3.1 puts appearance outside the specification — "this document specifies affordances and
their obligations, not their appearance" — so the theme is recorded here only for the one
choice that is *not* cosmetic.

**Answer:** the render box's background is `#ffffff`, not the editor's off-white page colour.

`07` §4.5 makes tileset output decorative: it is drawn over whatever a host page puts behind
it. A tinted preview has the author judging every tile's edge, and every `opacity` value,
against a colour no visitor gets — `07` §3's worst outcome in its mildest form. The dashed
outline is the editor saying where the box ends; the box itself says nothing.

---

### 2026-08-10 — The overlay draws the painted cells, not the brush

**Arose in:** Step 8, which subsumed part of Step 7.

Step 7's brush drew the cells it had painted, by reading its own `cellList` back. Step 8's
overlay draws the cells a Selection includes, by asking the package.

**Answer:** one drawing, and it is the overlay's. **E7** admits "exactly one kind of overlay",
and a `cellList`'s selected set is that overlay like any other Selection's. The brush keeps
the gesture — the pointer, the stroke, and a hover outline for the cell that would be affected
— and draws no painted cell at all.

Keeping both would have been the drift **E8** exists to prevent, reached from inside a single
component rather than across two: `cellList`'s predicate is a membership test, so the two
drawings agree today, and nothing would report it the day a `cellList` gained an option that
made them disagree.

---

### 2026-08-11 — Where the four reroll affordances live

**Arose in:** Step 9. `09` §8.1 tabulates four controls and says what each writes. It does not
say where any of them sits.

**Answer:** the per-Operation ones go on the Operation's row in the stack — the reroll button
and, where offered, the `reseedOnLoad` checkbox. The three config-level ones — asset reroll,
`reseedAssetsOnLoad`, and the load preview — join the seed field in one panel, because §8.1's
table *is* that panel: they are the four things that vary a picture without changing what it
is made of.

Appearance only, under §3.1, and recorded because the grouping asserts something: it puts the
one control that writes **no field** (the load preview) beside three that do, and its readout
has to say so.

---

### 2026-08-11 — The overlay is drawn at the previewed `loadSalt`

**Arose in:** Step 9, and it is a correction to Step 8 rather than a new question.

`09` §6.2 requires it outright — `selection()` "resolves the Operation's effective seed per
`02` §6.7 and its selection channel per `04` §4.3, so a `random` Selection's overlay matches
the cells the Operation will actually act on, **including under a set `reseedOnLoad` flag at
the previewed `loadSalt`**".

Step 8 shipped before the load preview existed, so the overlay passed the default `0`. It now
takes the same `loadSalt` the component does.

**Recorded because the failure is silent:** with a flagged Operation and a fresh load previewed,
the picture would move and the overlay would not — the author would be told the Operation acts
on cells it visibly does not. That is `07` **R1**'s argument about coordinate drift, arriving
through the seed instead of through the geometry.

---

### 2026-08-11 — A Selection declares whether it is coordinate-bound

**Arose in:** Step 10. **E12** requires confirmation "whenever the config holds a
coordinate-bound Selection", and `04` §4.4 supplies the table — procedural: `all`,
`checkerboard`, `everyNth`, `random`; coordinate-bound: `rect`, `cellList`. Nothing said where
the editor should learn it from.

**Answer:** a `coordinateBound` field on `SelectionRegistration`, declared by all six. An
engine change, and the second one this build has made after `selection()` and the exposed
render box element.

It is **X5's reasoning transplanted**: Sources already declare `stochastic` rather than letting
the editor hold a list of names, because the registry is open and a Source registered later
would be classified by a list that had never heard of it. The Selection case is worse, not
better — an unclassified Selection defaults to *procedural*, which silently exempts it from the
one confirmation that protects it.

Rejected: deriving it from the `ParamSchema`. `everyNth`'s `offset` and `rect`'s `y` are both
bounded integers, and nothing in the schema separates *a rule's parameter* from *a coordinate*.

Safe as a required field because `05` §5 gives the registry **no public registration API**: every
registration is in this repository.

---

### 2026-08-11 — The orphan advisory asks the predicate, not the parameters

**Arose in:** Step 10, for §9.4's step 2.

To report that a `rect` "now lies outside the grid", the obvious move is to compare its `x` and
`width` against `columns`.

**Answer:** don't. Count the cells the Operation's own predicate matches, through `selection()`.

Comparing coordinates would be a second implementation of `rect`'s half-open bounds, written in
the one place nobody would think to check it against the first — **E8**'s failure exactly, and
`07` **R1**'s argument one layer out. Asking the predicate also works for every coordinate-bound
Selection with nothing written per type, including ones registered later.

**What the count means differs by Selection, and only in the wording** (`04` §4.4): a `cellList`
has a countable authored extent — its parameter *is* the list — so it is told how many entries
became unreachable. A `rect` has none, because `04` §4.2 lets it extend past the grid on
purpose, so overhang is not a defect and only *reaches nothing* is reported.

---

### 2026-08-11 — The undo stack's depth, and where its logic lives

**Arose in:** Step 10.

**Answer:** 100 files. A **UI constant with no authority**; `09` §4.4 sets no bound. It exists
because §5 notes a slider dragged across a frame changes the file on every frame, so an
unbounded stack holds every intermediate value of every drag for the session.

**A refusal pushes nothing.** A transition that declines returns its input unchanged (**E5**),
so pushing it would leave an entry that undoes to the state it is already in. The check is
reference equality, which is exact rather than approximate here: every transition is
whole-value.

**The rule lives in `history.ts`, the rune in `session.svelte.ts`** — the same split
`draft.svelte.ts` and `drafting.svelte.ts` take, and for the same reason: `vitest.config.ts`
runs without the Svelte plugin, so a module holding a rune cannot be imported by a test. E6 is
the invariant §9.4 makes the *repair* for the one destructive edit, which is too load-bearing
to leave untested for the sake of one less file.

---

### 2026-08-11 — The export path comes from `meta.src`, not from a second construction

**Arose in:** Step 11. **E14** requires every `meta.src` to be "a path relative to that folder's
root", and `assets.ts` already builds that path at attach time. The obvious move when writing
the zip is to build it again from `tileId`, `assetId` and the extension.

**Answer:** read `meta.src` back and use it verbatim as the entry's path.

Rebuilding it would be a second implementation of §11.1's layout, and the failure is silent in
the worst way: the file points at one path, the folder holds another, and nothing notices until
a consuming site shows a missing tile. That is `07` **R1**'s argument — one implementation of a
mapping, because two drift where nobody is looking — applied to a string instead of to
geometry.

Reading it back also makes E14 true *by construction* rather than by two pieces of code
agreeing.

---

### 2026-08-11 — Export refuses rather than shipping an incomplete folder

**Arose in:** Step 11. `09` §11 says what the export contains and not what to do when it
cannot be assembled.

**Answer:** throw, with the citation, and surface it beside the preview. Three cases:

- **An asset with no `meta.src`** — the file could not point at its own bytes.
- **Two assets claiming one path** — reachable only by a hand-edited `src`, and one picture
  would overwrite the other. The collision §11.1's directory structure exists to prevent,
  arriving by a different route.
- **An asset whose bytes are gone** — the store is session-scoped (§15 Q8), so a reload
  between attach and export reaches this.

Skipping the entry instead would ship a folder quietly missing a file. That is `07` **R3**'s
substitution problem moved into the artifact, and it is strictly worse there: in the editor a
missing asset fires `onAssetError` and lands in §12.3's failure list, where a human is present.
In an exported zip nothing ever fires.

**The bytes that ship are the bytes the author dropped.** No canvas re-encode: it would change
the picture the preview approved, and `roadmap` §4.4 keeps optimization in the pipeline.

**Not refused:** a document that draws nothing. That is legal (**G4**), it is §12.2's fifth
advisory, and **E16** forbids an advisory from blocking an action.

---

### 2026-08-11 — Collapsed panels are per-session, and the shell is full-height

**Arose in:** the editor layout rework. `09` §2 sends "visual design, layout of panels" to
*nowhere* and §3.1 repeats it, so the shell itself needs no entry. What does is where the
collapsed state lives, because `09` §12 has an opinion about it.

**Answer:** a rune in `lib/Section.svelte`, per-session, written nowhere.

§12 lists **persisted editor state — collapsed panels, muted Operations, selection** as
`[POSTPONED]`, and names all three candidate homes as unavailable: a sidecar file is an
artifact `06` does not know about, a top-level `editor` block is a `schemaVersion` bump for a
key no consumer reads, and `meta` is forbidden by **E4** because **R4** makes it permanent. So
the state is transient by the same reasoning that made §12 postpone it, not by oversight — a
panel opens where its component says it opens and a reload starts over.

**The `open` prop seeds the state once and is never read again.** A reactive prop would reopen
a panel the author had just closed, every time the parent re-rendered.

**Why the shell is 100vh with two independently scrolling columns:** the preview is the only
thing every sidebar control is judged against, and a document-height page put it off screen
exactly when the author was editing the Operation that changes it. That is **S2**'s single live
preview defeated by layout. Nothing in the package depends on the arrangement.

---

### 2026-08-12 — An Operation is edited in place, through the panel that creates one

**Arose in:** the first round of additions after the editor's plan finished. `09` has no §15
question about editing an existing Operation, and the spec answers none of what follows.

**Answer:** the four-step panel opens on an existing Operation and commits through
`replaceOperation`. The **id survives** (§4.3 — "assigned at creation and never reassigned"),
and with it the Operation's hash channels; so do its index in the stack, its `salt` and its
`reseedOnLoad`.

**Why in place rather than delete-and-rebuild**, which is what the editor forced before: a
rebuilt Operation gets a *new* id, and **G3** attaches the randomness to the id. Changing one
parameter of a `random` Operation moved every cell it touched, for a reason invisible from the
control the author used. The edit is now what it claims to be — the picture moves by the
parameter that changed and by nothing else.

**Why the same panel, and not a second one.** `09` §6.1 already describes the overlay as
belonging to "the Operation being edited". Reading the create workflow as one case of editing
costs a draft constructor and a branch at commit; two panels would be **E8**'s second
implementation of the same rules, drifting apart from the first parameter added to a registry.

**Salt and `reseedOnLoad` move into `Draft`.** They were literals in `toOperation`. Left as
literals, every edit would silently reset a reroll the author had just made from the stack row
— `05` §6.1's complaint, in the one gesture whose whole point is that it changes nothing else.
They are *carried*, not authored: no step of the workflow offers a control for either, and
§8.3's reroll stays where it is.

**The shadow config replaces rather than appends.** An edit-draft's id is already in
`config.operations`, and `selection()` resolves an Operation *by id*, so appending would put
two Operations with one id in a stack and the overlay would resolve the unedited one — drawing
the Selection the author is in the middle of changing away from. The same expression serves a
creation, whose id matches nothing and falls through to the append. `toShadowOperation` carries
the real salt for the same reason: **O4**'s closure reads it.

**A stale edit-draft is discarded, not converted.** The Operation being edited can leave the
stack while its panel is open — removed from its row, or undone away, since §4.4 restores a
whole `TilesetFile` and the draft is deliberately not rewound with it. Committing then runs
`replaceOperation` against an id matching nothing: a no-op `session.apply` declines to push, so
the button would appear to work and do nothing. Falling back to `addOperation` would resurrect
what the author deleted. §4.4 refused to guess on the author's behalf once already.

**Still not in this version:** reordering. `document.ts` notes that `moveOperation(id, index)`
drops in beside the existing transitions with nothing else to change. Editing does not need it,
and `replaceOperation` preserving the index is what keeps them separate questions.

---

### 2026-08-12 — What an import reads, and what it refuses

**Arose in:** building import, which `09` §12.4 specifies the *policy* for — validate, refuse on
any error, no partial import, no preview — while leaving the mechanics open.

**Answer:** the exported `.zip`, or the folder it unzips to. Not a bare `tileset.json`: without
its pictures the document loads and every cell draws nothing, and the two inputs the author
actually has after an export are the archive and the folder.

**Assets are matched by reading `meta.src` back, never by parsing the path.** `export.ts` already
writes each entry at the path it read out of `meta.src`, on the grounds that a rebuilt path would
be a second implementation of §11.1's layout. Parsing `tiles/leaf/a1.png` back into a pair would
be a third, and it would be wrong for exactly the file where being wrong is hardest to see — one
whose `src` a human has edited. The document says where its bytes are.

**The document drives the walk, not the folder.** Iterating `tiles/` would attach files the
document does not reference: a stale image in a hand-assembled folder would arrive as an asset of
a Tile that does not claim it, with no way to say which. Walking `config.tiles` gives every entry
its `(tileId, assetId)` pair by construction.

**A missing or undecodable picture is an advisory, not a refusal.** `06` §10.4's principle applied
to the archive rather than to the file: such a document is still a legal `TilesetFile`, and one
the author repairs by dropping the image back in. Refusing would throw away the operations, the
seed and the layout over a picture. The empty cell is `07` **R3**'s honest hole.

**A JSON syntax error is not a `ValidationError`.** `06` §10 keeps them apart — "JSON syntax
errors belong to whoever called `JSON.parse`" — so they surface as their own message rather than
in a list `09` renders against fields.

**The folder path is the one genuinely new mechanic.** `webkitGetAsEntry()` must be called on
every item *before the first `await`*, because a `DataTransferItem` is invalidated once the
handler yields; and `readEntries` returns in **batches** and must be called until it yields an
empty array, or a folder of more than about a hundred files silently truncates. Both would
present as an import that lost pictures with no error anywhere.

---

### 2026-08-12 — An import replaces the store in one swap, and is undoable

**Arose in:** the same step. `09` §15 Q8 leaves the asset store's home open and says nothing about
replacing all of it at once.

**Answer:** `session.open(file)` via `replaced`, exactly as `reset()` does, so **E6** covers it —
an import replaces everything the author had, which makes it the action that most needs to be
reversible. It is a replacement rather than a transition because there is no function from the
outgoing file to the incoming one, and writing `() => file` would put something on the stack that
ignores its argument.

**The asset store is swapped in one call, not cleared and refilled.** The store is keyed on the
`(tileId, assetId)` pair, and `ids.ts` allocates `t1`, `t2`, … in every session — so two
independently built documents collide almost by construction. Clearing *after* attaching would
revoke the URLs just created; clearing *before* would empty the store behind a mounted preview and
leave the author with a blank document if the incoming assets then failed to decode. So the new
attaches are built to the side and swapped in, and the old URLs are revoked only once the swap has
happened. Until that instant the outgoing document is intact and drawing, which is what makes
attempting an import safe at all.

**Undo restores the previous document but not its bytes.** They lived in the session store outside
the file and were swapped with it. That is Q8's session-scoped store showing through — the same
gap a reload has always had — and not a defect in the undo stack.

**Placement:** an ordinary `<Section>` at the end of the sidebar scroller, not pinned beside the
export button. The export is pinned because it is "the one action that ends the session". An
import starts one.

---

### 2026-08-12 — Migration is a separate function, and an older file is never refused

**Arose in:** an author trying to open a file exported before ADR-005 and being told
`SCHEMA_VERSION_UNKNOWN`. `06` §4.3 names "the migration table" while leaving it undefined,
because until ADR-005 there was nothing to migrate from.

**Answer:** `migrate(file) -> MigrationOutcome` in the engine, run **before** `validate()`, with
a table whose only row today is v1 → v2 and whose content is *nothing to do*.

**Why not inside `validate()`.** `06` §9.2 is categorical — *validation never coerces* — and
rewriting a file's `schemaVersion` is a coercion. Putting it there would make that rule a rule
with an exception, in the one function whose whole value is that it has none. `validate()` is
untouched by this change and still knows exactly one version.

**Why migration does not validate either.** A migrated file is *shaped for* this schema, not
proven legal by it. A migration that also validated would make `validate()` reachable by two
paths with two answers — the second source of truth **C8** rejects one level down. Concretely: a
v1 file that is invalid for an unrelated reason still migrates, and then fails validation at the
real problem's own path rather than having the version stand in for it.

**Four outcomes, kept distinct because they take four different actions.** `current`,
`migrated`, `newer`, `unrecognized`. The last two were the ones being conflated: `09` §12.4
words its *update the editor, not the file* screen for a file from a **newer** build, and
inferring that from a `SCHEMA_VERSION_UNKNOWN` in the error list applied it to **older** files
too — telling an author with a perfectly current editor that the editor was at fault. The editor
now branches on the outcome, not on the code.

**A no-op row is still a row.** §4.3's own argument about version numbers transfers to the table:
recording that the answer to *what has to change* is *nothing* is a fact worth carrying, and an
omitted row is indistinguishable from an oversight. The row also carries the `note` the editor's
advisory prints.

**The advisory says two things**, and the second is the one the author cannot infer: the document
now in the editor differs from the file still on their disk, and exporting writes a form older
builds will not read.

**Correction to ADR-005**, recorded there in full: the bump was justified on the grounds that
`TileState` gained a field, but `TileState` is `generate()`'s output and is not in a
`TilesetFile` at all. `06` §4.2 puts it outside `schemaVersion`'s remit and §4.3 assigns an
output change to `05` **X9**. The bump stands on the correct grounds — `Operation.target`'s
admissible set widened — and every legal v1 file was always a structurally legal v2 file, which
is why the migration is a no-op.

---

### 2026-08-12 — The *fill* preview width is floored to a whole pixel

**Arose in:** the seam fix. The renderer's half is `08` §12 and is cited from the code, not
here — this entry is only the editor's half, which no spec answers.

`PreviewFrame`'s *fill* state sets `Wpx` from the column's `clientWidth`, which in a flex
column is routinely fractional. `07` §5.3 makes the layout correct at every `Wpx`, fractional
included, and `08` §12's placement holds there too, so nothing is *wrong* with a fractional
width. But it is a width nobody chose: the same file at the same preset drew a marginally
different picture depending on what else was in the shell that session, and while the seams
were being chased that was one more variable that had to be excluded by hand.

**Answer:** floor `available` before subtracting the handle gutters. The presets (375, 768,
1024, 1440) were already integers; this makes *fill* one too.

**Not** a clamp and **not** a minimum on `Wpx` — the 2026-08-10 preview-width entries stand,
`Wpx` is still unclamped and still exceeds the column freely under the display zoom, and
`09` §9.2's **E11** still writes no field. Rounding rather than flooring would be equally
defensible; flooring loses at most one pixel and cannot make the frame overflow its gutter.

---

### 2026-08-12 — `substrate` defaults to `"canvas"`, not to `"dom"`

**Arose in:** the seam fix, after ADR-006 established that both substrates exist. The ADR settles
*that* there are two and what each costs; which one an unconfigured `<Tileset>` gets is not a
question any spec answers.

**Answer:** `"canvas"`.

The tie-breaker is who is hurt by a wrong default. A consumer who needs SSR knows they need SSR —
it is a property of their build, they will read the prop, and `"dom"` is one word away. A consumer
who gets `"dom"` by default gets a component that is *almost always* seamless, on *their* pages,
until some ancestor they did not write acquires a `transform` and hairlines appear across a
background nobody is currently looking at. The first failure is loud at build time; the second is
silent, intermittent, and attributed to anything but the tileset. `07` §5.6 already says as much
about this class of bug: "invisible at some widths and obvious at others, and one of the harder
things to attribute after the fact."

It also matches what the component is for. A generated tileset is decorative background
(`08` §4.5) — it is not content a crawler needs and not something a no-JavaScript visitor is
deprived of. Trading a guarantee for the server-rendered version of a picture is the wrong way
round for that.

**Reversing this is one word** and no data migration: `substrate` writes no field and is not in
`TilesetFile`. If a consumer turns up for whom SSR is the harder requirement, they set the prop.
