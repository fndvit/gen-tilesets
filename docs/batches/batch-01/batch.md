# Batch 01

## Summary

| ID   | Backlog             | Task                                                     | Tier         | Areas                                    | Session | Depends on |
| ---- | ------------------- | -------------------------------------------------------- | ------------ | ---------------------------------------- | ------- | ---------- |
| T-01 | B-003               | Grid button → On/Off switch                              | trivial      | editor-shell                             | A       | –          |
| T-02 | B-015               | Point the fresh-load hint at "Assets on load"            | trivial ⚖️   | editor-shell                             | A       | –          |
| T-03 | B-001               | Re-order sidebar sections; place Derived                 | contained    | editor-shell                             | A       | T-01, T-02 |
| T-04 | B-013               | Scroll past the editor (bug)                             | contained ⚖️ | editor-shell                             | A       | T-03       |
| T-05 | B-014               | Painted cells outside the grid: remove them; fix wording | contained    | editor-state, editor-shell               | A       | T-04       |
| T-06 | B-004               | Tile motif in the sidebar's free space                   | contained    | editor-shell                             | A       | T-05       |
| T-07 | B-018, B-019, B-010 | (i) explainers for Operations and Randomness             | contained    | editor-shell                             | A       | T-06       |
| T-08 | B-002               | Sticky section headers                                   | trivial ⚖️   | ui-kit                                   | B       | –          |
| T-09 | B-020               | Scroll opened content clear of the footer                | contained ⚖️ | ui-kit                                   | B       | T-08       |
| T-10 | B-005               | Editable name for every operation, saved in the file     | big          | schema (contract), editor-state, operations-ui | –  | –          |
| T-11 | B-021               | Reseed on load from a closed card                        | contained    | operations-ui, editor-shell              | A       | T-07       |
| T-12 | B-010               | Rotation persists into a later tileId operation          | big          | engine                                   | –       | –          |
| T-13 | B-009               | `everyNth` semantics + Row/Column selection              | big          | engine, schema (contract)                | –       | –          |
| T-14 | B-008               | Offset/Scale X+Y as one attribute                        | big ⚖️       | schema (contract), engine, operations-ui | –       | –          |
| T-15 | B-007               | Share a pattern between operations                       | big          | schema (contract), engine, operations-ui | –       | –          |
| T-16 | B-006               | Grid & Size vs Breakpoints rethink                       | big          | editor-shell, schema, renderer           | –       | –          |
| T-17 | B-016, B-017        | Starter tiles and tilesets; onboarding                   | big          | editor-shell, editor-io, ui-kit          | –       | –          |

**Not in this batch:** B-011 (drag to draw a Rect selection) and B-012 (hide/unhide operations).
Both are contained, but both need `App.svelte`, which session A holds for its whole run; in this batch
they would wait for A's merge anyway. They go first in batch 02.

**Areas, as used here.** `lib/sections/*` (including `OperationsSection` and `SidebarFooter`) and
`lib/preview/*` are editor-shell; `lib/ui/*` (`Collapsible`, `ScrollArea`, `Explainer`) is ui-kit;
`lib/operations/*` is operations-ui. Session A is the only one that edits `App.svelte` and
editor-state. `tokens.css` and `DESIGN_SYSTEM.md` are append-only (A and B may both append).

**Tier notes (⚖️):**

- T-02: trivial because the wording is written in this plan; the option Pol asked about already exists ("Assets on load: Reseed").
- T-04: contained because the cause is unknown; finding it is the work.
- T-08: trivial as CSS. A header sticks within its own section card, so the open section's header stays reachable, which is what B-002 asks for. Headers stacking under each other would be a behaviour choice → contained.
- T-09: contained because how far to scroll is a behaviour choice (decided in the plan below).
- T-10: big after D-05. A name saved in the file is a new `Operation` field, so a schema bump (v4 → v5) with a migration step.
- T-11: contained after D-06, not trivial: two areas (`OperationCard` in operations-ui, the write in `OperationsSection`, editor-shell). It runs in session A because T-07 also edits `OperationsSection`.
- T-14: one card writing two operations would be contained; one attribute is a schema bump. The choice comes first, so big.

## Decisions needed

### D-01 (T-03) In what order should the sidebar sections be?

Context: Today it is Grid & size → Breakpoints → Derived → Tiles → Operations. Breakpoints is used
rarely but sits second.

- **A)** Grid & size → Tiles → Operations → Breakpoints. The order you build a tileset in; the rarely used section last.
- **B)** Tiles → Grid & size → Operations → Breakpoints. Starts from what you draw; the size comes after.
- **C)** Grid & size → Breakpoints → Tiles → Operations. Today's order without Derived; size settings stay together.

Recommendation: **A**, because it follows the steps a new user takes, and Grid & size stays first as
it is today.

Answer: A

### D-02 (T-03) Where should the Derived information go?

Context: Derived is read-only: columns, grid width and height, visible height, bleed, how many tiles
and operations, engine and schema version. Almost all of it follows from Grid & size's fields.

- **A)** Inside Grid & size, as a folded "Details" part at its bottom. You see the numbers next to the fields that change them.
- **B)** One line under Grid & size's fields ("12 columns · 960 × 640 px"); the version numbers move to the top bar's menu, and the counts go.
- **C)** Keep it as its own section, last.

Recommendation: **A**, because the numbers sit next to the fields that cause them and nothing is lost.

Answer: A

### D-03 (T-05) What should the user be able to do about painted cells outside the grid?

Context: A Handpick selection can hold cells outside the grid (after a resize, or in an imported
file). They cannot be seen in the preview, so they cannot be painted out. The warning says "Undo
puts the grid back", which is wrong after an import: Undo goes back to the previous document.

- **A)** The warning gets a "Remove N cells outside the grid" button (one step, undoable). When the file was opened or imported with those cells, the text says so and does not mention Undo.
- **B)** A, plus a "Grow the grid to fit them" button.
- **C)** Remove them silently when a file is opened. The user never sees the warning, but the file changes without being told.

Recommendation: **A**. It solves both problems with one button; B adds a second way to resize the
grid from a warning, which is easy to press by mistake.

Answer: A

### D-04 (T-07) Is the text of the two (i) explainers right?

Context: Both open the existing explainer popover (as "How noise works" does), from an (i) button
in the Operations header and in the Randomness footer. The text, as drafted:

**How operations work**

- _Intro:_ "Operations run in order, from the top of the list to the bottom, and each one runs on every cell. An operation can only change the cells it selects, and a later one paints over what an earlier one wrote."
- _Selection:_ "Which cells the operation changes: all of them, a checkerboard, a rectangle, every Nth row or column, a random share, or cells you paint by hand."
- _Pattern:_ "Gives each selected cell a value: Random, Noise (smooth patches), Gradient (a slope across the selection) or Constant (the same everywhere)."
- _Attribute:_ "What the value changes: which tile is drawn, or its rotation, scale, offset or opacity."
- _Blend:_ "How the value meets what earlier operations wrote: replace it, add to it, or multiply it."
- _Advice:_ "A cell keeps everything earlier operations gave it. If an operation rotates a cell and a later one picks its tile, the new tile is drawn rotated. To change that, move the operations or select different cells."
- _Note:_ "The number on a card is its place in the list. Use the ⋯ menu to move an operation earlier or later."

**How randomness works**

- _Intro:_ "Everything random in the tileset follows from one seed. The same seed always gives the same picture."
- _Seed:_ "Changes every operation at once. Type any word, or press New seed."
- _Re-seed (on an operation's card):_ "New random values for that one operation. The others stay as they are."
- _Reroll assets:_ "When a tile has several pictures, picks other pictures for the same cells. No operation changes."
- _Assets on load / Reseed on load:_ "Make every visit to the page different. Assets on load picks other pictures on each load; an operation's Reseed on load gives it new values on each load."
- _Advice:_ "Preview a fresh load shows what another visitor could see. It changes nothing in the file."
- _Note:_ "Seeds and re-seeds are saved in the file, so the tileset looks the same wherever it is used, unless something reseeds on load."

(After D-05, T-10 is not in this batch, so the operations _Note_ stays as written.)

- **A)** Approve as written.
- **B)** Approve with the edits I write here.

Recommendation: **A**. The operations text also answers B-010 (see T-12).

Answer: A

### D-05 (T-10) What should mark an operation so you can follow it in the list?

Context: The square on each card shows its position (1, 2, 3…), which changes when you move it.
Every operation has a permanent id (`op3`).

- **A)** The square shows the number from the id (op3 → 3). It stays the same when the operation moves. The list order is still visible from the cards' order.
- **B)** Each operation gets a colour from a set of 8, chosen from its id. The square keeps the position number.
- **C)** Both: the id number on a coloured square.

Note: when the newest operation is deleted, the next new one gets its number again.

Recommendation: **A**, because a number is readable by colour-blind users and does not compete with
pink, which in this editor means "editing now". Colour can be added later.

Answer: Add an editable, editor-only 'Name' attribute for every operation. Keep the rest as it is

Triage after the answer (Pol, 2026-11-08): the name is **saved in the file**. That is a new `Operation` field, so T-10 is now a big task (see Big tasks) and does not run in this batch. Cards keep their position number.

### D-06 (T-11) Re-seeding an operation without opening it already exists. What now?

Context: Every closed card has a re-seed button (the circular arrows), with "Re-seed op3" as its
tooltip. The backlog item suggests it was not found.

- **A)** Drop B-021: it is done.
- **B)** Keep the button and make it easier to spot: a visible hint on hover and focus, "New random values for this operation only", like the footer's buttons.

Recommendation: **B**, since the request shows the button was not noticed.

Answer: I meant to be able to check the "Re-seed on load" option on those operations where it applies, even when the operation is folded.

Triage after the answer: T-11 is now the Reseed on load toggle on the closed card (planned under Contained tasks). The re-seed button stays as it is.

## Trivial bundles

### Bundle B1 (editor-shell), session A

- T-01 Grid button → On/Off switch: in `PreviewTopBar.svelte`, replace the Grid button with the existing `Toggle` (`label="Grid"`, options `Off`/`On`, value `preview.showGrid`), sized to its content rather than the row (`Toggle` fills its row by default; constrain it from the top bar, not by editing `Toggle`). Remove the button's CSS. Update `preview-top-bar` docs page.
- T-02 Fresh-load hint: in `SidebarFooter.svelte`, the disabled `freshLoadHint` becomes "Nothing reseeds on load, so every load looks the same. Set Assets on load to Reseed, or turn on Reseed on load in an operation." Update its docs page if it quotes the old text.

### Bundle B2 (ui-kit), session B

- T-08 Sticky section headers: in `Collapsible.svelte`, the `section` variant's header gets `position: sticky; top: 0`, the card's background, and a `z-index` below `ScrollArea`'s thumb (`z-index: 3`). Keep the open rule (inset shadow) visible when stuck. Record in `DESIGN_SYSTEM.md` (append).

## Contained tasks

### T-03 Re-order sidebar sections; place Derived (session A)

Goal: The sidebar sections follow one clear order, and the Derived numbers sit where they make sense.
Approach: Reorder the sections in `App.svelte` per D-01. Per D-02: for A, move `DerivedSection`'s
list into a folded "Details" part at the bottom of `GridSection` (reuse `Collapsible`, not a new
component), and remove `DerivedSection` and its docs page; for B, a one-line summary in
`GridSection`; for C, only the order changes. Any number logic moved stays in a `.ts` file.
Areas: editor-shell
Decisions: D-01, D-02
Acceptance criteria:

- The sections appear in the chosen order; keyboard Tab order follows it.
- Every number Derived showed is still shown (A, C) or deliberately removed (B), and stays correct when Grid & size changes.
- Docs pages for every changed or removed file are updated; the docs build passes.
  Risks: removing `DerivedSection.svelte` needs its docs page removed in the same commit, or the docs coverage gate fails.

### T-04 Scroll past the editor (session A)

Goal: At window sizes where the editor fits the window, the page itself never scrolls.
Approach: Reproduce first, with a Playwright probe in the scratchpad: widths 320–2560 px, zoom
50–200%, open and close every section, operation, menu, hint and popover, and check
`document.scrollingElement.scrollHeight > innerHeight` after each. Below 40rem the page scrolls on
purpose (`App.svelte`'s narrow layout); that is not the bug. The one known cause (hidden text
escaping `ScrollArea`) was fixed in N3; check it is still fixed. Fix the element that escapes, at its
source, and say at the fix why.
Areas: editor-shell
Decisions: none
Acceptance criteria:

- The probe finds no page scroll above 40rem, and states which case reproduced the bug before the fix.
- If nothing reproduces it: `BLOCKED:` in the status file with every case tried. Do **not** add `overflow: hidden` to `html`/`body` blindly: it would cut off the intended narrow layout and hide the next bug.
  Risks: the bug may need a specific file or state Pol had; the BLOCKED note should ask for it.

### T-05 Painted cells outside the grid (session A)

Goal: The user can remove handpicked cells that fall outside the grid, and the warning tells the truth after an import.
Approach: Per D-03. Append a transition `trimToGrid(operationId)` to `document.ts` (tested): it keeps
only the `cellList` cells inside the current grid. `orphanedNotice` in `advisories.ts` gets a
"Remove N cells outside the grid" action per operation (next to "Open opN"), handled in
`App.svelte` through `session.apply`. The notice's wording depends on whether the document was just
opened or imported: read that from the history (`history.ts` records a `replaced` entry on open); if
that is not readable without changing the write path, `BLOCKED:`. For B, also add "Grow the grid to
fit", which goes through the same confirmation as any grid resize (E12).
Areas: editor-state, editor-shell
Decisions: D-03
Acceptance criteria:

- After importing a file with out-of-grid cells, the warning does not mention Undo, and its button removes the cells in one undoable step; the warning then disappears.
- After a resize in the session, the warning still offers Undo as today, plus the button.
- `advisories.test.ts` and a `document.ts` test cover both wordings and the transition.
  Risks: the session's write path (`apply()`) is a contract; this adds a transition only and must not change how `apply()` or the history works.

### T-06 Tile motif in the sidebar's free space (session A)

Goal: The empty space below the last section shows a subtle tile pattern that grows and shrinks with that space.
Approach: A pure `apps/editor/src/lib/sections/motif.ts` builds the decoration's `TilesetFile`: one
flat square tile in an existing token colour (a light tone that matches "Ink on paper"; no artwork
needed), a Checkered selection, and the rows that fit the measured free height. A
`SidebarMotif.svelte` measures the space and draws it with the package's `TileDecoration`. Mount it
after `.sections` in `App.svelte`, with the sidebar's `ScrollArea` in `fill` mode so the free space
exists to measure. Draw nothing when the space is under two rows. Decorative: `aria-hidden`, no
focus, no pointer events. One docs page per new file. Pol will tweak the look later, so keep the
colour and cell size as named constants at the top of `motif.ts`.
Areas: editor-shell
Decisions: none
Acceptance criteria:

- With few sections open, the motif fills the space between the last section and the footer; opening sections shrinks it, and it disappears when there is no space.
- It never causes a scrollbar and never sits under the footer.
- `motif.test.ts` covers the file it builds and the "too small" case.
  Risks: `fill` changes the sidebar's scroll content height; check that T-04's probe still passes.

### T-07 (i) explainers for Operations and Randomness (session A)

Goal: A new user can open a short explanation of the operation stack and of randomness.
Approach: Two data files beside `noise-explainer.ts`'s pattern: `lib/sections/operations-explainer.ts`
and `lib/sections/randomness-explainer.ts`, `ExplainerContent` with D-04's text (each item a
`params` row, `shares: []`, which `Explainer` already hides). An `info` tertiary button opens the
existing `Explainer` from the Operations section's header area and from the Randomness heading in
`SidebarFooter`, wired as `OperationBody` wires "How noise works". Do not edit `lib/ui/` (session
B's area). One docs page per new file; update `operations-section` and `sidebar-footer` pages.
Areas: editor-shell
Decisions: D-04 (and D-05 for the operations note)
Acceptance criteria:

- Both popovers open by mouse and keyboard, close on Esc, ✕ and click outside, and return focus to their button.
- The text is exactly D-04's (with Pol's edits), adjusted only for D-05.
- The (i) button's target is at least 24×24 px (WCAG 2.5.8).
  Risks: the footer is short and fixed; check the popover stays inside the window at 320 px wide (`popover.ts` keeps it inside).

### T-09 Scroll opened content clear of the footer (session B)

Goal: When a section or card opens below the visible area, the sidebar scrolls so the opened content can be seen.
Approach: In `Collapsible.svelte`, after the open transition ends (not at `tick()`: the `slide`
transition means the final height is not known yet), scroll the nearest scroll container so the
content's bottom is visible, **but never so far that the header leaves the top**: a tall section
shows its header at the top instead. Instant scroll under `prefers-reduced-motion`, smooth
otherwise. Keep any position logic in a `.ts` file with a test. Opening by `opening.open` in
`OperationsSection` already scrolls; make sure the two don't fight.
Areas: ui-kit
Decisions: none
Acceptance criteria:

- Opening the last section in a full sidebar brings its content into view; its header is never scrolled out.
- Opening something already fully visible does not scroll.
- Works with T-08's sticky headers.
  Risks: `Collapsible` is also used outside the sidebar; the scroll must apply only inside a scroll container, and do nothing otherwise.

### T-11 Reseed on load from a closed card (session A)

Goal: The user can turn an operation's Reseed on load on or off without opening its card.
Approach: On a closed `OperationCard`, when the operation's Pattern is random-based (the registry's
`stochastic` flag, as `OperationBody` reads it; never a list of Source names), the chip row ends
with a "Reseed on load" chip that shows On/Off and toggles on press. It is a switch to assistive
tech (`role="switch"`, `aria-checked`), styled like the other chips, with local CSS only (no new
`lib/ui` component). For operations whose Pattern is not random, the chip is absent, as the toggle
is absent inside the card. `OperationCard` gets an optional `onReseedOnLoad(on)` callback;
`OperationsSection` writes it with the existing `replaceOperation({ ...op, reseedOnLoad: on })`
transition (no `document.ts` change). If that operation's edit draft is open, copy the value into
`draft.reseedOnLoad` the way `reseed()` copies the salt. Write `reseedOnLoad: true` or `false`
explicitly, as Save does (`toOperation` in `draft.svelte.ts`), so a file toggled from the card is
identical to one saved from the card.
Areas: operations-ui, editor-shell
Decisions: D-06
Acceptance criteria:

- On a closed card with a Random or Noise pattern, the chip toggles Reseed on load; opening the card shows the same state, and undo reverts it.
- The chip is absent for Constant and Gradient (or whatever the registry marks non-random).
- Keyboard: reachable by Tab, toggled by Space and Enter; target at least 24×24 px.
- "Preview a fresh load" in the footer enables as soon as the chip is turned on.
- Docs pages `operation-card` and `operations-section` updated.
  Risks: the closed card's header row is tight at the narrowest sidebar (400 px); check the chip row wraps rather than overflows.

## Big tasks

Not planned here. Each runs in its own interactive session with Pol. Nothing in this batch depends
on them. The questions below are not under _Decisions needed_ on purpose: they do not block this
batch.

- **T-10 (B-005) Editable name for every operation, saved in the file (D-05).** A new optional `name` on `Operation`: `types.ts`, a `validate.ts` rule, a v4 → v5 step in `migrate.ts`, and the editor (inline edit on the card, likely with the existing `InlineEdit`). The engine and renderer ignore it, so generated output is unchanged. Questions for that session: what a card shows when there is no name (today's summary, or `op3`); whether names must be unique; whether notices ("Open op3") use the name; length limit.
- **T-12 (B-010) Rotation persists into a later tileId operation.** This is how the engine works, not a bug: each cell keeps what earlier operations wrote, and choosing a tile changes only the tile (`generate.ts`). Question: **(a)** keep it, explain it (T-07's text does) and close B-010; **(b)** choosing a tile resets the cell's rotation, scale, offset and opacity, which changes how every existing file looks; **(c)** an option per operation, "reset the cell first", which needs a new file version. Recommendation: (a).
- **T-13 (B-009) `everyNth`.** Today it already _is_ a row/column selection: it picks every Nth column or every Nth row. Question: rename it "Row/Column" (old files are upgraded automatically) and add a new "Every Nth" that counts cells across rows? The new one's pattern moves whenever the column count changes, which includes every breakpoint and resize.
- **T-14 (B-008) Offset and Scale as one attribute.** Question: one card that writes an X and a Y operation together (no file change, contained), or one attribute with X/Y inside (new file version)?
- **T-15 (B-007) Share a pattern.** Random values are tied to each operation, so two operations with the same Noise settings still get different values. Question: should sharing copy the _settings_ (each operation still varies) or the _values_ (same noise on both)? The second changes the file format.
- **T-16 (B-006) Grid & Size vs Breakpoints.** A workflow redesign. Known facts for the session: Grid & size has no Columns field because columns follow from cell size and design width; in a breakpoint, cell size alone changes nothing visible under fluid sizing (`BreakpointsSection.svelte`'s header).
- **T-17 (B-016, B-017) Starter tiles and tilesets; onboarding.** Changes how adding tiles works and adds a guided first run. Own session.

## Execution order

- No big task blocks this batch.
- Sessions run in parallel:
  - **A** (editor-shell, editor-state, owns `App.svelte`): B1 (T-01, T-02) → T-03 → T-04 → T-05 → T-06 → T-07 → T-11
  - **B** (ui-kit): B2 (T-08) → T-09
- Batch 02 starts with B-011 and B-012 once session A is merged.
