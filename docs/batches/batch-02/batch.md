# Batch 02

## Summary

| ID   | Backlog      | Task                                             | Tier         | Areas                                          | Session | Depends on |
| ---- | ------------ | ------------------------------------------------ | ------------ | ---------------------------------------------- | ------- | ---------- |
| T-01 | B-011        | Drag to draw a Rect selection                    | contained    | operations-ui, editor-shell                    | A       | –          |
| T-02 | B-012        | Hide/unhide operations                           | contained ⚖️ | operations-ui, editor-shell                    | A       | T-01       |
| T-03 | B-023        | Explainer opens where it fits                    | contained ⚖️ | ui-kit                                         | B       | –          |
| T-04 | B-005        | Editable name for every operation, saved in file | big          | schema (contract), editor-state, operations-ui | –       | –          |
| T-05 | B-010        | Rotation persists into a later tileId operation  | big          | engine                                         | –       | –          |
| T-06 | B-009        | `everyNth` semantics + Row/Column selection      | big          | engine, schema (contract)                      | –       | –          |
| T-07 | B-008        | Offset/Scale X+Y as one attribute                | big ⚖️       | schema (contract), engine, operations-ui       | –       | –          |
| T-08 | B-007        | Share a pattern between operations               | big          | schema (contract), engine, operations-ui       | –       | –          |
| T-09 | B-006        | Grid & Size vs Breakpoints rethink               | big          | editor-shell, schema, renderer                 | –       | –          |
| T-10 | B-016, B-017 | Starter tiles and tilesets; onboarding           | big          | editor-shell, editor-io, ui-kit                | –       | –          |

**Not in this batch:**

- B-013 (scroll past the editor). Batch 01 T-04 fixed the one case that reproduced. It needs the file or the state Pol saw it in.
- B-022 (chosen `Toggle` segment unreadable on hover). **Already fixed on `dev`** by 537507b (batch 01 review): `Toggle.svelte` scopes `:hover`/`:active` to `:not([aria-checked="true"])`. Move it to Done at the next BACKLOG update; no task.

**Areas, as used here.** `App.svelte`, `lib/preview/*` and `lib/sections/*` are editor-shell;
`lib/operations/*`, `lib/PaintLayer.svelte`, the new `lib/RectLayer.svelte` and `paint.ts` are
operations-ui; `lib/ui/*` is ui-kit. Session A is the only one that edits `App.svelte`.
`icons.ts`, `tokens.css` and `DESIGN_SYSTEM.md` are append-only (A and B may both append).

**Tier notes (⚖️):**

- T-02: contained only if hiding lasts while the editor is open (D-02 A or C). Saving it in the file is a new `Operation` field → big.
- T-03: contained, not trivial, because where the explainer opens is a behaviour choice (D-04).
- T-07: one card writing two operations would be contained; one attribute is a schema bump. The choice comes first, so big.

## Decisions needed

### D-01 (T-01) What happens when a drag goes past the grid's edge?

Context: The Rect selection has four number fields (x, y, width, height). Dragging on the preview
will set them. The fields already accept a rectangle larger than the grid: the part outside draws
nothing now and fills in if the grid later grows.

- **A)** The rectangle stops at the grid's edge while you drag: it is exactly the cells you see. The fields can still be typed past the edge.
- **B)** The rectangle follows the pointer past the edge, so dragging off the grid also covers columns or rows the grid may gain later.

Recommendation: **A**. What you drag is what you get, and an invisible part of a selection is the
kind of surprise B-014 had to clean up. B stays possible through the fields.

Answer: The rectangle follows the pointer past the edge, but past it it does not cover any more cells. That is, the UX should be the one from B, but the resulting selection should be the one from A.

### D-02 (T-02) Should hidden operations stay hidden after saving?

Context: Hiding lets you compare the tileset with and without an operation, without deleting it.

- **A)** Only while the editor is open. Export and reload show every operation. Nothing in the file changes.
- **B)** Saved in the file: a hidden operation stays hidden in the editor and on every website that uses the tileset. Needs a new file version (**makes T-02 big**).
- **C)** Like A, but exporting with hidden operations asks whether to drop them.

Recommendation: **A**, because it changes nothing in saved files, and the preview already draws a
derived file (the live draft), so this follows a path the editor already has.

Answer: A

### D-03 (T-02) Does "Export image" leave hidden operations out?

Context: Export image draws a picture from the saved file today. With D-02 A, the `.json` export
always holds every operation.

- **A)** Yes: the image is what the preview shows, hidden operations left out (it already follows the preview's colour).
- **B)** No: the image always matches the saved file, whatever is hidden.

Recommendation: **A**. An image is a picture of the preview; someone who hides an operation and
exports an image expects to get what they are looking at.

Answer: A

### D-04 (T-03) Where should a tall explainer open?

Context: "How operations work" opens upward from the Operations header and is taller than the
room above it, so its last note scrolls inside the panel. Today an explainer opens below its
button, or above it when less than 420 px are left below.

- **A)** Beside the sidebar, over the preview, using the window's full height. In the stacked layout below 40rem (no room beside the sidebar) it falls back to B.
- **B)** Above or below its button, whichever side has more room. It still scrolls when it is taller than that side.

Recommendation: **A**. At common window heights "How operations work" is taller than either side
of its button, so B still cuts it off. Beside the sidebar it nearly always fits, and it covers the
picture rather than the controls it explains.

Answer: A, but don't use the full preview width, just a part of it. Try not to cover a lot of space from the preview.

## Contained tasks

### T-01 Drag to draw a Rect selection (session A)

Goal: While editing an operation whose Selection is Rect, the user drags on the preview to set the rectangle.
Approach: A pure `rectFrom(a, b, bound?)` in `paint.ts` (tested) returns `{ x, y, width, height }`
from two cells: the smaller corner and an inclusive size, so a click gives a 1×1 rectangle. Per
D-01 A it clamps both cells to the grid; per B it does not. A new `lib/RectLayer.svelte` (with a
docs page) does the gesture the way `PaintLayer` does: pointer capture, the cell from
`toRenderSpace` + `cellAt` (unbounded, as the table at the top of `paint.ts` says; any clamp is
D-01's, in `rectFrom`), a dashed outline of the rectangle being dragged, and a readout
("x, y · w × h"). Every move writes the four values into `draft.selectionParams`, as
`paintCells` does, so the number fields and `SelectionOverlay` follow live. `App.svelte` mounts
it beside `PaintLayer`.
Which Selection gets the layer is decided by its **parameter shape**, not its name: a schema whose
params are exactly the integers `x`, `y`, `width`, `height` (`rectParams(schema)` in `paint.ts`,
tested). Write why at the point of use. Rejected: a registry flag (changes the Registry contract →
big), and `selectionType === "rect"` (the editor names no Selection type).
Areas: operations-ui, editor-shell
Decisions: D-01
Acceptance criteria:

- Dragging in any of the four directions sets the fields; a click makes a 1×1 rectangle; the overlay follows during the drag.
- `pointercancel` and Esc end the drag. The number fields stay the keyboard path and still accept values past the grid.
- The layer is absent for every other Selection.
- `paint.test.ts` covers `rectFrom` (four directions, a click, the clamp if D-01 A) and `rectParams`.
- Docs pages for `RectLayer` (new) and `paint` updated.

Risks: `PaintLayer` and `RectLayer` must never both mount. No Selection has both shapes; say so in
a comment in `App.svelte` and let the `cellList` brush win if one ever does.

### T-02 Hide/unhide operations (session A, after T-01)

Goal: The user can hide an operation to see the tileset without it, then show it again.
Approach (D-02 A): A set of hidden operation ids in the preview view state
(`lib/preview/view.svelte.ts`), never in the file. A new pure
`withoutHidden(file, hidden, exceptId)` in `lib/preview/visibility.ts` (tested, with a docs page)
returns the file minus those operations. `App.svelte` draws
`withoutHidden(drawn ?? file, preview.hidden, <id of the operation open for editing>)`: an
operation open for editing is drawn even when hidden, because you cannot edit what you cannot see,
and it hides again when closed. An eye `IconButton` (`aria-pressed`, label "Hide opN" / "Show
opN") sits in `OperationCard`'s actions, before re-seed; a hidden card is dimmed and says
"Hidden" in text. The two icons are appended to `icons.ts`. Ids no longer in the file are pruned
from the set, because an id can be given again after the newest operation is deleted. Per D-03 A,
`ExportImage` draws the same filtered file. Advisories, `shapedAt`, the `.json` export and undo
keep reading the saved file. If D-02 is C, Export also asks before writing, with "Keep all" as the
default.
Areas: operations-ui, editor-shell
Decisions: D-02, D-03
Acceptance criteria:

- A hidden operation has no effect on the preview (and on Export image, per D-03); opening its card shows it again until the card closes.
- The card is marked hidden by more than colour; the toggle works by keyboard; its target is at least 24×24 px.
- Export, undo and reload are unaffected; reloading shows every operation.
- A new operation that gets a deleted operation's id starts visible.
- `visibility.test.ts` covers the filter, the open-operation exception and pruning.
- Docs pages `operation-card`, `operations-section` and the view state page updated.

Risks: anything that reads the drawn file instead of the saved one (warnings, export) would
silently drop hidden operations; the reviewer checks every reader of `shown`. The closed card's
header at the narrowest sidebar (400 px) gains a button and must wrap, not overflow.

### T-03 Explainer opens where it fits (session B)

Goal: Every explainer can be read without scrolling inside it whenever the window is tall enough.
Approach: Placement stays in `lib/ui/popover.ts` (tested). The panel's real height is measured
after it mounts, instead of the fixed 420 px guess in `Explainer.svelte`. Per D-04 A: a new
`placeBeside(sidebar, viewport, height)` puts the panel to the right of the sidebar, its top
clamped so the whole panel stays inside the window; in the stacked layout (below 40rem) it falls
back to the larger-side rule. Per D-04 B: only the larger-side rule, with the measured height.
`Explainer.svelte` finds the sidebar with `anchor.closest("aside")`, so its three callers
(`OperationsSection`, `SidebarFooter`, `OperationBody`) do not change; `OperationsSection` is
session A's in this batch. Record the placement in `DESIGN_SYSTEM.md` (append).
Areas: ui-kit
Decisions: D-04
Acceptance criteria:

- "How operations work", "How randomness works" and "How noise works" open without inner scroll at 1280×700 and 1440×900.
- At 320 px wide, every explainer stays inside the window.
- Focus, Esc, ✕ and press-outside behave as today, and focus returns to the trigger.
- `popover.test.ts` covers the new rule, including a panel taller than the window (it scrolls, top at the margin).

Risks: with D-04 A the panel no longer sits next to its button; check the trigger stays visible and
the panel's heading says what it explains.

## Big tasks

Not planned here. Each runs in its own interactive session with Pol. Nothing in this batch depends
on them. Their questions are not under _Decisions needed_ on purpose: they do not block this batch.

- **T-04 (B-005) Editable name for every operation, saved in the file** (batch 01 D-05). A new optional `name` on `Operation`: `types.ts`, a `validate.ts` rule, a v4 → v5 step in `migrate.ts`, and the editor (inline edit on the card, likely with `InlineEdit`). Engine and renderer ignore it, so output is unchanged. Questions: what a card shows with no name (today's summary, or `op3`); whether names must be unique; whether notices ("Open op3") use the name; length limit. If T-02 runs first, its "Hide opN" labels should use the name.
- **T-05 (B-010) Rotation persists into a later tileId operation.** How the engine works, not a bug: each cell keeps what earlier operations wrote (`generate.ts`). Batch 01 T-07's explainer now says so. Question: **(a)** keep it and close B-010; **(b)** choosing a tile resets the cell's rotation, scale, offset and opacity, which changes how every existing file looks; **(c)** a per-operation "reset the cell first" option, a new file version. Recommendation: (a).
- **T-06 (B-009) `everyNth`.** Today it already _is_ a row/column selection. Question: rename it "Row/Column" (old files upgraded automatically) and add a new "Every Nth" that counts cells across rows? The new one's pattern moves whenever the column count changes, which includes every breakpoint and resize.
- **T-07 (B-008) Offset and Scale as one attribute.** Question: one card that writes an X and a Y operation together (no file change, contained), or one attribute with X/Y inside (new file version)?
- **T-08 (B-007) Share a pattern.** Random values are tied to each operation, so two operations with the same Noise settings still get different values. Question: share the _settings_ (each still varies) or the _values_ (same noise on both)? The second changes the file format.
- **T-09 (B-006) Grid & Size vs Breakpoints.** A workflow redesign. Known: Grid & size has no Columns field because columns follow from cell size and design width; in a breakpoint, cell size alone changes nothing visible under fluid sizing (`BreakpointsSection.svelte`'s header).
- **T-10 (B-016, B-017) Starter tiles and tilesets; onboarding.** Changes how adding tiles works and adds a guided first run. Own session.

## Execution order

- No big task blocks this batch.
- Sessions run in parallel:
  - **A** (operations-ui, editor-shell, owns `App.svelte`): T-01 → T-02. In sequence because both edit `App.svelte`.
  - **B** (ui-kit): T-03
- Both may append to `icons.ts` and `DESIGN_SYSTEM.md`; the review reports any conflict.
