# 09 — Editor

> **Status:** Draft, agreed  
> **Depends on:** `01-glossary.md`, `02-generation-contract.md`, `03-domain-model.md`, `04-operations.md`, `05-extension-model.md`, `06-config-schema.md`, `07-render-contract.md`, `08-renderer-svelte.md`, `/adr/001`, `/adr/002`  
> **Constrains:** nothing. It is the last document in the package.

---

## 1. Purpose

This document defines **the editor**: what it holds, what it writes, and which of the package's
guarantees exist because it wrote them.

Every other document routes something here — overlay design, the advisory diagnostics of `06`
§10.4, seed and reroll affordances, the repair of an orphaned Selection, the controls built from
a `ParamSchema`, asset attach, and the mechanism by which a host keeps its file continuously
valid. Those routings are collected in §2's mirror: nothing arrives here that another document
did not send.

It is the last document because it consumes every contract. It is also the only document in the
package that specifies an **application** rather than a boundary, and §3 is where that difference
is made load-bearing rather than left as an excuse.

---

## 2. Not in this document

The following belong elsewhere and must not be specified here:

- Engine behaviour, the hash, the effective seed → `02-generation-contract.md`, `04-operations.md`
- Attribute domains, defaults, bounding → `03-domain-model.md` §5
- The semantics of any Selection, Source, Mapping, Blend, or Target → `04-operations.md`
- What a registered type declares, and package versioning → `05-extension-model.md`
- File shape, key names, validation rules, and error codes → `06-config-schema.md`
- Geometry, transforms, crop, clipping, paint order, the provider contract → `07-render-contract.md`
- Component props, events, SSR, the substrate → `08-renderer-svelte.md`
- **Asset optimization, source formats, and sprite sheets** → `roadmap.md` §4.4. §11 takes
  bundling and export; the pipeline upstream of a file the editor can open stays there
- Visual design, layout of panels, keyboard shortcuts, colour → nowhere. This document
  specifies affordances and their obligations, not their appearance

---

## 3. The operating assumption

**The editor is the only writer of a `TilesetFile`.**

This is not a restriction on anyone. It is a statement about where several of the package's
guarantees are **manufactured**, because they are enforced nowhere else and cannot be checked
after the fact.

| Guarantee                                                                        | Manufactured by                      | Checked by                               |
| -------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `columns × cellSize ≥ referenceWidth`, so `originX ≤ 0` and there are no gutters | `02` §7.1's upward parity correction | nothing — `06` §10.4's fourth diagnostic |
| `columns`' parity matches `horizontalAlignment`                                  | the same derivation                  | nothing — `06` §10.4's first diagnostic  |
| Identifiers are generated, unique in scope, and contain no colon                 | §4.3                                 | `06` **C10**, partially                  |
| `engineVersion` names the engine that actually wrote the file                    | §11.2                                | nothing — advisory by **C3**             |
| `meta.width` and `meta.height` exist and are correct                             | §10.3, at attach time                | nothing                                  |
| `reseedOnLoad` is set only where it means something                              | §8.4                                 | nothing — `06` §10.4's second diagnostic |

Four of the six are exactly the rows `06` §10.4 lists as _legal configs worth telling an author
about_. That correspondence is not a coincidence and it is the argument for this section: **an
advisory diagnostic is the shadow of a guarantee the editor manufactures.** `06` §10.4 could
enumerate them without being able to prevent them, because prevention happens here.

**Invariant E1** — _Every guarantee in the table above is the editor's to produce. An editor
that writes a file violating one has failed to meet this specification, not merely produced
awkward output._

### 3.1 What follows from it

**One pinned version.** `engineVersion` is truthful only if the editor's version writer and the
`<Tileset>` it previews with come from one pinned package. An editor previewing with engine
`1.5` while stamping `1.4` shows the author a picture no consumer of that file will get.

**Invariant E2** — _The editor's preview component and its `engineVersion` writer come from a
single pinned version of the engine and renderer package._

This is `00` §8.2 applied to the editor's own build, and it is the cheapest instance of it in the
package: one dependency entry rather than two.

**The posture is reversible and reversing it invalidates no argument.** `05` §3's non-goal is
about who registers _types_; writing a config is a different act and opening one does not touch
the other. What a third-party writer would need is not new machinery — `06` ships `validate()`
with stable codes and JSON Pointer paths (**C7**) — but the table above, promoted from an
editor obligation into published prose or into checks. `00` §5.2 need not change. Carried to §14.

**This document specifies affordances, not appearance.** An affordance has an obligation attached
— _this control writes that field_, _this action is destructive_ — and the obligation is what a
later reader needs. Panel layout is not specified anywhere and deliberately so.

---

## 4. The document

### 4.1 The editor's state is the file

**Invariant E3** — _The editor's document state **is** a `TilesetFile`, plus transient UI state
held beside it. There is no second document model that projects to a file on export._

The rejected alternative is a richer internal model — one that carries collapsed panels, an
operation's muted flag, an asset's pre-optimization original — and emits a `TilesetFile` when
asked. It is the obvious architecture and it loses for the reason `08` §3.1 rejected split
`config`/`layout` props: it makes a mismatched pair expressible. `08` **S2** requires the preview
to be `<Tileset>` mounted on the editor's file, so a file must exist and be live at every instant
regardless. A second model does not remove that requirement; it adds a projection alongside it,
and a projection can differ from what previews.

**Transient UI state lives beside the file, keyed by the identifiers the file already carries** —
`Operation.id`, `Tile.id`, `TileAsset.id`. It is session-scoped in V1 and does not survive a
reload.

**Invariant E4** — _The editor writes nothing into any `meta` block beyond the keys `07` §4.4
declares. `meta` is not a place to park editor state._

`meta` is tempting precisely because `06` **C4** exempts it from strictness, and that is the
reason to refuse it. `07` **R4** makes `meta` additive-only: a key published there is never
removed and never retyped. An editor concern parked in `meta` becomes permanent, travels to every
consumer, and reaches the asset provider of every host. The one place in the file with no schema
is the one place an editor must be most disciplined about.

An `editor` block at the top level is the other candidate and is a `schemaVersion` bump (`06`
§4.3) for a key no consumer reads. Both are carried to §14 with a sidecar file as the third
option; none is V1.

**A consequence worth naming: muting an Operation is removing it.** There is no disabled flag,
because there is no field for one and adding one is a bump. An operation is muted by removing it
from `config.operations` and holding it aside in UI state; unmuting re-inserts it at its index.
This is correct for free, because **G3** attaches an Operation's randomness to its
`operationId` and `salt` rather than to its stack position — a muted-then-unmuted Operation draws
exactly what it drew before. It does not survive a reload, which is the cost of session-scoped UI
state and is recorded rather than solved.

### 4.2 Every edit is a legal transition

`08` §3.4 states the obligation — _a host must never hold an invalid file, not even between
keystrokes_ — and assigns the mechanism here. The mechanism is that the file is only ever mutated
by whole transitions that are total on legal input and produce legal output.

**Invariant E5** — _Every editor action that touches the file is a function
`TilesetFile → TilesetFile` that is defined on every legal file and produces a legal file.
In-flight input lives in the input control and reaches the file only when it parses._

Three consequences, and the third is the useful one.

**Text commits on parse, not on keystroke.** An author typing `1.` into `cellSize` has a control
holding `"1."` and a file still holding its last legal number. The control commits on a
successful parse, or on blur, or is reverted. Nothing partial reaches the file, and the preview
never stops drawing.

**A deletion cascades or is refused, never lands.** Deleting a Tile referenced by a palette entry
either removes those entries in the same transition or is refused with the references named. It
does not land as a dangling `tileId` and wait for validation to notice — `06` §7.3's
`DANGLING_TILE_REF` is an import-time code, not an editing-time one.

**A validation error is unreachable while editing.** If E5 holds, no sequence of editor actions
produces a file `validate()` would reject.

### 4.3 Identifiers

`Tile.id`, `TileAsset.id`, and `Operation.id` are generated here and never authored (`06` §5.3).
They match `[A-Za-z0-9_-]+`, exclude the colon, and are unique in the scope `06` **C10** fixes.

`Operation.id` uniqueness is a correctness requirement rather than tidiness, and `06` §5.3 gives
the failure exactly: two Operations sharing an id share both hash channels, so their Sources
return identical values at every cell and their `random` Selections agree everywhere — a picture
that looks oddly aligned with itself, with no error anywhere. The colon exclusion closes the
adjacent hole where an Operation id of `"op7:selection"` collides with Operation `"op7"`'s
selection channel string.

An id is assigned at creation and **never reassigned**, including through duplication: duplicating
an Operation produces a new id, which is why the duplicate looks different from its original.
That is the intended behaviour and authors will ask about it — a duplicate that looked identical
would be one that shared a hash channel.

### 4.4 Undo

Undo is a stack of files. `TilesetFile` is plain serializable data, edits are whole transitions
(E5), and the engine is pure, so a restored file is a restored picture with nothing else to
reset.

**Invariant E6** — _Undo restores a previous `TilesetFile` in full. No editor action is outside
the undo stack, including the design-width change of §9.3._

The inclusion of the design-width change is the point of the invariant. §9.3 is the one
destructive edit in the editor, and `04` open question 4 asks how an orphaned `rect` or
`cellList` is repaired after it. **The answer is that undo is the repair** — see §9.4.

---

## 5. The preview

The preview is `<Tileset>` mounted on the editor's file, drawing the complete operation stack,
per `08` **S2**. There is no preview mode, no simplified path, and no second component.

Props follow from `08` §4:

| Prop           | The editor supplies                                                         |
| -------------- | --------------------------------------------------------------------------- |
| `file`         | the editor's document (§4.1)                                                |
| `seed`         | omitted — the component falls back to `file.config.defaultSeed` (`07` §9.2) |
| `loadSalt`     | the load-preview value of §8.5, default `0`                                 |
| `provider`     | the editor's own provider (§10.4)                                           |
| `onAssetError` | wired, always (§12.3)                                                       |

**The editor does not pass a `seed`.** The seed field in the editor writes
`config.defaultSeed`, and the preview therefore always shows what a visitor with no host seed
would see. A separate preview seed would let the author approve a picture the file does not
produce, which is `07` §3's stated worst outcome reached by a different route.

`08` §5.2 already gives the regeneration behaviour: `generate()` runs when `file.config`, `seed`,
or `loadSalt` changes, and nothing else. A weight slider dragged across a frame changes `file` on
every frame and recomputes the grid on every frame, which is correct and cheap, and `loadSalt` is
untouched throughout so flagged Operations hold still while the author judges something else.
Whether the editor debounces before the value reaches `file` is an editor decision with no
correctness content.

---

## 6. Overlays

### 6.1 There is one overlay

**Invariant E7** — _The editor draws exactly one kind of overlay: a low-opacity rectangle over
each cell an Operation's Selection includes, shown in the Selection section of the Operation
being edited. Its geometry comes from `cellBox`._

`07` §3.1 anticipated a family — selection outlines, hover highlights, per-cell badges — and V1
ships the first only. Anything the author needs to know about an Operation's _effect_ they read
from the picture itself, which is the whole point of **S2**: the preview is not a diagram of the
stack, it is the stack.

Geometry is `cellBox` from `08` §7, never recomputed. `07` **R1** requires one implementation of
the coordinate mapping and gives the failure exactly: the picture is right, the selection boxes
are a few pixels off, and nothing anywhere reports it.

### 6.2 The editor evaluates no Selection

**Invariant E8** — _The set of cells an overlay covers is obtained from the engine package. The
editor contains no implementation of any Selection's test._

This is the invariant that requires something the package does not currently export, and it is
this document's one substantive ask of a completed spec.

`08` §7 assigns selection overlays here and states that the editor derives them "from the
Operation it is editing, not from the drawn output." As the package stands, that means the editor
reimplements `checkerboard`'s parity test, `everyNth`'s remainder, `rect`'s half-open bounds, and
`random`'s selection-channel draw. That is a second implementation of the only engine behaviour
the editor touches, and it drifts silently in the one place the author is looking directly at it
— `07` **R1**'s argument, one layer up.

**The required export:**

```
selection(config: TilesetConfig, operationId: string, seed: Seed, loadSalt: uint32 = 0)
  -> (x: number, y: number) -> boolean
```

A pure function of the same inputs `generate()` takes, returning a predicate. It resolves the
Operation's effective seed per `02` §6.7 and its selection channel per `04` §4.3, so a `random`
Selection's overlay matches the cells the Operation will actually act on, including under a set
`reseedOnLoad` flag at the previewed `loadSalt`.

**Total and unbounded in `(x, y)`**, matching `07` §8.2's reasoning for `cellAt`: `04` §4.2
permits a `rect` to extend past the grid, and an author dragging one to the edge needs to see
where it reached. The editor bounds at the draw site, since only cells in `rows × columns` have a
`cellBox` worth drawing.

**Why not diff two grids.** The alternative avoiding a new export is generating with and without
the Operation and highlighting the difference. It answers a different question: a diff shows
_effect_, not _selection_. An Operation can select a cell and write a value identical to what was
there — `multiply` by one, a palette entry matching the tile already present, a `set` of the
default — and those cells would vanish from an overlay that is supposed to show what the
Operation acts on. It also costs two generations per frame where one suffices.

`02` §12 gains this export. It is an added export that moves no output, therefore a **minor
engine bump** under `05` §10.2 — the same shape as the `generateRegion` row `02` §12 already
carries.

---

## 7. Controls

### 7.1 Controls are generated from `ParamSchema`

`05` §5.1 names `09` as one of three consumers of the parameter schema, and `06` §7.4 gives the
encoding as data specifically so it can be walked rather than only called. The editor builds a
Selection's or Source's controls from its `ParamSchema` and has no hand-written panel per
registered type.

**Bounds determine the affordance.** The rule is stated at that level rather than as a table of
widgets, so a registered type added later gets a working control with nothing written for it:

| `ParamSpec`                      | Affordance                                             |
| -------------------------------- | ------------------------------------------------------ |
| `number` with both bounds        | a slider over the bounds                               |
| `number` with one bound or none  | a numeric field                                        |
| `integer` with both bounds       | a slider with integer steps, or a stepper where narrow |
| `integer` with one bound or none | a numeric field with integer steps                     |
| `enum`                           | a segmented control over `values`                      |
| `cellList`                       | **not generated** — §7.3                               |

**Invariant E9** — _The mapping from `ParamSpec` to affordance is total. A registered type
declaring only a `ParamSchema` gets a working control with no editor code written for it._

Totality is what makes `05` §3.1's _a new Source is a source file, a table entry, a commit_ true
in practice. A mapping with holes means every registered type also requires an editor change, and
the extension point is then two changes wearing one name.

Defaults come from the schema (`05` §5.1, `06` §5.1). A parameter absent from the file shows its
default; the editor writes it explicitly on save (`06` §5.1).

### 7.2 A registration may carry editor metadata

This resolves `05` open question 6, and generalizes it.

```
Registration {
  ...                             // 05 §5
  editor?: {
    label?:       string
    description?: string
    control?:     string          // an affordance hint, overriding §7.1's mapping
  }
}
```

**Optional throughout, and the engine never reads it** — the posture `03` **D1** takes for
`Tile.name`. It lives beside `impl` in the registry, never appears in a `TilesetFile`, and is
therefore **package-internal** in `06` §7.4's sense: it costs no bump of any kind.

`control` exists for the case §7.1's mechanical mapping handles correctly but unhelpfully.
`gradient`'s `angle` is an unbounded number and gets a numeric field, which is right and dull; a
dial is better, and `04` §5.2 already notes that angle presets are an editor convenience rather
than a spec concern. The hint is the place that convenience attaches without `04` growing a
parameter for it.

**The hint is never required and never load-bearing.** E9's totality is what permits that: a
`control` value the editor does not recognize falls back to the mechanical mapping rather than
failing. This is the one place in the package where an unknown name is _not_ an error, and the
distinction is that it names an affordance rather than semantics — `05` **X7** exists because an
unknown Source would change the picture, and an unknown widget hint cannot.

### 7.3 `cellList` is painted, not generated

`05` §5.1 flags this as "the reason `09` cannot generate every control mechanically," and it is
the one exception to E9's totality — permitted because the schema names it explicitly rather than
because the mapping ran out.

The author paints cells on the preview. Pointer events convert to render space and then through
`cellAt` (`07` §8.2, `08` **S10**), which the editor never reimplements. Converting client
coordinates to render space uses the render box element `08` §7 exposes; `07` §8.2 names this as
the single most likely place to get the coordinate space wrong.

**`07` open question 6, resolved: `cellAt` stays unbounded and the brush bounds at the call
site.** The two tools want different answers and both are one comparison:

| Tool             | Bounds? | Why                                                                                                           |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `rect` drag      | no      | `04` §4.2 — a rectangle dragged to the edge is not silently resized, and the out-of-grid extent is meaningful |
| `cellList` brush | yes     | a painted cell outside the grid can never be drawn, seen, or clicked to remove — it is unremovable by eye     |

The asymmetry is real and follows from the difference `04` §4.4 draws: a `rect` states an
intention that survives the grid growing, where a `cellList` entry states a specific cell.

### 7.4 Numeric mapping

`04` §6.1 fixes the presentation: a numeric mapping is two handles on the Target's slider track,
and the author never sees the word _mapping_. The track spans the Target's authoring range (§7.5);
the two handles are `range[0]` and `range[1]`.

`min > max` is legal and reverses the map (`04` §6.2), so the handles **cross rather than clamp**.
Preventing the crossing would remove the only way any Source is inverted.

`steps` is a separate optional control. Its absence is a meaning rather than a default (`06`
§5.1), so it reads as _continuous / stepped_ rather than as a number with a blank default, and the
editor omits the key entirely when continuous — the one field `06` §5.1 exempts from _write
everything explicitly_.

**The handles collapse to one when the Source is `constant`.** `04` §5.2 specifies this: a fixed
value is `min` equal to `max`, and the alternative — a `value` parameter on the Source — would put
two controls in the UI meaning the same thing.

**A gotcha the editor should surface.** `04` §6.2: `rotation` wraps at `360`, so `[0, 360]` with
`steps: 4` yields `0, 120, 240, 360` and `360` wraps to `0` — three distinct rotations, one twice
as likely. Quarter turns are `[0, 270]` with `steps: 4`. A stepped mapping on a wrapping domain
whose endpoints coincide is a §12.2 advisory.

### 7.5 Authoring ranges

This resolves `03` open question 4.

`scaleX` and `scaleY` have **open domains** (`03` §5.4) — any finite number — and `03` §5.4 says
so on purpose: rejecting the normalized model because scale has no natural maximum, and then
inventing one, would be incoherent. The editor still has to draw a track of finite length.

| Target     | Track           | Typed entry              |
| ---------- | --------------- | ------------------------ |
| `scaleX`   | `[−2, 2]`, soft | any finite number        |
| `scaleY`   | `[−2, 2]`, soft | any finite number        |
| `rotation` | `[0, 360)`      | any finite number, wraps |
| `opacity`  | `[0, 1]`        | `[0, 1]`, the domain     |

**Soft means the track extends to contain any value typed, and never clamps one.** A typed `4`
widens the track; it is not rewritten to `2`. Clamping typed input would be `06` §9.2's coercion
performed in the one place the author is watching, and `02` §7.4 already records how that ends —
the author's next save writes the rewritten value back over their own.

The `[−2, 2]` figure is a **UI constant with no authority anywhere.** It is stated so the editor
is buildable and is not cited by anything. `rotation`'s track is the domain because the domain is
bounded; `opacity`'s typed entry is bounded because its domain is (`03` §5.4) and a value outside
it would be clamped by **D5** on the first write anyway.

The negative half of the scale track is load-bearing rather than symmetric: `03` §5.4 makes flip
a negative value rather than a boolean, so the track has to reach there or flip is unreachable by
dragging.

### 7.6 The palette builder

This resolves `04` open question 3, which `04` flags as a real authoring hazard rather than a
cosmetic one.

**O6** makes palette entry order authored and semantically significant, against **D3** which
canonicalizes a Tile's asset list precisely so that dragging a list entry cannot reshuffle the
canvas. Two adjacent lists in the same editor, with opposite rules. The presentation has to make
the difference legible or the author will learn one and apply it to the other.

**The palette is a single contiguous bar, segmented by weight.** Not a list of rows. The reason is
`04` §6.4's: under a banded Source, threshold adjacency _is_ spatial adjacency — water has to sit
next to sand and not next to grass, and order is the only way the author says so. A bar shows
adjacency and proportion in one object, and shows the thresholds where the segments meet.
Reordering is dragging a segment along the bar, which reads as rearranging a sequence rather than
sorting a list.

A Tile's asset list is a plain list with no order affordance at all, because **D3** sorts it by id
regardless.

Weights are the segment widths. A zero-weight entry is legal and means _listed but never chosen_
(`03` §4.1), so it is rendered as a zero-width marker rather than disappearing — vanishing would
make an entry that still exists in the file invisible in the editor.

**`null` is an ordinary palette entry** meaning _clear this cell_ (`04` §6.3, `02` §8.1). It is
offered as a palette entry alongside the Tiles, and it is **not** a Tile in the library — `02`
§8.1 is explicit that "empty" never appears as a selectable entry there.

**Accepted, not a defect, and worth surfacing:** `04` §6.4 records that under a `random` Source,
reordering a palette reshuffles the canvas with no visible reason, because uniform values make
adjacency meaningless. The bar presentation implies a spatial meaning that a `random` Source does
not deliver. §12.2 carries it as an advisory rather than the editor having two palette
presentations.

### 7.7 The Blend control

ADR-001 and `04` §7.2 fix this exactly: for any Target, show the default Blend, and reveal the
accepted set only on request.

For `tileId` there is **no blend control at all** (`04` §7.2). Its type accepts `set` only, and a
control with one option is a control that teaches the author nothing.

The accepted set is computed from the registry — every Blend accepting the Target's type, less
the Target's vetoes — and never from a hardcoded list. That is ADR-001's whole point: a Blend
added later is available on every numeric Target at once, and an editor holding its own table
would be the thing that failed to notice.

---

## 8. Seed, salts, and reroll

### 8.1 Four affordances, and one is different

`02` §6.4 names two reroll affordances and `04` §8 adds the load dimension. Collected, there are
four things an author can vary, and the fourth is categorically unlike the other three:

| Control              | Writes               | Scope                                 | Persisted |
| -------------------- | -------------------- | ------------------------------------- | --------- |
| **Seed**             | `config.defaultSeed` | everything                            | ✅        |
| **Operation reroll** | `Operation.salt`     | that Operation's Source and Selection | ✅        |
| **Asset reroll**     | `config.assetSalt`   | which variant each cell shows         | ✅        |
| **Load preview**     | nothing — a prop     | Operations with `reseedOnLoad: true`  | ❌        |

**Invariant E10** — _The load-preview control writes nothing to the file. `loadSalt` is a prop
passed to the preview and is never persisted._

`06` §3.4 records that `loadSalt` has no slot in the file deliberately, and that writing it in
would freeze a load that was supposed to vary. E10 is that decision defended at the one control
that would be tempted to violate it.

The three persisted controls must be visually distinct because they do different things, and the
fourth must be distinct from all three because it changes nothing that will be saved.

### 8.2 The seed field

`02` §6.6: the author never sees a hash. They type a string — `"sunset-3"`, `"draft-b"` — and that
is the whole interface.

The field writes `config.defaultSeed`, which is required (`02` §4.1), so it is never empty. Beside
it the editor offers a **generated memorable seed** in word-word-number form, per `02` §6.6: the
value of a seed is that it can be written down and returned to, and random hex defeats that.

There is no separate preview seed (§5).

### 8.3 Operation reroll

Increments `Operation.salt`. `02` §6.4 and `04` §4.3: both of the Operation's hash channels take
its salt, so one click moves the Operation's `random` Selection and its Source together, which is
the intended behaviour of a reroll attached to one Operation.

`06` **C9** narrows `salt` to an integer in `[0, 2³²)` and `06` §5.2 gives the failure the
narrowing prevents, in this exact control: _the editor's reroll button increments a salt; the
author clicks it; the config visibly changes; the picture does not._ The editor increments by one
and wraps at `2³²`; it never adds a fraction and never exceeds the range.

**The button is offered on every Operation**, not only stochastic ones, because the Operation's
`random` Selection consumes the salt even where the Source does not (`04` §4.3). An Operation with
a `constant` Source and a `random` Selection rerolls meaningfully.

### 8.4 Asset reroll and the load flags

The asset reroll increments `config.assetSalt`, re-rolling which variant each cell shows without
disturbing any Operation (`02` §6.4).

`reseedOnLoad` is a per-Operation checkbox and `reseedAssetsOnLoad` its config-level counterpart.
**The Operation flag is offered only where the Source is stochastic** — `04` §8.4 and `05` **X5**:
the flag is inert on `constant`, `gradient`, and `vignette`, and `05` §6.1 records that a reroll
control doing nothing "reads as a broken engine rather than a mislabelled Source." The editor
reads the registry's `stochastic` declaration and never a hardcoded list of Source names.

**A correction the editor must not make.** `06` §10.4's second diagnostic notes that a flagged
Operation with a non-stochastic Source is _not_ fully inert, because the flag also moves the
Operation's `random` Selection (`04` §8.2). So the control is hidden on the basis of the Source's
declaration, and an imported file carrying the flag anyway is left alone and reported as an
advisory — not silently cleared.

### 8.5 The load preview

A control that draws a fresh `loadSalt` and passes it to the preview. It is how an author sees
what a second visitor gets.

Drawn per `07` §9.3, including its warning: `Math.floor(Math.random() * 2**32)`, never
`| 0`, which coerces to `int32` and yields a negative number for half of all draws — a value
`06` **C9** would reject if it ever reached a field, and it never does, so nothing catches it.

**The control is disabled when no Operation is flagged and `reseedAssetsOnLoad` is false.** `04`
§8.3: a config with the flag false throughout is byte-identical on every load _regardless of_
`loadSalt`. An enabled button that provably changes nothing is `05` §6.1's complaint arriving one
level out.

The value is held for the session and is not redrawn on any other edit (`07` **R12**), which the
editor gets structurally from `08` **S7** — the component draws no random number, so there is
nothing to redraw.

---

## 9. Layout authoring

### 9.1 What the author manipulates

`02` §7.3's table divides the fields, and this section divides the _controls_, which is not the
same division:

| Field                 | Control                             | Writes  |
| --------------------- | ----------------------------------- | ------- |
| `cellSize`            | numeric                             | ✅      |
| `rows`                | numeric                             | ✅      |
| `referenceWidth`      | **design width**, numeric (§9.3)    | ✅      |
| `horizontalAlignment` | toggle, beside design width         | ✅      |
| `columns`             | **displayed, never edited**         | derived |
| —                     | **preview width**, draggable (§9.2) | ✗       |

`columns` is shown because the author needs to know it — a `rect` is authored in column indices —
and is not editable because `02` §7.1 derives it. Editing it directly would break
`columns × cellSize ≥ referenceWidth` and produce `06` §10.4's fourth diagnostic from inside the
editor, which E1 forbids.

### 9.2 Preview width is a drag handle and writes nothing

This is the correction to `02` §7.5, and it is a correction to a premise rather than to a rule.

`02` §7.5 opens: _"Because `columns` derives from a page width the author can drag at any time,
resizing the editor preview after operations exist is a destructive edit."_ The premise is that
the draggable page width **is** the design width. That premise is what this section overturns; the
destructive rule survives untouched and attaches to a different control.

**Invariant E11** — _The preview width control sets `Wpx` on the render box and writes no field.
It is not destructive and requires no confirmation._

`07` §9.1 already has exactly two rows, and preview width is the second:

|                      | What changes                           | Cost                        |
| -------------------- | -------------------------------------- | --------------------------- |
| **Authoring resize** | `referenceWidth`, `columns` re-derived | destructive                 |
| **Viewport resize**  | `Wpx`, hence `s`                       | pure scale, no regeneration |

Nothing new is required to make preview width work. `07` §5.3 makes every ratio `Wpx`-independent
and **R12** forbids regeneration on a width change, so dragging the handle shows the author the
true responsive behaviour of the file at that width, exactly and with no approximation. `08`
**S8** gives the render box a natural ratio and no height, so the height follows.

**The design principle, stated because it is the whole of the fix:** the destructive edit must not
be the one that is easy to do by accident. A page edge that can be dragged reads as a viewport,
and a viewport does not destroy work. Making the destructive control a numeric field rather than a
drag handle is most of the remedy; §9.3 is the rest.

Preset widths — common breakpoints — are an editor convenience on this control and carry no spec
content. The term _breakpoint_ is reserved for `06` §12's `layouts` extension point and is not
used for them.

### 9.3 Design width is a numeric field and is destructive

Setting it re-derives `columns` per `02` §7.1 — `ceil(referenceWidth / cellSize)`, parity
corrected upward against `horizontalAlignment` — and writes both fields.

**Invariant E12** — _Changing `referenceWidth`, `cellSize`, or `horizontalAlignment` re-derives
`columns` and requires explicit confirmation whenever the config holds a coordinate-bound
Selection. The confirmation names the Operations that will be affected._

`02` §7.5's V1 decision — warn, confirm, do not migrate — is adopted unchanged. Three fields
rather than one, because `columns` derives from all three and `02` §7.5 names only the first: a
`cellSize` change re-derives `columns` just as surely, and a `horizontalAlignment` toggle can move
it by one through the parity correction alone.

**Confirmation is required only where something is at risk.** `04` §4.4: procedural Selections —
`all`, `checkerboard`, `everyNth`, `random` — survive a resize unharmed, and a config holding only
those has nothing to warn about. A dialogue that appears every time teaches the author to dismiss
it before reading, which is worse than no dialogue.

The three controls sit together, away from the preview width handle.

### 9.4 Orphans are not migrated, and undo is the repair

This resolves `04` open question 4.

`02` §7.5 is explicit that Selections are not migrated, and `04` §4.4 supplies the distinction
`09` was told to use: a `rect` can plausibly be re-dragged, a hand-painted `cellList` cannot.

**Nothing is migrated, in either case.** Migration has to guess, and there is no non-arbitrary
answer. A `rect` spanning columns 0–7 in an 8-column grid, in a grid that becomes 10 columns:
proportional says 0–9, absolute says 0–7, and both are defensible readings of what the author
meant. Choosing one silently rewrites an authored value, which is `06` §9.2's coercion applied to
the thing the author cares about most.

What the editor does instead:

1. **Before** the change, name the affected Operations in the confirmation (E12).
2. **After** the change, carry each affected Operation as a §12.2 advisory until the author
   touches it — a `rect` now wholly outside the grid is already `06` §10.4's third diagnostic, and
   a `cellList` with entries outside is the same shape.
3. **Undo restores the file whole** (E6), which restores the Selections with it.
   Undo being the repair is not a fallback. It is better than migration on the same grounds `02`
   §7.5 refused migration: it returns the author's authored values rather than the editor's guess at
   them, and it needs no rule about what a coordinate means when the grid changes underneath it.
   `04` §4.4's distinction survives in the advisory's wording — a `rect` is offered a jump to its
   control, a `cellList` is told how many of its entries are now unreachable — but not in the
   repair, because there is none.

---

## 10. The tile library

### 10.1 Tiles and assets

A Tile is `{ id, name, assets }` with at least one asset (`06` §6). `Tile.name` is deliberately
unconstrained — not unique, not charset-limited, possibly empty (`06` §5.3, **C10**) — because
**D1** guarantees a name collision cannot reach output, so the only cost is authoring clarity.

`06` §5.3 assigns that clarity here: _disambiguating two Tiles called "leaf" on screen is `09`'s
problem_, and enforcing uniqueness in the schema "would make the editor block a rename for a
reason the engine does not care about."

**The editor never blocks a rename.** Where two Tiles share a name it appends the `Tile.id`
suffix to both wherever they appear, and raises a §12.2 advisory. Both are display behaviour;
neither touches the file.

A Tile's asset list is canonically ordered by id (**D3**) and is presented as a plain list with no
drag affordance, in deliberate contrast to §7.6's palette bar. `03` §4.2 sorted assets precisely
so that dragging a list entry could not reshuffle the canvas, so an editor offering a drag would
be offering a gesture with no effect.

### 10.2 Weights

A `TileAsset.weight` is a number `≥ 0`, finite, and a Tile's weights must sum `> 0` (`06` §6,
`03` §4.1). Zero is legal and means _listed but never chosen_.

E5 makes the sum constraint an editing rule rather than a validation one: the editor does not
permit the last non-zero weight to be zeroed, in the same manner as a refused deletion (§4.2).
`ZERO_WEIGHT_SUM` is an import-time code.

### 10.3 Attaching an asset

`07` §4.4 assigns three keys to the editor, written at attach time:

| Key      | Type              | Written                         |
| -------- | ----------------- | ------------------------------- |
| `src`    | string            | the path §11.1 will export to   |
| `width`  | number, design px | measured at attach, then frozen |
| `height` | number, design px | measured at attach, then frozen |

**Invariant E13** — _An asset attach measures the asset's intrinsic dimensions and writes all
three keys, or it fails. A `meta` block missing `width` or `height` is never written._

`07` §4.4's argument is `06` **C3**'s: a measurement only taken when someone thinks to take it is
missing precisely from the old files that will need it. `06` §5.1 makes `meta` default to `{}`, so
an empty block is legal and an old file may carry one — but the editor never _creates_ that
condition. An asset that will not decode is a failed attach, not an attach with two keys missing.

`07` §4.4 records the staleness cost — frozen dimensions go stale if the file behind `src` is
replaced with one of a different shape, and nothing detects it. Tolerable in V1 only because
nothing computes geometry from them. The editor re-measures on re-attach and on nothing else.

E4 applies here with force: these three keys and nothing else.

### 10.4 The editor's provider

The editor supplies its own `AssetProvider` (`07` §4.1) rather than the default one, because
`meta.src` in an unexported document is a path into the editor's own asset store rather than a URL
the browser can fetch.

It obeys **R2** — one `AssetRef` resolves to one `Drawable` for the session — and it is keyed on
the `(tileId, assetId)` **pair**, never `assetId` alone. `07` §4.1 gives the failure: `06` §6
makes `TileAsset.id` unique within its Tile only, so two Tiles may both hold `a1`, and a provider
keyed on `assetId` resolves one to the other's drawable, correctly and silently, for as long as
the config lives.

---

## 11. Export

### 11.1 The editor exports a file and a folder

**Invariant E14** — _Export produces a `TilesetFile` and an asset folder together. Every
`meta.src` in the file is a path relative to that folder's root._

`roadmap` §4.4 provisionally assigned asset export to the pipeline and its open question 1 said
"`09` may take more of it than that." This takes bundling; optimization, source formats, and
sprite sheets stay there.

The argument is not convenience. `07` §4.4 records `meta` as **the one place in the file where a
typo is silent** — `"scr"` validates cleanly under **C4** and surfaces later as a missing asset
rather than at load as an error — and `roadmap` B3 finds no good way to validate it. When the
editor emits the folder alongside the file, `src` stops being a string an author typed and becomes
a string the editor wrote beside a file it just copied. The hole closes without validating
anything, which is a better answer than the one B3 was looking for.

**The layout mirrors the `AssetRef` key:**

```
tileset.json
tiles/<tileId>/<assetId>.<ext>
```

Not a flat folder. `07` §4.1's objection to keying a provider on `assetId` alone is a filename
collision here — two Tiles both holding `a1` would export two files called `a1`, and one would
overwrite the other silently. The directory structure is the pair, for the same reason the key is.

### 11.2 `src` is relative, and resolution is the host's

The editor cannot write a deployable URL: it does not know the consuming site's base path,
bundler, or hashing scheme. So it writes relative paths and the host resolves them.

A host that serves the folder as static files needs nothing — `08` §4.3's default provider reads
`meta.src` verbatim. Anything else supplies a provider, which is the case `08` §4.3 already names:
a CDN transform, a bundler-hashed import map. This adds no obligation to `07` or `08` and costs no
`schemaVersion` bump, since `src` lives inside `meta` and **C4** does not inspect it.

**Accepted, not a defect:** the editor must be able to load `meta.src` itself in order to measure
(E13) and to preview, and the export path is not that path. The editor's provider (§10.4) bridges
them, and a hand-edited `src` that the editor cannot resolve is a failed attach rather than a
silent hole.

### 11.3 What else the editor writes

- `schemaVersion: 1` (`06` §4.1). Required; the file is never written without it.
- `engineVersion`, naming the pinned package of E2 (`06` §4.4, **C3**).
- **Every field explicitly, except `steps`** (`06` §5.1). The schema's defaults exist so
  hand-written fixtures stay short, not so saved files can be sparse. `steps` is omitted when the
  mapping is continuous, because its absence is a meaning rather than a default value.
- `null` nowhere except a palette entry's `tileId` (`06` §5.1, §7.3).

---

## 12. Diagnostics

### 12.1 Validation errors come from import

E5 makes an in-editor `ValidationError` unreachable: if every edit is a legal transition, no
sequence of editor actions produces a file `validate()` would reject.

`06` §10 says validation "runs at load, and continuously in the editor," and both halves stand,
doing different jobs:

| Context     | `validate()` is | On failure                                                            |
| ----------- | --------------- | --------------------------------------------------------------------- |
| **Import**  | a gate          | the file is not opened; §12.4                                         |
| **Editing** | an assertion    | a development-build failure. It is an editor bug, not an author error |

**Invariant E15** — _A `ValidationError` surfaced to an author always originates at import. A
validation failure during editing is a defect in the editor's edit vocabulary._

This sharpens `06` §10.2 rather than contradicting it. That section justifies `path` and `code` on
the grounds that the editor must highlight the offending field and branch to offer a repair, and
both requirements stand — but they are requirements on the **import screen**, which is the one
place in the editor with no file and therefore no preview (§12.4). The frequency and the setting
are entirely different from what a reader of `06` §10.2 alone would picture.

### 12.2 Advisory diagnostics

`06` §10.4 sends every advisory here: a legal config that renders exactly as specified and is
still worth telling an author about.

**Invariant E16** — _An advisory never blocks an action, never modifies the file, and is never
reported as an error. `06` **C6** admits no severity axis at load; an advisory exists only where a
human is present to act on it._

`06` §10.1 gives the reasoning: a warning is either ignorable, in which case a load-time function
should not have produced it, or fatal, in which case calling it a warning made the failure look
optional. The editor is the different context that section names.

**The four from `06` §10.4:**

| #   | Diagnostic                                                          | Reachable from editing?                                        |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `columns` parity does not match `horizontalAlignment`               | **No** — §9.3 re-derives on every toggle. Import only          |
| 2   | `reseedOnLoad: true` on an Operation whose Source is not stochastic | **No** — §8.4 offers the control only where it means something |
| 3   | A `rect` Selection lying wholly outside the grid                    | **Yes** — §9.4, after a design-width change                    |
| 4   | `columns × cellSize < referenceWidth`                               | **No** — `02` §7.1's parity correction always rounds upward    |

Three of the four are unreachable from inside the editor, which is E1's table read from the other
side: they are legal precisely because the guarantee that prevents them is manufactured here and
enforced nowhere. An imported file can carry all four, and none of them is repaired silently.

**Five more, coined here:**

| #   | Diagnostic                                                                                                   | Traced to                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 5   | The document is legal but has nothing to draw — empty `tiles` or `operations`, or every palette entry `null` | `08` §3.4, which routes _whether it is worth exporting_ here explicitly                                 |
| 6   | Two Tiles share a `name`                                                                                     | `06` §5.3 — disambiguation is `09`'s, and E5 forbids blocking the rename                                |
| 7   | A non-square asset will be centre-cropped                                                                    | `07` **R8**, computed from the `meta.width`/`height` **E13** wrote and nothing else reads               |
| 8   | A palette is reordered under a `random` Source, where order is meaningless                                   | `04` §6.4's _accepted, not a defect_ — the §7.6 bar implies a spatial meaning `random` does not deliver |
| 9   | A stepped mapping on `rotation` whose range endpoints coincide modulo 360                                    | `04` §6.2's `[0, 360]`-with-`steps` gotcha — one value twice as likely                                  |

Diagnostic 7 is the only consumer of `meta.width` and `meta.height` in the entire package. `07`
§4.4 records them as written for a future that does not exist yet; this gives them a present use
that costs nothing and requires no measurement at render time.

### 12.3 Asset failures

`onAssetError` is wired always (**S6**), and a failure — resolution or load — surfaces as a
prominent editor condition rather than a console line. `07` §4.3 accepts that a production host
may never wire the channel and get a silently incomplete background; the editor has no excuse,
because the author is present and the tile is missing from the picture they are approving.

The empty cell is `07` **R3**'s and is not filled with a placeholder. **The editor draws no
substitute in the preview either** — a placeholder glyph in the preview is a drawable the renderer
did not choose in a cell **R3** says must draw nothing, and it would misrepresent the picture the
author is approving. The failure is reported beside the preview, not inside it.

### 12.4 Import

`validate()` takes a parsed value, not text (`06` §10), so JSON syntax errors belong to
`JSON.parse` and are reported separately from validation errors.

On a non-empty `ValidationError[]`, **the file is not opened.** `08` **S3** forbids mounting
`<Tileset>` on an invalid file, so the import screen has no preview and cannot have one. It lists
the errors, each located by its JSON Pointer and identified by its stable code (**C7**), and
offers no automatic repair.

**No partial import.** `06` **C6**: a file validates completely or not at all. Opening the legal
parts of an invalid file would produce a document the author did not write, and saving it would
overwrite the file they did.

`SCHEMA_VERSION_UNKNOWN` deserves its own message: it means the file was written by a newer build
(`06` §4.1), and the action is to update the editor rather than to fix the file. `06` §4.2's
warning belongs on this screen too — a file that loads cleanly is evidence of nothing about what
it will render, because output stability is the package version's job (**X9**) and no field in
the file can detect it.

---

## 13. Invariants summary

| ID      | Invariant                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1**  | The guarantees of §3's table are the editor's to produce. Writing a file that violates one is a specification failure.                         |
| **E2**  | The preview component and the `engineVersion` writer come from one pinned package version.                                                     |
| **E3**  | The editor's document state is a `TilesetFile` plus transient UI state. There is no second document model.                                     |
| **E4**  | The editor writes nothing into `meta` beyond `07` §4.4's three keys.                                                                           |
| **E5**  | Every file-touching action is a total transition from a legal file to a legal file. In-flight input lives in the control.                      |
| **E6**  | Undo restores a whole `TilesetFile`. No action is outside the stack, including the design-width change.                                        |
| **E7**  | One overlay: low-opacity rectangles over the selected cells, in the Operation's Selection section, drawn from `cellBox`.                       |
| **E8**  | Overlay cell sets come from the engine's `selection()` export. The editor implements no Selection test.                                        |
| **E9**  | The `ParamSpec` → affordance mapping is total. A registered type needs no editor code.                                                         |
| **E10** | The load-preview control writes nothing to the file.                                                                                           |
| **E11** | Preview width sets `Wpx` and writes no field. It is not destructive.                                                                           |
| **E12** | Changing `referenceWidth`, `cellSize`, or `horizontalAlignment` re-derives `columns` and is confirmed where coordinate-bound Selections exist. |
| **E13** | An asset attach measures and writes `src`, `width`, and `height`, or it fails.                                                                 |
| **E14** | Export produces a file and an asset folder; every `meta.src` is relative to that folder.                                                       |
| **E15** | A `ValidationError` an author sees always originates at import. One during editing is an editor defect.                                        |
| **E16** | An advisory never blocks, never modifies the file, and is never reported as an error.                                                          |

---

## 14. Extension points

| Point                                                                           | Status                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persisted editor state — collapsed panels, muted Operations, selection          | `[POSTPONED]` — three shapes and none is V1: a sidecar file (a new artifact `06` does not know about), a top-level `editor` block (`schemaVersion` bump, a key no consumer reads), or `meta` (**forbidden by E4**, since **R4** makes it permanent) |
| Image export from the editor                                                    | `[POSTPONED]` — §14.1                                                                                                                                                                                                                               |
| A public config-writing surface — docs, or checks, for third-party writers      | `[EXTENSION POINT]` — §3.1. Costs the promotion of §3's table into published prose or into code; `validate()` and **C7** already ship. Reverses no argument in the package and needs no change to `00` §5.2                                         |
| An explicit region on spanning Sources — `gradient { angle, over? }`            | `[EXTENSION POINT]` — §14.2. **Owned by `04` and `05`, raised here.** Minor engine bump; no `schemaVersion` bump                                                                                                                                    |
| Selection composition in the overlay — `and` / `or` / `not`                     | `[EXTENSION POINT]` — inherited. §6.2's `selection()` export takes an `operationId` and returns a predicate, so composition arrives with no change to this document's surface                                                                       |
| A registered type's `editor` block growing beyond label / description / control | `[EXTENSION POINT]` — package-internal (`06` §7.4), so it costs no bump of any kind. E9's totality means every addition stays optional                                                                                                              |
| Migrating orphaned Selections rather than reporting them                        | `[POSTPONED]` — §9.4 rejects it on the grounds that proportional and absolute are both defensible and choosing silently is coercion. Would need a stated rule the author can predict                                                                |

### 14.1 Image export

An editor-only feature: the author asks for a picture of the tileset without running the renderer
themselves. It is not a component or engine feature, and its cost is **editor-only** — nothing
pins the editor's version, so no version number anywhere moves. This is the first row in the
package needing that tier, and it closes `roadmap` open question 3.

**It is not free, and the objection is `00` §8.2's rather than `00` §5.2's.** A rasterizer is not
the preview, so _no second renderer_ is untouched. But an exporter that draws differently from the
preview produces a picture that is not the one the author approved, and it fails in the one place
they cannot check by looking — they are looking at the preview.

**SVG serialization is the cheap route and PNG falls out of it.** `07` §3.1 states every rule
substrate-neutrally so that exactly this is possible, and §6.4 already names
`preserveAspectRatio="xMidYMid slice"` as the SVG expression of **R8**. More usefully, **R15**
ships exact vector tables for geometry and transform, so an SVG serializer built from `cellBox` and
the six-tuple is _testable against the contract_ rather than being a blind second implementation.
Paint order is document order (**R10**, as `08` §4.2 gets it in DOM) and clipping is one
`clipPath` on the render box (**R9**). Rasterizing that SVG through the browser adds no second
geometry implementation anywhere.

The residue is `07` §11.3's compositing row and nothing else, which is a far narrower gate than
the pixel-comparison artifact `05` Q5 rejected. Whether the two should be built together is that
row's question, not this one's.

### 14.2 An explicit region on spanning Sources

Raised here because it is an authoring problem and it has no home otherwise; **owned by `04`**,
which specifies Source semantics, and `05`, which owns the registry. Nothing about it is settled
by this document.

`04` §5.1 requires spanning Sources to normalize across the whole `rows × columns` — emphatically,
because a `gradient` normalized over the visible region only would drift its midpoint off the
viewport centre by exactly the bleed. The consequence an author meets is that a `gradient` under a
two-column `rect` samples two adjacent positions on a grid-wide ramp and comes out nearly flat,
which is nearly `constant`, and is not what they meant.

**Bounding-box-of-the-selection is the tempting fix and it loses.** For `random` at any moderate
density the bounding box is the whole grid with near-certainty, and for `all` and `checkerboard` it
always is — so a `domain: "selection"` switch would be a parameter whose behaviour depends on which
Selection preset happens to sit beside it, doing nothing at all for four of the six. It is only
meaningful for the coordinate-bound two (`04` §4.4), and the package has consistently refused to
let one field's meaning depend on another's value.

An explicit region on the Source states the intent instead of inferring it:

```
gradient { angle, over?: [x, y, width, height] }        // absent = the whole grid
```

**O4** stays closed — the region is a config parameter, not a `ctx` field, so the Source still
learns nothing about what selected. **O2** is untouched. It is strictly more expressive than the
bounding box, since the ramp may span a region larger or smaller than the selection. And it is the
cheapest possible arrival: `06` §4.3 row 5 makes a registered type's parameter-schema change **not**
a `schemaVersion` bump, and `05` §10.2 makes a parameter with a behaviour-preserving default a
**minor engine bump**. No picture already drawn moves.

V1 ships `04` §5.1's behaviour unchanged.

---

## 15. Open questions

| #   | Question                                                                                | Status                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the editor ever want `cellAt` bounded? (`07` Q6, `08` Q6)                          | **Resolved** — §7.3. Unbounded, and bounded at the call site per tool: the `rect` drag does not bound, the `cellList` brush does. One comparison either way, as `07` §8.2 predicted.                                                                                          |
| 2   | What authoring ranges should the editor impose on `scaleX` / `scaleY`? (`03` Q4)        | **Resolved** — §7.5. A soft track of `[−2, 2]` that extends to contain any typed value, and never clamps one. The figure is a UI constant with no authority.                                                                                                                  |
| 3   | How does the editor present a palette so that order reads as meaningful? (`04` Q3)      | **Resolved** — §7.6. A contiguous weight-segmented bar rather than a list, against the plain unordered list a Tile's assets get under **D3**. The two adjacent lists take opposite rules and the presentation has to say so.                                                  |
| 4   | Repair of an orphaned `rect` versus an orphaned `cellList`. (`04` Q4)                   | **Resolved — there is no repair.** §9.4. Nothing is migrated; the confirmation names what is at risk, an advisory carries it afterwards, and undo restores the file whole. `04` §4.4's distinction survives in the advisory's wording, not in a repair.                       |
| 5   | Should a registered type carry a human-readable description? (`05` Q6)                  | **Resolved — yes, and more.** §7.2: an optional `editor` block carrying `label`, `description`, and an affordance hint. Package-internal, never a wire format, never read by the engine, never required.                                                                      |
| 6   | Does the cost vocabulary need a tier for _changes the editor only_? (`roadmap` Q3)      | **Resolved — yes.** §14.1 is the first row needing it. Cost: none in the package's terms, because nothing pins the editor's version.                                                                                                                                          |
| 7   | Does asset authoring belong to `roadmap` or here? (`roadmap` Q1)                        | **Resolved as `roadmap` proposed, with the line drawn at bundling.** §11.1 takes import, attach, the library UI, and export of the folder. Optimization, source formats, and sprite sheets stay in `roadmap` §4.4.                                                            |
| 8   | Should the editor's own asset store be specified?                                       | **Open.** §10.4 and §11.2 require the editor to load an asset it has not yet exported, and say nothing about where it lives — IndexedDB, the file system, a server. It is an implementation question until an editor exists in more than one deployment shape.                |
| 9   | Is the `selection()` export enough, or will an overlay eventually want per-cell values? | **Open.** E7 ships one overlay and nothing in V1 wants more. Showing an Operation's mapped value per cell would need a second export of the same shape, and `08` §4.5's refusal of a grid callback would have to be revisited. No instance has arisen.                        |
| 10  | Does the mute-by-removal of §4.1 confuse an author when it does not survive a reload?   | **Open.** It is correct — **G3** returns the Operation's exact randomness — and it is invisible in the file, which is the point. Whether that reads as a feature or as data loss is an implementation-time observation, and it is the strongest argument for §14's first row. |
| 11  | Completeness.                                                                           | **Resolved.** All three harvests have run — `01` §15 Q6, `roadmap` §1.1, `00` §13 Q5. The three amendments this row recorded as owed to `02` and `04` had already landed when it was written; `_harvest.md`'s tail carries the correction and `00` §10.2 counts it.           |
