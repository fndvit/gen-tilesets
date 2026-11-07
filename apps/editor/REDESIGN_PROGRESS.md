# Editor redesign — progress

**Branch:** `editor-redesign` · **Plan:** Stage 1, blocks A–F · **Design system:** `DESIGN_SYSTEM.md`
**Figma:** `VCp0HyxbLOBq0vOkpDWmIL` (page *Editor*; frame `Page` 502:849)

## Current position

**New visual design adopted (2026-11-06).** After a design exploration (three directions, then an
iteration 2), Pol adopted iteration 2, **"Ink on paper"**. It was merged into this branch as
`37a2726` from `exploration/design-direction-3`. `DESIGN_SYSTEM.md` now describes it, and
`DESIGN_DIRECTION.md` records why each choice was made. Stage 1 and the Stage 2 preview group
(P1–P4) are complete. Their functionality is unchanged, but their *look* in the sections below
is history: where a section below disagrees with `DESIGN_SYSTEM.md`, the latter wins. Stage 2 ·
Warnings and dialogs is **closed** (W0–W5: `8364d4e`, `3034fc1`, `3a8ca84`, `feafa9a`). The palette
group (item 7) and Tile and pattern (item 11) are **closed** (K0–K3, T0–T4: `71fd0c1`,
`bf60a0d`, `855d6ad`). Explain Noise (item 12) is **closed** (N0–N4: `0b91a38`, `30116cb`,
`4f1129b`, `2277185`; the accent became pink #CD1957 along the way). **Next session: follow
"Next session plan: Export menu (item 1)" below, starting with X0's questions. No code before
Pol answers.**

## Stage 1 blocks

Each block is implemented, then reviewed with Pol, then tested, before the next one starts.

| Block | Scope | Status |
|---|---|---|
| A. Foundation | `styles/tokens.css`, `styles/base.css`, Roboto Mono, this file and `DESIGN_SYSTEM.md` | Done, approved |
| B. Primitives | `lib/ui/`: Icon, IconButton, Collapsible, FieldRow, Toggle, AddBar, Slider, Marquee, TabBar, GlyphGrid + OperationGlyph (artwork-agnostic); restyle `NumericInput`; a docs page for each new file | Done (committed `cd31b44`) |
| C. Layout + Grid & Size | Page grid, sidebar split into scrollable and fixed parts, header removed, `Section` rebuilt on Collapsible, Grid & Size section; sections extracted to `lib/sections/`; `Button`, `Popup` | Done, approved |
| D. Tiles | TileLibrary rebuilt as TileGroup / TileAsset, weight slider, N files → 1 group, add variant via picker | Done, approved |
| E. Operations | OperationHeader, step tabs open the draft, selection glyph grid, label-only grids, ParamFields restyle, token restyle of PaletteBar / NumericMapping; BlendControl replaced by a glyph grid | Done, approved |
| F. Sweep + review | Accessibility sizing, hover / press feedback, animated folding, preview `ScrollArea`, colour sweep, leftovers, Figma review, docs | Done, approved (two review rounds) |

## Decisions

- **Visual direction (2026-11-06).** Pol adopted "Ink on paper" (exploration iteration 2):
  - It is built on direction 1 (Tonal layers), with 5202's ink rules and mono data.
  - Ultramarine is the one accent, meaning "editing now"; magenta is retired.
  - Icons are one outline family (Lucide paths).
  - The sidebar has a top bar (Undo, New, Import, Export) that shares a grid row with the preview
    bar.
  - The footer is "Randomness".
  - Operations are cards (what it writes, step chips, re-seed plus a ⋯ menu) with a vertical
    stepper when open.

  The explorations are recorded in the untracked root `DESIGN_EXPLORATIONS.md` and
  `design-explorations/`. The branches `exploration/design-direction-{1,2,3}` are kept.

- **Mapping to the code.** Figma *Tile Group* = `Tile`, and *Tile asset* = `TileAsset` (a variant).
  "Finder" = the OS file picker. "Resulting File" = App's `<details class="debug">` view.
- **Add tile group with N files** creates **one** Tile with N variants, named after the first
  file. This is a requested behaviour change; before, it created one Tile per file. Dropping files
  on the library background does the same.
- **Weight slider** sets the raw `asset.weight` on a 0–2 track, step 0.01 (Shift+arrow moves
  0.1), so the default of 1 sits mid-track as in Figma. It commits on release, so one drag is one
  undo entry. The % label is the derived share. A weight above 2 only clamps the thumb position.
- **Font.** Helvetica stands in for Neue Haas Grotesk Display Pro because there is no web licence
  yet. Switching is a one-line change to `--font-ui`. Roboto Mono is self-hosted
  (`@fontsource/roboto-mono`, weight 500).
- **Operation editing** keeps the draft-and-commit model (E5, one undo entry per save). A step
  tab opens that operation's draft at that step, and Save / Discard close it.
- **Glyphs:** the glyph cell (label, 43px artwork slot, states) is shared, but the artwork is
  free per step. `OperationGlyph` takes its artwork as a prop or snippet and does not assume a
  pixel grid. Only Selection uses 4×4 bitmaps (Figma shows 4×4, not 5×5). Attribute, Source and
  Blend may use other iconography (Pol, 2026-11-04).
- Attribute, Source and Blend show **label-only** glyph cells until their glyphs are designed.
- **Selection glyphs are SVG files downloaded from Figma** (`src/assets/glyphs/selection/`), not
  generated from bitmap data (Pol, 2026-11-04). All and Checkered are frames in Figma, so they were
  written by hand in the same geometry. Pol can flatten them in Figma to replace them with exports.
- `styles/type.css` holds the text classes and the font. `base.css` imports it. Docs stories load
  `tokens.css` and `type.css` but not `base.css`, so the editor's focus ring does not leak into
  Starlight.
- Docs demos for every primitive live in one story, `apps/docs/src/stories/UiPrimitivesStory.svelte`
  (`show` prop), embedded on each `editor/ui-*.mdx` page.
- Slider is a restyled native `<input type="range">`. After each commit it resets to the file's
  value, so a refused weight does not leave the thumb where it was dropped.
- TabBar uses manual activation (arrows move focus, Enter or click selects), because selecting a
  step opens the draft. The up/down arrow icons in the operation header reorder the stack (Block E).

Block B review (Pol, 2026-11-04):
- Step questions use `.t-body`, as `DESIGN_SYSTEM.md` says, not Figma's 10px Roman.
- No visual pending state on numeric inputs: the normal underline, as long as the input.
- Glyph hover = selected look (grey fill plus frame). Re-seed has no hover change.
- Slider snaps back to the file's value after a refused commit. Agreed.
- **Tile group title is editable on click, and the group bar has a trash icon** like the operation
  header. `Collapsible` has `onRename` (via the new `InlineEdit`) and an `actions` slot before the
  title.
- **Explanations are hover hints on the field label**, never text in the row (`FieldRow hint`).
  The Y offset note became a hint.
- Spec-reference prose (E5, §x.y) is removed from redesigned UI and kept in code comments.
- `reseedOnLoad` moves into the open operation body. Salt and id are no longer displayed.
- Design width, Breakpoints and Derived are not in Figma. They are kept and built from the same
  primitives. Design width moves into Grid & Size.
- Until Stage 2, seed, import, download and undo sit in the black `.fixed` footer, using
  primitives only.

Block C (2026-11-04, approved in planning by Pol):
- `Section`'s `destructive` prop (an orange border) is removed. Figma has none, and the
  confirmation gate protects destructive edits.
- The footer is drawn with `.theme-inverted` (`tokens.css`), so primitives render inverted
  without footer-specific styles.
- One new primitive, `Button` (the chip look, for actions), and `Popup` (native modal dialog).
- Sidebar sections live in `src/lib/sections/`: `GridSection`, `BreakpointsSection`,
  `DerivedSection`, `SidebarFooter`. App keeps the shell, the state and the gates.
- **Import and export reports appear only after the attempt, in a closable popup, never in the
  footer** (Pol). The inert-flags advisory is a hint on the Fresh load label.
- Grid & Size order: Cell size, Rows, Y offset, Design width, Alignment (Column | Gutter). The
  "re-derives columns" paragraph became a hint on the three destructive fields.
- The confirmation and the orphan advisory sit at the top of the preview (sticky), restyled with
  tokens only, until Stage 2's warnings design.
- Engine and schema versions moved from the removed header into Derived. New document moved from
  Derived into the footer.

Block D (2026-11-04, decided in planning by Pol):
- **Delete asset** = a black circle with a white cross at the thumbnail's top-right corner, shown
  on row hover (and focus-within, for the keyboard). Disabled with one variant left. It is the one
  round shape (`--radius-round`) and the one control hidden at rest.
- **Asset details are hints**: the thumbnail's hint gives size · "not square, so it is
  centre-cropped". The asset id (`a1`…) is never shown (Pol, Block D review); controls are named
  by position ("Delete variant 2"). A duplicate name from an imported file shows `(t3)` after the title (`Collapsible note`) and a hint.
- **Names are unique** (Pol, Block D review; overrides `09` §10.1 "never blocks a rename"). Renaming
  to another group's name, trimmed and case-insensitive, is refused with a popup (`renameTile`
  refuses too). A new group whose name is taken becomes `grass 2`, `grass 3` (`uniqueTileName`).
  Only an imported file can still hold duplicates; the schema allows them.
- `ui/Hint` was extracted from `FieldRow` so thumbnails and titles share the bubble.
- Files: `lib/sections/TilesSection.svelte`, `lib/tiles/TileGroup.svelte`,
  `lib/tiles/TileAsset.svelte`. `TileLibrary.svelte` and its docs page are deleted.
  `assets.ts` gained `attachAsset` / `attachAll` (ids only for files that attach, no gaps).
- Refusals (failed attach, Tile in use, last variant, last non-zero weight) open a popup.
- While a slider is dragged every row's % follows live. The canvas updates on release (S2: no
  preview mode).
- Fixed on the way: two overlapping drops could allocate the same tile id (review finding). In-flight
  ids are now reserved.
- A new group starts open, and a closed group shows up to 4 thumbnails in its bar (Figma group B).
- **Reset weights** (Pol, after the Block D review; not in Figma): a text `Button` at the right of
  the square "+" row sets every variant to 1 (`resetAssetWeights`, one undo entry). It is disabled
  while all weights are already 1.

Block E (2026-11-04, decided in planning by Pol):
- **Save / Discard** are `Button`s at the bottom right of the open body (Add for a new
  operation). A disabled Save has a hint, "Still open: …".
- **Blend** is a label-only glyph grid of every accepted Blend, default preselected. The "other
  blends" disclosure (§7.7, reveal on request) is gone. `tileId` shows one cell, Set.
- **Switching** to another operation's tab, or the add bar, with unsaved changes opens a popup
  (Keep editing / Discard). With no change it switches at once (`draftDiffers`).
- Defaults to confirm in the review: a closed operation's tab opens its draft at that step; only
  Save / Discard close it. A new operation is a header with the next index above the add bar; its
  trash discards it. The summary follows the draft live (`Checkered * Opacity [0.5 - 1] * Random *
  Set`, tile names, `—` for unanswered). Re-seed while open rerolls the file and the draft takes the
  new salt. **Re-seed stays magenta when open**, though Figma's Opened variant draws it white.
  Reseed on load is a Toggle at the end of the Source step (stochastic only), saved with Save.
- Files: `lib/sections/OperationsSection.svelte`, `lib/operations/OperationHeader.svelte`,
  `OperationBody.svelte`, `labels.ts`. `OperationStack`, `OperationDraft`, `BlendControl` and their
  docs pages are deleted. `Popup` gained an `actions` snippet; `Hint` gained `--hint-left/right`.
  The editor's tsconfig now includes `vite/client` types for the `.svg` imports.
- Labels: registry names are shown as words (`cellList` → Handpick, `checkerboard` → Checkered,
  `valueNoise` → Noise, `tileId` → Tile, else title case). The Selection grid follows Figma's
  order.
- Param fields: number → `NumericInput`, enum → `Toggle`, bounded → `Slider` with a value readout
  (the old exact-number box beside the slider is gone). Range is a hint on the label. A painted
  `cellList` is a "Cells" row with the count.
- Palette: ink segments with paper dividers, `clear` in paper, selected in inactive grey. Tile is
  a select on an underline, Weight a `NumericInput`, then Earlier / Later / Remove and + Entry /
  + Clear buttons. The order and `random` advisories became the Palette label's hint. Fixed on the
  way: adding an entry left nothing selected (the selection pointed past the end).
- Numeric mapping: ink track and block thumbs as `Slider`, From / To (Value when collapsed), Steps
  (Continuous | Stepped) and Step count. The domain, the collapse reason and the rotation
  advisory are the label's hint.

Block E review (Pol, 2026-11-04): "the functionalities are all there, but the UI is not
intuitive enough." Taken on now:
- **No horizontal scroll in the sidebar.** A long summary (three tile names) made the stack's
  implicit `auto` grid column grow to the text, 413px past the sidebar. Grids that stack rows now
  use `minmax(0, 1fr)` (stack, params, mapping, palette), `Marquee` has `contain: inline-size`,
  and a `FieldRow` control shrinks. The slider readout is rounded to the step, and label-only glyph
  labels wrap ("Translate X" ran into the next cell).
- **Compact fields in the operation body**: labels 14px in sentence case (`--label-size`,
  `--label-case`), in a 128px column with each control right after it (`--field-label-w`,
  `--field-justify`). Block F's overall sizing pass may tune the numbers.
- **Next action**: a **Next: <step>** button before Save while a step is unanswered. It goes to
  the first unanswered step after the current one.
- **Hover feedback** where there was none: underline fields (numeric, seed, palette tile select)
  and slider tracks thicken on hover, palette segments take the selected look, and hint anchors
  show the help cursor.
- **Overlay scrollbar** (second look): the classic scrollbar narrowed the sidebar when it
  appeared. New primitive `ui/ScrollArea` (+ `scrollbar.ts`, tested) hides it and draws a 6px
  mid-grey handle over the content, as in VS Code: shown on hover, while scrolling (800ms) and
  while dragged, draggable. The preview column still uses the native scrollbar.
- **Chevrons on the left** (third look): the handle covered the fold chevrons at the right of the
  section and tile group bars. `Collapsible` now puts the chevron first, then the title; the tile
  group's trash moved to the right end with an extra 8px margin. A group bar's chevron is its own
  button (named Expand/Collapse), and the empty bar after the title still toggles on click.
Left for later: the operations stack design as a whole (Stage 2 backlog, item 7).

Block F (2026-11-04; sizes decided by Claude under WCAG 2.2 AA, as Pol asked). The reasons are in
`DESIGN_SYSTEM.md` → Accessibility.
- **Sizes:** new tokens `--target-min` 24 and `--control-h` 28. Chips and Buttons 28px tall,
  icon buttons a 24px box (icon at native size), bars 32 (Figma 25 / 24 / 28), operation header
  56 (40), slider thumb 12×24 (10×20), delete badge 16 with a 24px `::before` hit area, underline
  fields 24 (padding above the digits), the editable group title 24.
- **Type:** section 20 (24), label 16 (20), body 14, xs 12 (10), console 12 (10).
- **Sidebar** `clamp(400px, 30vw, 560px)`. The glyph grid fits as many cells as the width allows
  (`auto-fill`, 4 at 400px, 5 from about 440px), and the arrow keys follow the drawn column count.
  `--glyph-cols` is gone.
- **Reflow:** below 40rem the page stacks (sidebar, then preview) and only then scrolls. Found and
  fixed on the way: the aside's and the footer's grids used the implicit `auto` column, so the
  footer's buttons pushed the page 41px wide at 320px. The footer's action row now wraps.
- **Feedback rules** (one per kind, in the primitives): black bars that act invert on hover
  (paper, ink content, ink frame) and go `--color-pressed` (#4d4d4d) when pressed. Chips and
  Buttons invert on hover and go pressed. Icon buttons get a 1px frame in their own colour, so
  re-seed stays magenta. Glyphs and palette segments: the frame thickens inside when pressed.
  The editable title underlines on hover. Already-chosen chips, glyphs and the active tab do not
  change and show `cursor: default`. Sliders `grab` / `grabbing`.
- `.theme-inverted` sets `--color-inactive` to `--grey-700`: a disabled icon in the footer (Fresh
  load) looked enabled in light grey.
- **Folding** slides over `--dur-fast` (`ui/motion.ts` reads the token, 0 under reduced motion).
- The **preview column** scrolls in `ScrollArea` (`.preview-body` holds the padding).
- **Colour sweep:** the preview chrome (`PreviewFrame`, `ReferenceControls`, `PaintLayer`,
  `ReferenceLayer`, `SelectionOverlay`) reads tokens only. New: `--color-muted`,
  `--color-selection`, `--color-erase`, `--color-frame`, `--handle-w`. The old grey-blue buttons
  became the chip look at 24px, the green "match" state the chosen (ink) look. Only the white
  backdrop stays a named constant, because it is part of the picture.
- **Leftovers:** `offersReseedOnLoad` and `setReseedOnLoad` removed with their tests (only tests
  called them). `Section.svelte` stays: five sections use it and it owns the content padding.

Block F review (Pol, 2026-11-04): "The feedback is good, but take it off the section headers
and other headers like tile asset groups." Done:
- Section and tile group bars no longer invert or darken. Only the chevron and title dim, as
  before Block F (add bars and step tabs keep the inversion).
- Section titles looked cut at the top. Cause: the title box was trimmed to cap height and also
  has `overflow: hidden` for its ellipsis, so anything above the cap line was clipped. Bar titles
  are now untrimmed with `--leading-title` 1.2 (the editable group title too).
- Re-seed buttons are bigger: a 28px box and an 18px icon (`--icon-seed`; Figma 12). The operation
  header's left column fits trash 24 + re-seed 28 in its 56px.

Block F review, round 2 (Pol, 2026-11-05). Done:
- **Sidebar bottom margin**: 12px under the last section, above the footer.
- **Sections stand out from the ground**: the sidebar ground is a darker aqua (`--aqua-200`
  #bfe3e0, `--color-surface`), and an open section's content keeps Figma's `#E4F6F5`
  (`--color-section`) and ends in a 1px ink rule. A lighter tint than
  Figma's on the bodies was tried first and was too close to the ground to read.
- **Tile group thumbnails stay in the bar when the group is open.**
- **Summary per step**: the header's marquee is now four console cells, one above each tab and
  as wide, each with that step's answer (`summaryCells` in `labels.ts`). A cell that overflows
  ends in an ellipsis and scrolls only while hovered (`Marquee scroll="hover"`). Tabs carry
  their answer in their accessible name ("selection: Checkered"; `TabBar` tab `detail`).
- **Open operation hierarchy**: the question became the step's name as an uppercase heading,
  with the question as its hint. The chosen option's fields sit in a framed block under a small
  black bar naming the choice ("TILE", "NOISE"), so they read as belonging to it and the end is
  visible. No block when the option has no fields. Gaps: 12px between blocks, 8px inside.
  The numeric mapping's heading reads "Range", since the bar above names the attribute.
Then (Pol, same day): no space between sections (the ground shows only under the last one);
the step name heading is gone and the question is back, now in `.t-label` (14 Regular, sentence
case, like the field labels) instead of `.t-body` Light; the footer has 36px of black under its
last row (`--footer-pad-bottom`).
Then: a 1px separator under every section bar, and the section body's bottom border, both in
`--color-separator` (default `--aqua-200`). Three temporary colour pickers (Ground, Section,
Separator) let Pol try the colours live; he kept the defaults, and the pickers were removed.
Left for later (Pol): the space between labels and values across the sidebar; the palette
widget's design (Stage 2, item 7). Dimming unchosen glyphs was set aside for the framed block,
because dimmed labels would fall under 4.5:1.
- Testing (headless Chrome): three tile groups show thumbnails while open; a Checkered · Tile
  [clear, sand, water] · Noise · Set operation adds; the four cells line up with the tabs within
  1px; only the palette cell clips, and it animates on hover; tab names carry the answers; no
  sideways scroll at 1728, 1024, 600 or 320; no console errors apart from the favicon 404.
  Typecheck and 316 editor tests pass (two new, for `summaryCells`).

Block F visual review against Figma (`Page` 502:849, at 1728):
- Accessibility overrides Figma (kept): bar heights, chip and button heights, field-row pitch,
  operation header height, the type scale, sidebar width (518 vs 477).
- Already decided earlier (kept): chevrons on the left, Breakpoints / Derived / Design width,
  the footer, label-only Attribute / Source / Blend glyphs.
- Stage 2 (unchanged): the whole preview (size readout, preset bar, corner handles, grid,
  breakpoint buttons), the warnings.
- Nothing left to fix in Stage 1.

## Stage 2 · Preview (backlog items 2 and 5)

Figma `Preview` 502:956. Plan approved by Pol, 2026-11-05.

| Block | Scope | Status |
|---|---|---|
| P1. Removals | Reference image (2 components, `reference.ts`, its test, 3 docs pages), the `painting` prop, the two preview notes, "The file" debug view | Done, reviewed |
| P2. Top and bottom bars | `lib/preview/`: top bar (readout, sizes 360 / 768 / 1024 / 1440 + Fill, colour swatch, Grid chip disabled), breakpoint bar, `activeBound` helper | Done, reviewed |
| P3. Grid and handles | Full-viewport grid and the Grid toggle (done early, P2 review); Figma's handles (P3b) | Done, reviewed (P3b review round included) |
| P4. Sweep | Figma review, docs, `DESIGN_SYSTEM.md`, checks | Done, waiting for Pol to close the group |

Decisions (Pol, 2026-11-05):
- The black breakpoint is the **range the width is in**: the smallest bound ≥ the width (860 →
  1024); none above the largest. Clicking one sets that width.
- **Fill** stays, as a fifth chip after 1440. Presets 360 / 768 / 1024 / 1440 (was 375).
- The background colour fills the **whole preview column**, with the grid over it.
- A **Grid** chip hides and shows the grid (Pol; not in Figma). On by default, preview-only.
- The notes and "The file" view are removed (closes backlog item 5). Asset failures and the
  sticky notices stay until item 3.

P1 (2026-11-05): `assets.ts` `measure` stays (the asset pipeline uses it). The preview notes'
point that a resize writes nothing will go in the readout's hint in P2. Typecheck, 307 editor
tests (9 reference tests removed), docs coverage (104 files) and the docs build pass. Browser
(1728): no reference controls, notes or debug view; handles drag and take arrows; no sideways
scroll; only the favicon 404.

P2 (2026-11-05):
- **Structure.** The width, backdrop and grid state moved out of `PreviewFrame` into
  `lib/preview/view.svelte.ts` (runes only), with the arithmetic in `width.ts` (tested). This lets
  the bars sit outside the scroll area: `section.preview` is top bar / `.canvas` (scrolls) /
  breakpoint bar. `PreviewFrame` moved to `lib/preview/`; its `rules` prop is gone.
- **Top bar:** "Current preview size:" `.t-body` + the width in 12 Medium, lower case. Its hint:
  "Shown at N% to fit the column." (zoomed), "Holding: rule 1." (with rules), "Resizing the
  preview changes nothing in the file." Then Grid (disabled until P3), the presets + Fill, the
  swatch. Presets hang from the bar's top edge and the swatch fills its height, as in Figma.
- **`WidthChoices`** (new, `lib/preview/`): `aria-pressed` buttons rather than a radio group,
  because a dragged width matches none. 14 Light as in Figma (not the chips' 12 uppercase).
- **Swatch:** 80px, 2px ink frame, painted the colour, a transparent native input over it. The old
  ⟲ became a × `IconButton`, later removed (Pol: "take this cross out"). There is no reset.
- **Backdrop** paints `.canvas` (the picture area). The bars stay paper, so their text keeps its
  contrast on any colour. The frame no longer paints its own background.
- The asset failure list moved above the picture (until item 3), since the bottom bar now ends
  the column.
- Fixed on the way: at 320px the top bar overflowed by 160px; the bar and both button rows wrap.
- Testing (Chrome): presets and Fill set the width and show as chosen; with rules at 300 / 600,
  360 → 600 black, clicking 300 → 300 black and no preset chosen, 768 → none black; the hint
  shows the zoom (81% at 1440) and "Holding: base"; the colour fills the picture area and × resets
  it; hover inverts, the chosen one has `cursor: default`, focus rings ink (paper on ink); no
  control under 24px apart from the 9px handles (P3); no sideways scroll at 1728, 1024, 600, 320;
  only the favicon 404. Typecheck, 322 editor tests (15 new in `width.test.ts`), docs coverage
  (109 files) and the docs build pass.

P2 review (Pol, 2026-11-05): "The tileset should always be centered on the preview. When the rows
grow, it should be recentered again. If there are too many rows to be seen, then it can overflow"
and "the grid button is not active, no grid is showing". Done:
- **Vertical centring.** `ScrollArea` gained `fill` (content a flex column at least the area's
  height); `.preview-body` is a flex column and `.stage` (`flex: 1 0 auto`, `justify-content:
  center`) centres the frame in what is left under the notices. Taller than the area, the frame
  starts at the top and scrolls; it never overflows upward.
- **Grid** (from P3): `lib/preview/PreviewGrid.svelte`, an SVG pattern inside the frame at the
  cell pitch from the package's `scaleFactor` / `originX` / `originY`, reaching 4000px past the
  frame, clipped by `.preview-body` (`overflow: clip`). The frame's track no longer clips.
  **Colour from Figma's file:** black at 10%, 2 on / 2 off (`--black-10`, replacing
  `--grey-100`), so it also reads on a coloured backdrop. The Grid toggle is enabled.
- Testing (Chrome): frame centre = area centre at 5 and 8 rows; 30 rows starts 12px below the top
  and scrolls; grid lines within 0.01px of the All overlay's cell edges; toggle removes and
  restores the grid (`aria-pressed`); the P2 probe still passes (no sideways scroll at 1728,
  1024, 600, 320; only the favicon 404). Typecheck, 322 tests, docs coverage (110) and build pass.

Then (Pol, same day): "take this cross out" — the background reset × is removed. White is picked
like any other colour.

P3b (2026-11-05), Figma `Handle` 2063:804 / 2063:805:
- **Decided (Pol):** top and bottom are **not** marked, as in Figma. The dashed frame outline and
  `--color-frame` are gone; the handles mark the sides and the grid shows the cells.
- **Drawing:** a `.mark` span per handle, `pointer-events: none`, centred on the box edge and painted
  with `linear-gradient`s in `--color-ink`: 6px squares 13–19px past the box, 2px × 16px caps, a 1px
  line dotted 1 on / 2 off. Drawn rather than downloaded so it stretches with the box. New tokens
  `--handle-square`, `--handle-cap`, `--handle-cap-w`, `--handle-reach`, `--handle-dot`,
  `--handle-dot-gap`; every length divided by the zoom.
- **Hit area:** `--handle-w` 24 (was 9), wholly outside the box edge, reaching 19px past top and
  bottom; `HANDLE = 24` in `width.ts`. The `.viewport` pads `--handle-reach` above and below so the
  squares are not clipped.
- **Feedback:** hover and focus make the line solid 2px; pressed `--color-pressed`; the focus ring
  wraps the hit area.
- **Review (Pol):** "The hover area for the handles should be bigger … it should be centered … the
  ending points are now not part of that hover area". Now `--handle-w` 32, centred on the edge,
  reaching `--handle-hit-reach` (32) past top and bottom, so the squares are inside it; `HANDLE =
  16` (the outer half). Cost, accepted: the inner 16px lies over the box, so the Handpick brush
  cannot start a stroke there. Re-tested: hit area centred on the edge (±0.01px) at Fill, 360 and
  1440; the squares and 10px above them are hit; dragging by a square works; the focus ring wraps
  square and line; at 30 rows the hit area sits 12px under the clip; no sideways scroll.
- Also from the review: clicking the chosen Alignment chip asked to confirm a destructive edit.
  `Toggle` now calls nothing when the chosen chip is chosen again (like a native radio). The grid
  standing apart from the handles in Gutter mode is the bleed (outer cells cut by the box), not a
  misalignment.
- **One bar (Pol, same review):** "Move the bottom UI of the preview to the top … So there is only
  the top UI." `BreakpointBar` is removed; `PreviewTopBar` shows the readout and then "Breakpoints"
  with its buttons at the left, the tools at the right. The breakpoint buttons take the presets'
  60×44 (not Figma's 92×64) so the bar keeps one height; `--breakpoint-w/h` and `WidthChoices`'
  `size` prop are gone. Tested: hidden with no rules; with rules 300 / 600, one 56px row at 1728,
  clicking 300 sets 300 and turns it black; at 1024 and 600 the tools wrap to a second row (114px),
  at 320 to more; no sideways scroll; no console errors.
- **Live weights (Pol, same review):** "The asset sliders should refresh the tileset every time
  their value changes, not only when the user takes the finger off". The file now follows a drag
  frame by frame (`session.applyLive` / `settle`, rule in `history.ts` `appliedLive` / `settled`,
  5 new tests), and one drag is still one undo entry. `TileGroup`'s `live` copy is gone: the % is
  read from the file. Tested: shares move on every frame with the mouse held (60 / 67 / 32 / 7 %),
  one undo returns to 50 / 50, Shift+Arrow steps 0.1. A refused zero on the last non-zero variant
  now keeps the last accepted frame (about 0.01) instead of the weight from before the drag.
  Pol first read the summary as "still waits for release"; re-tested on the imported readme demo
  (the canvas changes on every held step), and Pol confirmed it is right.
- First testing (headless Chrome, 1728): hit areas 24px at Fill, 360 and 1440 (zoomed); marks centred on
  the edges; arrows ±20 / ±200; drags at 360 and zoomed 1440; hit-testing gives the box's own pixels
  to the box (only the pixel holding a fractional edge may go to the handle); at 30 rows the
  squares sit 12px under the clip; target probe finds no control under 24×24; no sideways scroll
  at 1728, 1024, 600, 320; no console errors. Matches Figma `Preview` 502:956 by eye. Typecheck,
  322 tests, docs coverage and docs build pass.

P4 (2026-11-05):
- **Figma review at 1728** against `Preview` 502:956: the handles and the grid match. One mismatch,
  fixed: the presets box touches the swatch in Figma, but the editor had an 8px gap. `.sizes` in
  `PreviewTopBar` now groups them, so they also wrap together. Known differences, left on purpose:
  breakpoints in the top bar at 60×44, the Grid chip, Fill, no swatch reset.
- **Open points (Pol):**
  - Handle hit areas are now **wholly outside the edge**, 24px wide (`--handle-w` 24,
    `--handle-hit-reach` 28, `HANDLE = 24`), so the Handpick brush reaches every pixel inside `Wpx`.
    The mark stays centred on the edge (`.mark` at the hit area's inner side). The hit area still
    covers the bleed, the outer cells reaching about 4px past the box, which lies outside the page.
    This partly reverses the P3b review's "centred"; Pol chose it knowing the trade-off. The
    squares are still inside the hit area vertically; horizontally their inner half lies over
    the box, outside the hit area.
  - Gutter mode's grid outside the handles: leave it (it is the bleed).
  - The top bar on two rows (114px) at 1024 and 600: accepted.
- **Probes** (headless Chrome, readme demo): every preview control changes on hover except Grid and
  Fill while chosen (on purpose). Tab order: breakpoint 500 → Grid → 360 → 768 → 1024 → 1440 →
  Fill → swatch → left handle → right handle. The readout is not a tab stop: hints are
  hover-only across the system (backlog item 9). 200% zoom (864 CSS px): no sideways scroll,
  nothing clipped. No enabled control under 24×24 and no sideways scroll at 1728, 1024, 600, 320.
  No console errors.

## Next session plan (written 2026-11-06, after "Ink on paper" was adopted)

**Next group: Stage 2 · Warnings and dialogs (backlog item 3, plus the dialog half of item 4).**
It is the oldest open "until Stage 2" debt. The sticky preview notices, the red asset-failure
list, the native `confirm()` for New, and the `--color-warn` / `--color-danger` placeholders all
wait on it. It is also the one group the new design system has no pattern for yet. Pol may
still pick another group at the start of the session. Recommended order after this one: 7
(palette widget), 1 (export menu), 6 (glyphs), then 4's confirm-on-blur, 8 and 9.

Read `DESIGN_SYSTEM.md` first: it describes the adopted design. The sections above it in this
file describe looks that no longer exist.

### What exists today (analysed 2026-11-06)

Every place the editor tells the author something, against `09` §12 (the spec archive is
`../gen-tileset-spec-archive/spec/09-editor.md`):

| What | Spec | Where it shows now |
|---|---|---|
| E12: confirm a resize that hits coordinate-bound operations | §9.3 | Sticky white notice pinned over the preview (`App.svelte` `.notice`, `role="alertdialog"`), "Change it" / "Cancel" |
| Advisory 3: an operation orphaned by a resize | §9.4, §12.2 | Second sticky notice in `App.svelte`, never dismissible |
| Asset load failures | §12.3 | Red `<ul class="failures">` above the picture (`App.svelte`), never cleared except by New |
| Advisory 5: the document draws nothing | §12.2 | Export popup (`SidebarTopBar`) |
| Import refusal, upgrade notes, missing pictures | §12.1, §12.4 | Import popup (`ImportPanel`) |
| Tile attach failures | E13 | Tiles popup (`TilesSection`) |
| Advisory 2: reseedOnLoad over a non-random source | §12.2 | Only inside the fresh-load hint (`SidebarFooter`) |
| Advisory 6: two tiles share a name | §12.2 | Hint and note on the tile group title |
| Advisory 8: palette reordered under `random` | §12.2 | Inline in `PaletteBar` |
| Advisory 9: rotation endpoints coincide mod 360 | §12.2 | Inline in `NumericMapping` |
| Advisories 1, 4, 7 (parity vs alignment, grid narrower than design width, non-square asset) | §12.2 | **Not shown anywhere.** 1 and 4 are import-only; 7 has the data (`meta.width/height`) but no consumer |
| Unsaved operation changes | Block E | `Popup` with Keep editing / Discard (`OperationsSection`) |
| Start a new tileset | — | Native `confirm()` in `App.svelte` |

The package has no diagnostics helper (`git grep "export function diagnos"` finds nothing), so
the detections are the editor's. **E16** governs every advisory: it never blocks, never edits the
file, and is never styled as an error.

### Blocks (analysed / implemented / reviewed / tested, stop for Pol after each)

| Block | Scope |
|---|---|
| W0. Kick-off (talk, no code) | Confirm the group with Pol, and ask the questions below. Check Figma (`VCp0HyxbLOBq0vOkpDWmIL`) for any warning or dialog frame before designing |
| W1. Design proposal | Propose the taxonomy below as rendered mock states in the 5175 editor (or Figma), in the "Ink on paper" language: no caps, ink/paper, the accent only for "editing now", so **a warning colour must be decided** (see questions). Write the patterns into `DESIGN_SYSTEM.md` once Pol approves |
| W2. Components | `lib/ui/Notice.svelte` (one notice), `lib/ui/Dialog.svelte` (modal confirm built on the native `<dialog>` `Popup` already uses), and a small store `notices.svelte.ts` (add, dedupe by key, dismiss, auto-clear when the condition goes away). Each new file needs a docs page. Unit tests for the store |
| W3. Wire the advisories | Move orphaned (3), asset failures (§12.3), and the export (5) / import notes into notices. Add pure detections, with tests, for 1, 4 and 7 (and 2 outside the hint). Keep 6, 8 and 9 inline at their control, but give them the shared inline-advisory look |
| W4. Dialogs (item 4's dialog half) | The E12 resize confirmation becomes a `Dialog` naming the affected operations. New tileset uses it instead of `confirm()`. Unsaved changes moves onto it too. Confirm-on-blur for destructive params stays in item 4 unless Pol folds it in |
| W5. Sweep | Remove the sticky `.notices` and `.failures` from `App.svelte`. Replace the `--color-warn` / `--color-danger` placeholders. Update docs pages, the probes (24px targets, 12px text, no caps, focus order, `aria-live`), the smoke test and `DESIGN_SYSTEM.md` |

### Proposed taxonomy (to put to Pol in W1)

1. **Notice** (non-blocking, dismissible): advisories and asset failures. A stack in the preview's
   top-right, under the top bar, so it never covers the sidebar. Polite `aria-live` for
   advisories, assertive for failures. A dismissed notice stays dismissed until its condition
   changes (keyed by condition, not by text).
2. **Inline advisory**: a muted line with a small marker at the control it is about (6, 8, 9). It
   is shown where the author can act, never as a popup.
3. **Dialog** (blocking, one question): E12, New, unsaved changes. The primary action is ink,
   with Cancel beside it. Focus is trapped and returns to the trigger.
4. **Report** (after an action): the existing `Popup` for import, export and attach results.
   Restyle it only if W1 changes the notice look.

### Questions for Pol at W0

- Does a warning get its own colour? The palette is ink, paper and one accent that means
  "editing now". Options: an amber marker only, ink plus an icon, or the accent. A failure (asset
  load) may need red, even though `--red-600` is today used only for the erase overlay.
- Where do notices live: the preview's top-right, under the top bars across the window, or the
  sidebar foot?
- Should advisories 1, 4 and 7 be surfaced at all? They are import-only or rare, and the spec
  says to report them.
- Fold item 4's confirm-on-blur into this group, or keep it separate?
- Is there a count or badge anywhere (for example "2 notes" in the top bar) when notices are
  dismissed?

### W0 answers (Pol, 2026-11-06), done

- **Group confirmed:** Warnings and dialogs. Figma has no warning, notice or dialog frames, so W1
  designs from `DESIGN_SYSTEM.md` alone.
- **Colour:** advisories are ink on paper with an outline info icon, and get no new colour.
  Failures (asset load) get a red left edge and an alert icon (`--red-600`). `--color-warn` goes
  away and `--color-danger` maps to `--red-600`.
- **Placement:** a notice stack in the preview's top-right, under the preview top bar, floating
  over the picture. It never covers the sidebar.
- **Advisories 1, 4 and 7:** detect and surface all three (W3).
- **Confirm-on-blur** (item 4) is folded into W4.
- **Not asked, Claude's default:** there is no count or badge for dismissed notices. A dismissed
  notice comes back only when its condition changes. Pol can overrule this at W1.

### W1 and W2 (2026-11-06)

- **W1 approved** with changes. The mock was a scratch page that was never committed.
  - **No red edge on a failure notice.** Pol found the 3px edge too loud. Only the alert icon is
    red (`--color-danger` = `--red-600`).
  - The open operation card's 3px accent edge has the same anatomy. Pol may want it subtler as
    well: added as backlog item 10.
  - **Notices carry actions** (tertiary buttons).
  - **Warnings and confirmations come only once a value is committed** (blur or Enter), never
    while typing, so the author is not interrupted twice.
  - The patterns are written into `DESIGN_SYSTEM.md`: Notice, Inline advisory, Dialog, the
    Status token, placement, the "Warnings and confirmations" convention, and `aria-live`.
  - The design-exploration screenshots (`design-explorations/`, untracked) were deleted at Pol's
    request. `DESIGN_EXPLORATIONS.md` (text) is kept, but its image links are now broken.
- **W2 implemented, waiting for Pol's review:**
  - `lib/ui/Notice.svelte` and `lib/ui/Dialog.svelte`, which is a `Popup` with the new `alert`
    prop.
  - `notices.ts` (pure, 9 tests) and `notices.svelte.ts` (state).
  - The `info` and `alert` icons.
  - Docs pages `ui-notice`, `ui-dialog` and `notices`, demos in `UiPrimitivesStory`, and the
    `ui-popup` and `ui-icons` pages brought up to date.
  - Popup now sets `margin: auto`, because Starlight's reset left it top-left in the docs.
  - Checks: typecheck, 339 editor tests, docs coverage (114) and the docs build all pass.
  - A browser run of the docs stories passes 16 checks:
    - the failure icon is red with no edge, and the advisory icon is ink;
    - every target is at least 24px and no text is under 12px;
    - actions and dismiss work;
    - the dialog has the `alertdialog` role, focus starts on Cancel, and Esc and Enter cancel;
    - focus returns to the trigger, and the verb confirms once;
    - there are no console errors.
  - Nothing is wired into the app yet (that is W3 and W4).

### W3: notices wired in (2026-11-06), waiting for Pol's review

W2 was committed as `8364d4e`.

- **The stack.** `lib/preview/NoticeStack.svelte` sits at the preview's top-right with two live
  regions. `App.svelte` derives the conditions (`advisories.ts` `documentNotices`).
- **Removed from `App.svelte`:** the sticky orphan notice and the red failures list. E12's sticky
  confirmation stays until W4.
- **New detections**, pure and tested (16 tests in `advisories.test.ts`):
  - advisory 1, parity;
  - advisory 4, a narrow grid;
  - advisory 2, inert reseed, moved out of the fresh-load hint;
  - advisory 7, non-square assets.
- **Moved to notices:** advisory 3 (orphans), §12.3 asset failures (collapsed into one notice),
  advisory 5 (pushed after an empty export), and an import's upgrade and unreadable-picture notes
  (pushed).
- **The popups that remain:** "Import refused" and "Export failed".
- **A missing picture is reported once.** An import used to report "not in the archive", and the
  asset also failed to load, so the same picture showed twice. Only the §12.3 failure remains, and
  it says "no file attached".
- **Failures follow their asset.** Each failure remembers the asset's `meta` object, so an import
  or a re-attach clears it. Failures used to survive an import.
- **Inline advisories.** `lib/ui/Advisory.svelte` puts 6 (tile group), 8 (palette) and 9 (rotation)
  visibly under their control. Before, they were inside hover hints that a keyboard user never saw.
  Advisory 8 now shows only after a reorder under `random`, not all the time.
- **Commit first** (Pol's W1 rule). `entry.svelte.ts` tracks an entry from a captured `input` event
  until change, blur, Enter or Esc. The stack and inline advisories hold their last state until
  then. This was needed because `NumericInput` commits on every keystroke that parses.
- **Not done:**
  - There is no action on the orphan notice. "Undo the resize" would be wrong when the last edit
    was something else, and a jump to the operation needs the unsaved-changes guard. Left for Pol.
  - A missing zero-weight picture is never drawn, so it shows no notice until export refuses it.
- **Checks:**
  - typecheck, 355 tests, and the docs pages for the new files;
  - a browser run on port 5175 with doctored readme zips (in the scratchpad):
    - a clean import shows nothing;
    - advisories 1, 2, 4, 5, 6, 7, 8 and 9 each appear, with the failure first;
    - placement is 12px from the top and right edges, 360px wide;
    - dismiss works, and New clears;
    - a committed grid edit clears advisory 4;
    - the stack holds while typing;
    - advisory 9 holds while typing and goes on Enter;
    - there are no console errors.

### W3 closed (Pol, 2026-11-06), committed `3034fc1`

Pol's answers:
- The orphan notice's action becomes "jump to the operation", in W4.
- A missing zero-weight picture with no notice is accepted.
- E12 becomes a Dialog in W4.
- `DESIGN_EXPLORATIONS.md` stays untracked.

### Next session plan: W4 · Dialogs (written 2026-11-06)

Read `DESIGN_SYSTEM.md` ("Dialog", and "Warnings and confirmations" under Interaction
conventions) and `lib/ui/Dialog.svelte` first. Stop for Pol after W4, then W5 (the sweep).

**The problem to solve first.** `NumericInput` commits on every keystroke that parses (E5). The
three destructive Grid & size fields (`GridSection.svelte`: cell size, design width, alignment)
call App's `destructive()` on each commit. So today the E12 confirmation can appear after the
first digit of "54". Pol's rule is that a confirmation comes only once the value is committed
(blur or Enter), and only when the value really changed.

1. **Commit on blur for destructive fields.**
   - Give `NumericInput` a mode (for example `commit="blur"`) that keeps the draft while typing
     and calls `onCommit` once, on blur or Enter, and only if the parsed value differs from
     `value`.
   - `GridSection` uses it for cell size and design width. Alignment is a `Toggle`, so a click is
     already a commit.
   - The preview does not follow typing in these two fields. That is the cost; say so in the
     field's docs.
   - Esc should revert the draft without asking.
2. **E12 becomes a `Dialog`** (`App.svelte`, the `pending` state and the sticky `.notices` /
   `.notice` markup and CSS):
   - the title is a question built from the change, for example "Change cell size to 54?";
   - the body lists the risked operations in a well, each with its index square and
     `op.id · selection type`;
   - the buttons are Cancel and a verb that names the change ("Change cell size");
   - Cancel must also put the field back to the file's value: the `NumericInput` draft is
     dropped on blur, so check it.
   - Then delete the `.notices` and `.notice` CSS and `--color-warn` (`tokens.css`). Its last
     reader is that CSS.
3. **New tileset:** a `Dialog` instead of `confirm()` in `App.svelte` `newTileset`. The title is
   "Start a new tileset?", the verb is "Start new", and the body says it can't be undone and to
   export first.
4. **Unsaved changes** (`OperationsSection.svelte`, its `Popup` with `actions`) moves to a
   `Dialog`. The title is "Discard your changes?", the cancel label is "Keep editing", and the verb
   is "Discard". Keep the `guard(action)` flow.
5. **The orphan notice's action** (Pol: OK). Add "Open op-2" (one action per orphaned operation,
   or the first only) to `advisories.ts` `orphanedNotice`, with an `open` callback passed in. It
   must go through `OperationsSection`'s `guard`, so unsaved changes still asks first.
   - Option: move `guard` and its pending state into `drafting.svelte.ts`, or a small
     `opening.svelte.ts` module, so `App` can call it.
   - The operation should open on its Selection step, and the Operations section should be open
     too.
6. **Breakpoints** (`BreakpointsSection.svelte`, `rows` / `columns` overrides with `risked`):
   check whether an override that hits coordinate-bound operations should also confirm. Ask Pol
   before adding a dialog there; today it only hints.

**Checks:**
- typecheck, tests, docs coverage and the docs build;
- docs pages updated: `numeric-input.md`, `grid-section.md`, `app.md`, `operations-section.md`,
  `advisories.md`, `ui-dialog.mdx` (callers);
- a browser run on port 5175, with a readme zip that has a handpicked or rect operation (build
  one in the scratchpad):
  - typing "54" into Cell size asks nothing until Tab or Enter, then asks once;
  - typing the same value back asks nothing;
  - Cancel reverts the field; Change applies, with one undo entry;
  - New asks with a Dialog;
  - unsaved changes asks with a Dialog;
  - the orphan notice's action opens the operation, through the guard;
  - focus returns to the trigger after each dialog;
  - no console errors.

**Then W5, the sweep:**
- the probes: 24px targets, 12px text, no caps, focus order, `aria-live`;
- the smoke test;
- `DESIGN_SYSTEM.md` and this file;
- close the group with Pol. The recommended next group is 7 (palette widget).

**How to test (found in P3b):** the editor dev server now runs on port **5175** from this tree
(`lsof -iTCP:5175`); reuse it. Playwright is `node_modules/.pnpm/playwright-core@1.56.1`, and the
browser that exists is
`~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`
(pass it as `executablePath`). For a real picture, zip `apps/demo/public/readme` (`tileset.json` +
`tiles/`) into the scratchpad and load it with `setInputFiles('input[type=file][accept*=zip]')`;
the tileset draws to `canvas[data-tileset-canvas]`, so hash its pixels to see a change. Sidebar
sections start folded (open "Breakpoints" before "Add breakpoint"). A destructive edit (for
example the Gutter radio) asks for "Change it" first.

### W4: dialogs (2026-11-06), approved and committed `3a8ca84`

Pol's answers at the start of W4: breakpoint `rows` / `columns` overrides keep **hint only** (no
dialog), and the orphan notice gets **one "Open op-N" per orphaned operation, at most 3**.

- **`NumericInput` `commit="blur"`.** It holds the draft while typing and commits once, on blur or
  Enter, only if the value parses to something other than the file's. Esc reverts. Cell size and
  design width use it, so the preview no longer follows typing in those two fields.
  - Enter calls `preventDefault`: otherwise the same Enter, arriving as a keypress, hit the
    dialog's Cancel the moment focus moved there, and the dialog closed at once.
  - Focus goes back to the field before committing. The dialog opens between the blur and the
    next field's focus, so it remembered `<body>` and Cancel lost focus. Now both answers return
    to the field.
- **E12 is a `Dialog`** (`App.svelte`): "Change cell size to 54?", the risked operations in a well
  (index square + `op.id · type`), Cancel and "Change cell size". `destructive(field, value,
  transition)`. The sticky `.notices` / `.notice` markup and CSS, and `--color-warn`, are gone.
- **New tileset** asks "Start a new tileset?" / "Start new" in a `Dialog`, instead of `confirm()`.
- **Unsaved changes** asks "Discard your changes?" / "Keep editing" / "Discard" in a `Dialog`.
- **`opening.svelte.ts`** (new) holds the guard, moved from `OperationsSection`, plus
  `open(id, step)` and a `revealed` counter. `Section` got a `reveal` prop, which unfolds it, and
  the section scrolls the open card into view.
- **The orphan notice's "Open op9"** (`advisories.ts`, `MAX_OPEN_ACTIONS = 3`, 2 new tests) opens
  the operation on Selection through the guard.
- **Docs:** `numeric-input`, `grid-section`, `app`, `operations-section`, `advisories`,
  `ui-dialog`, `section`, and a new `opening` page. The Notice story's action reads "Open op-2".
  `DESIGN_SYSTEM.md`'s "Warnings and confirmations" mentions `commit="blur"`.
- **Checks:**
  - editor typecheck and 357 tests; docs coverage (119 files), docs typecheck and build.
  - A browser run, 28/28 checks, on port 5175 with the readme zip plus a `cellList` op9 (its
    `responsive` rule removed, because a rows / columns override with a cellList is refused). The
    probe and zip are in the session scratchpad, `w4/`.
    - Typing "54" asks nothing, and the canvas hash is unchanged.
    - Tab asks once (`alertdialog`, focus on Cancel, op9 listed). Cancel reverts the field to 25
      and focus returns to it.
    - The same value asks nothing. Esc reverts and a later blur asks nothing.
    - Enter asks, "Change cell size" applies, and one undo restores 25.
    - "Open op9" opens operation 5 on Selection. With a dirty new draft, it asks "Discard your
      changes?" first (focus on Keep editing), and Discard then opens op9.
    - New asks; Esc cancels and focus returns to New; Start new resets.
    - No console errors.
- **Pol's first review (2026-11-06):** Pol likes the blur commit. Two changes, both done:
  - 12px between the dialog's sentence and the well of operations (`.risked` margin-top);
  - a cue in a blur-commit field holding a changed value: "↵ Enter to apply", muted mono, at the
    field's right edge, and in its `aria-describedby`. It is not shown for the same value, for an
    invalid value, or after Esc or Enter. The probe still passes 28/28.
- **Pol's second review:** the cue's wrapper shrank every `NumericInput` to its content (it sat in
  `FieldRow`'s flex control); fixed with `flex: 1`. Rows now commits on blur too, with the cue.
- **Not done:** breakpoints (Pol: hint only). W5 is next: the probes (24px targets, 12px text, no
  caps, focus order, `aria-live`), the smoke test, and closing the group.

### Next session plan: W5 · Sweep (written 2026-11-06)

Read `DESIGN_SYSTEM.md` ("Notice", "Inline advisory", "Dialog", and "Warnings and confirmations"
under Interaction conventions) and the W1–W4 notes above first. W5 changes little code: it checks
the whole group, tidies, and closes it with Pol. Stop for Pol at the end.

**0. Questions for Pol first (talk, no code):**
- **Breakpoint rule fields** (`BreakpointsSection`, `rows` / `columns` / `cellSize` overrides):
  should they use `commit="blur"` + the Enter cue, like Grid & size? They still commit per
  keystroke. Recommendation: yes for `rows` / `columns` (a "14" builds a 1-row grid first), so
  the sidebar has one rule for grid-shaping fields.
- **Y offset** is the last Grid & size field that follows typing. Keep it live (its change is
  harmless and a live preview helps), or make it blur too for consistency? Recommendation: keep
  it live.
- **The three remaining report Popups** ("Import refused" in `ImportPanel`, "Export failed" in
  `SidebarTopBar`, the "Tiles" attach report in `TilesSection`). The first two block on purpose,
  because nothing happened. Should the Tiles attach report become a pushed failure notice instead
  (some files attached, some didn't)? Recommendation: yes, it matches §12.3's failures.

**1. Probes** (a headless browser on 5175; see "How to test" above). Run them with notices and each
dialog showing, not only on a clean editor:
- every enabled target is at least 24×24 (the notice's Dismiss and actions, the dialog buttons);
- no text under 12px, and no capitals (`text-transform`) anywhere new;
- contrast: the muted Enter cue (`--color-muted` on `--color-field` and on `--color-field-hover`)
  is at least 4.5:1; the notice's muted body on white;
- focus order: a dialog starts on Cancel and returns focus to the trigger (a blur-commit field
  returns to the field); the notice stack's actions and Dismiss are reachable by Tab in reading
  order;
- `aria-live`: advisories are polite and failures assertive, and a notice held during an entry
  (`entry.svelte.ts`) is announced only once it shows;
- no sideways scroll at 1728, 1024, 600 and 320, with the stack showing.

**2. Smoke test.** No smoke test is checked in. The iteration-2 one (`DESIGN_DIRECTION.md`,
"Verification") was a scratch Playwright script. Rebuild it in the scratchpad from that list
(the unsaved-changes popup is now the "Discard your changes?" Dialog), and add the W3/W4 flows:
- an import with advisories;
- a resize that asks, then Cancel and Change;
- "Open op-N" through the guard;
- New through its Dialog.

The W4 test zip is the readme zip (`apps/demo/public/readme`) plus a `cellList` operation, for
example `{"id":"op9","salt":0,"reseedOnLoad":false,"selection":{"type":"cellList","cells":[[27,3],[28,4],[2,2]]},"source":{"type":"random"},"target":"opacity","mapping":{"range":[0,1]},"blend":"set"}`,
with `responsive` removed, because a rows / columns override beside a `cellList` is refused.

**3. Leftovers:**
- grep for stale comments and docs: "sticky", "Unsaved changes" popup, "until Stage 2 W4/W5",
  `confirm(`, "Change it";
- the Notice docs story's data line still says "Orphaned by a resize", but the app's title is "An
  operation lost cells in a resize". Make them agree;
- apply Pol's answers to the questions in step 0.

**4. Docs.**
- In `DESIGN_SYSTEM.md`, add the field's "waiting" state (the Enter cue) to the component table,
  beside `NumericInput`'s row.
- In this file, mark backlog items 3 and 4 done, and write the group's closing note.
- Update the memory file.

**5. Close the group with Pol.** The recommended next group is 7 (the palette widget), then 1 (the
export menu), 6 (glyphs), 8, 9 and 10.

### W5: sweep (2026-11-06), committed `feafa9a`; the group is closed

**Pol's step-0 answers:** the breakpoint `rows` / `columns` / `cellSize` overrides commit on
blur, with the Enter cue. Y offset stays live. The Tiles attach report becomes a failure notice.

- **`BreakpointsSection`:** `GRID_SHAPING` (`rows`, `columns`, `cellSize`) passes `commit="blur"`.
  The other rule fields (`minWidth`, `maxWidth`, `bleed`, `yOffset`) follow the typing. The cue
  fits inside the narrower rule field (checked by the probe and on a screenshot).
- **Tiles attach failures are a notice:** `attachFailures(failures)` in `advisories.ts` (3 new
  tests), pushed by `TilesSection` with key `attach-failures`, so a second failed drop replaces
  it. The refusals (a taken name, a tile in use, the last variant, the last non-zero weight) stay
  in the `Popup`, because nothing happened, like "Import refused".
- **Copy fix found by the probe:** advisories 1 and 4 said "Any change in Grid & size counts the
  columns again". Rows and Y offset never change the count, so they now say "Changing the cell
  size, design width or alignment counts the columns again".
- **Leftovers:** stale docs fixed. `app.md` and `ui-popup.mdx` still mentioned the "Unsaved
  changes" popup. `ui-button.mdx` still described the Block F chip look (border, uppercase, the
  footer's Download, "Change it"), so its overview, props table and styling are rewritten. The
  Notice story's title now matches the app's ("An operation lost cells in a resize"). The grep for
  "sticky", `confirm(`, "until Stage 2 W" and "Change it" finds nothing else stale.
- **Docs:** `DESIGN_SYSTEM.md` has an "Input, waiting" row, Popup is limited to "nothing happened"
  reports, Notice lists the attach failures, and "Warnings and confirmations" states the
  grid-shaping rule. The `advisories`, `breakpoints-section` and `tiles-section` pages are updated.
- **Checks:**
  - editor typecheck and 360 tests; docs coverage (119 files), docs typecheck and build.
  - Probe and smoke test, **58/58**, on port 5175: `w5/probe.mjs` in the session scratchpad, with
    `w5.zip` (readme + op9 `cellList`) and `advisories.zip` (the same with 30 columns, which
    raises parity). It covers:
    - the live regions (polite / assertive, nothing advisory in the assertive one);
    - 24×24 targets, no text under 12px and no capitals, in the stack and in all three dialogs;
    - the muted notice body ≥ 4.5:1, and the Enter cue ≥ 4.5:1 on the field and on its hover;
    - Tab order through the stack;
    - no sideways scroll at 1728, 1024, 600 and 320 with the stack showing;
    - a notice held while Y offset is typed, and parity cleared by a cell size change;
    - the resize Dialog (Cancel, Change, focus);
    - Open op9 through the guard;
    - a breakpoint rows override (no commit while typing, cue, Enter commits, one undo);
    - a good file plus a bad one (a failure notice, no popup, the group still made, Dismiss);
    - New (Esc, focus back, Start new clears the notices);
    - no console errors.
  - A test zip built without its pictures (my mistake, found from a blank preview) made 15
    "didn't load" failures; the rebuilt zip draws, and the run above uses it.
- **Closed by Pol (2026-11-06):** committed as `feafa9a`. Items 3 and 4 are done in the backlog.

## Next session plan: Palette widget (item 7) (written 2026-11-06)

Read `DESIGN_SYSTEM.md` first (Operation card, Operation stepper, Tile group, Input and Input
waiting, Segmented control, Inline advisory) and backlog item 7. The blocks are named K so they
don't clash with the preview group's P. Stop for Pol after each block.

### What exists today (analysed 2026-11-06)

`src/controls/PaletteBar.svelte` (386 lines). `OperationBody` renders it in the Mapping step when
the attribute is `tile`, with `draft.palette` and `draft.sourceType`. Its parts, top to bottom:
1. a "Palette" label whose hint explains that order matters (or, under `random`, that it doesn't);
2. **the bar**: one `button` per entry, `flex-grow` = its share, the tile name only when the share
   is over 12%. Grey blocks; the edited one is ink; `clear` is panel with an edge; a zero weight
   is a 4px sliver. Dragging a segment along the bar reorders live (`indexAt`);
3. inline advisory 8 (reordered under `random`);
4. a muted mono line of `name NN%` per entry, the edited one underlined;
5. for the **selected** entry only: a native `<select>` for the Tile ("clear" + tile names), a
   Weight `NumericInput` (commits per keystroke), then Earlier / Later / Remove;
6. "+ Entry" (adds the first tile) and "+ Clear".

The bar was chosen on purpose (header comment, `09` §7.6 and `04` O6/§6.4): palette order is
meaningful (under a banded Source, neighbours on the bar end up as neighbours on the canvas),
unlike a tile group's asset list, so it must not look like that list.

**Why it is hard to grasp** (Pol, Block F round 2, "hard to grasp"; my reading, to check with Pol):
- the entries are not visible as entries: no thumbnails, names hidden under 12%, and the edited
  entry is chosen through a bar that is also a drag handle;
- the controls under the bar edit an entry you can't see next to them (select-then-edit);
- the weight is a bare number. The tile group's weights are sliders with a live %, so the same
  idea looks different in two places;
- the `name NN%` line repeats the bar in another form;
- "+ Entry" always adds the first tile, which then has to be changed in a select with no pictures;
- a zero-weight sliver is 4px, under the 24px target (Known issues);
- the hint that explains order is only reachable on hover (backlog item 9).

Reusable pieces: `OperationCard`'s palette thumbnails (the tile's first asset, or the slashed
"clear" square), `TileAsset`'s thumbnail + slider + % row, `Slider`, `Menu`, `IconButton`
reorder arrows, `Advisory`, and the glyph grid's selected look.

### Blocks

- **K0 · Questions and analysis (talk, no code).** First check whether the Figma file
  (`VCp0HyxbLOBq0vOkpDWmIL`) has a palette frame. Then put these to Pol:
  1. What was hard to grasp: what an entry is, which one is being edited, what order means, or
     what the weight does? (Use this list as the prompt.)
  2. **Shape.** Recommendation: **rows plus a strip.** Each entry is a row (number, thumbnail and
     name, a weight slider with %, a ⋯ Menu with Move earlier / Move later / Remove), and above
     them a thin proportion strip, read-only, that shows the order and the bands. The rows sit in
     a numbered sequence joined by a line, like the stepper, so they read as an ordered sequence,
     not a sorted list. The alternatives:
     - keep the bar and add thumbnails, with an editor for the selected entry;
     - keep the bar and edit in place with a popover per segment.
     §7.6 argued against rows; the numbering and the strip are how this answers that argument.
  3. **Picking a tile:** a thumbnail grid (the glyph grid look) in a popover, instead of the native
     select? "clear" would be its first cell.
  4. **Adding:** "+ Entry" opens the picker, instead of adding the first tile. Is "+ Clear" still
     needed if clear is in the picker?
  5. **Reorder:** drag on the rows (with a grab handle), the menu's Move earlier / Move later, or
     both? Keyboard: the menu is enough for WCAG 2.5.7 (dragging movements).
  6. **Show the Source's bands?** Under a banded Source (noise), the strip could label the
     threshold positions (0.25, 0.6…). Under `random`, the strip shows shares only and advisory 8
     still applies.
  7. **Weight input:** the same slider as the tile group's (0–2, live %, drag = one undo), or a
     number field?
- **K1 · Mocks.** A static scratch page with 2–3 variants, as in W1 (not in the repo), at real
  size inside an open operation card. Pol picks one.
- **K2 · Pattern and docs.** Write the chosen pattern into `DESIGN_SYSTEM.md`'s component table
  (a "Palette" row) before any code. Note what it reuses.
- **K3 · Implement.** Rewrite `PaletteBar` (it may be renamed, for example `PaletteList`; update
  `OperationBody` and the docs page). Keep the invariants:
  - `06` §7.3: at least one entry, and the weights never all zero (refused);
  - a zero weight stays visible and has a 24px target;
  - `null` is "clear", never a library Tile;
  - advisory 8 only after a reorder under `random`, once the drag is let go;
  - one undo per gesture: today the palette edits a *draft*, which Save commits, so check how a
    slider drag fits that.
  Unit-test any logic moved out of the component (for example a `palette.ts` for
  move/remove/add/weight rules, so the refusals are tested); vitest cannot load `.svelte`.
- **K4 · Sweep.** Probes: 24px targets (including zero weight), 12px text, no capitals,
  contrast, focus order, the keyboard path for reorder (WCAG 2.5.7), no sideways scroll at
  1728 / 1024 / 600 / 320. A smoke test with the readme zip:
  - open operation 1 (tile, noise);
  - add an entry through the picker, weight it, reorder it, remove it;
  - switch the Source to random, reorder, and see advisory 8;
  - Save, then one undo.
  Then the docs pages (`palette-bar` or its new name, `operation-body`), coverage, typecheck,
  tests and the docs build, and close the group with Pol.

### K0 answers (Pol, 2026-11-06), done

The Figma file has no palette frame: the Editor page holds the sidebar, the preview, tile assets,
the operation header and the glyphs only. The design comes from the K1 mocks.

1. **Hard to grasp:** all four: what an entry is, which one is being edited, what order means and
   what the weight does.
2. **Shape:** rows plus a strip. Numbered rows are joined by a line like the stepper, and each row
   has a thumbnail, name, weight slider + % and a ⋯ Menu. A thin read-only proportion strip sits
   above them.
3. **Picking a tile:** a thumbnail grid in a popover (the glyph grid's selected look), with "clear"
   as its first cell. The native select goes.
4. **Adding:** "+ Entry" opens the picker. "+ Clear" is dropped.
5. **Reorder:** both a drag on a grab handle and the menu's Move earlier / Move later (the keyboard
   path for WCAG 2.5.7).
6. **Bands:** under a banded Source the strip labels the threshold positions. Under `random` it
   shows shares only, and advisory 8 still applies.
7. **Weight:** the tile group's slider (0–2, live %, one drag = one undo).

K1 mocks three variants of the rows + strip: A (stepper circles, strip on top), B (the joining
line *is* the strip) and C (compact 32px rows, the §7.6 risk check).

### K1 answer (Pol, 2026-11-06), done

**A with C's rows**: A's 12px strip with the thresholds under it, and C's rows (32px, a mono
number, no circles and no joining line). B was ruled out: at the narrowest sidebar its names
shrink to 27px.

### K2: pattern written (2026-11-06), waiting for Pol's review

`DESIGN_SYSTEM.md` gains two rows, **Palette** (`PaletteList`) and **Tile picker**
(`TilePicker`). Two new icons, `grip` and `swap` (Lucide). The palette's select leaves the Input
row; its refusals join the Popup row; its menu joins the Menu row.

### K3 analysis (to confirm with Pol before coding)

**Files.**
- `src/controls/PaletteList.svelte` replaces `PaletteBar.svelte`, and `OperationBody` swaps the
  import.
- `src/controls/TilePicker.svelte` is the popover.
- `src/controls/palette.ts` + `palette.test.ts` hold the rules: `move`, `add`, `remove`,
  `setWeight`, `setTile` (each returns the new palette or a refusal reason), `thresholds` (the
  labels to show at a given strip width, dropping collisions), `shares`, and `thumbOf(tiles, id)`.
  `thumbOf` is moved out of `OperationCard`, so the card and the list share it.
- Icons: `grip` and `swap` in `icons.ts`, and its test.
- Docs: `palette-bar.mdx` → `palette-list.mdx`, `PaletteBarStory` → `PaletteListStory`, a
  `tile-picker` page, and every page that names PaletteBar (operation-body, operation-labels,
  numeric-input, ui-field-row, ui-button, ui-hint, ui-advisory, engine/mapping, review-findings).

**Behaviour, and five choices of mine for Pol to confirm:**
1. **Refusals.** Removing the last entry, or the last non-zero weight (by Remove or by dragging
   a slider to 0), is refused **after the attempt, in a Popup**, as Tiles does. The menu items
   stay enabled, and the slider springs back. During a drag, a value that would make the total
   zero is not applied to the preview.
2. **The caption and advisory 8 do not stack.** Under `random` the caption reads "order does not
   matter here". After a reorder, advisory 8 *replaces* the caption instead of adding a second
   line that says the same thing.
3. **The slider's top** is the larger of 2 and the largest weight in the palette, so an imported
   weight of 5 is not shown as 2 or clipped by a drag. The % is always the true share.
4. **Dragging reorders live:** the rows swap as the pointer crosses a row's middle, and the
   dragged row is lifted (white, `--shadow-float`). There is no drop line, matching how the bar
   works today. Advisory 8 waits for the release.
5. **Thresholds show under every Source except `random`**, including `constant` (its single value
   still lands in one band).

**Focus and names:**
- The rows are an `<ol aria-label="Palette, in order">`.
- The slider's name is "Weight of entry 2, Blue". The thumbnail button is "Tile of entry 2: Blue,
  change". The menu is "More for entry 2".
- After "+ Entry", focus goes to the new row's thumbnail. After Remove, it goes to the next row's
  menu, or "+ Entry" if there is no next row. After a move, the Menu already returns focus to its
  button.
- The grip is `aria-hidden` and out of the tab order. The menu is the keyboard path.

**Undo.** The palette edits the draft. Save commits the draft as one transition, so a drag, a
slider gesture or a menu action never adds an undo step of its own. That meets "one undo per
gesture" with no extra work. Discard throws the edits away.

**Exit criteria:**
- `palette.test.ts` passes, covering every refusal and the threshold collisions.
- Typecheck, the full test run and the docs build are clean.
- A browser check on the readme zip covers: add through the picker, a weight drag, a drag
  reorder, menu moves by keyboard, a refused remove, the random caption and advisory 8, and Save
  then one undo.
- Then K4's probes.

Pol agreed to all five choices (2026-11-06).

### K3: implemented (2026-11-06), waiting for Pol's review, uncommitted

- `controls/palette.ts` + `palette.test.ts` (18 tests). `move` is generic, so the list moves its
  row keys the same way.
- `controls/PaletteList.svelte` and `controls/TilePicker.svelte`. `PaletteBar.svelte` is deleted.
- `OperationCard` now uses `thumbOf`.
- Icons `grip` and `swap`. Tokens `--strip-h`, `--strip-zero`, `--entry-num-w`, `--entry-name-w`,
  `--picker-w`, `--picker-cell` and `--picker-thumb`.
- Rows are keyed by a local key, so a moved row keeps its focus. A drag captures the pointer on
  the list, because a moved row is reinserted and would lose a capture on its grip.
- Docs: `palette-list.mdx` (renamed, rewritten), the new `tile-picker.md`, `PaletteListStory`, and
  the pages that named PaletteBar. The palette no longer uses FieldRow, NumericInput, Hint or
  Button, so those mentions went.
- Checks: typecheck clean; 378 tests pass; the docs build passes (coverage 121/121); a browser
  smoke on the readme zip passes 31/31 (`k3/smoke.mjs` in the session scratchpad). The smoke
  covers: add through the picker (keyboard), focus on the new thumbnail, a weight, thresholds,
  change tile, menu Move earlier with focus following the entry, a drag reorder, both refusals in
  the Popup, remove with focus to Add entry, `random` (no thresholds, its caption, advisory 8
  after a reorder), and Save then one undo.

Committed as `71fd0c1` (2026-11-06). Pol's review of K3 found a deeper problem: the Tile attribute and the
Source contradict each other. The group is **paused before K4**, and K4's sweep folds into the
next group's T4. K3's choice 5 (thresholds under `constant`) is superseded by that group: under
`constant` only one tile is ever painted.

## Next session plan: Tile and pattern (item 11) (written 2026-11-06)

Read `DESIGN_SYSTEM.md` first (Operation stepper, Palette, Tile picker, Glyph grid), then the
palette group above. Blocks are named T. Stop for Pol after each.

### The problem (Pol, reviewing K3)

"When clicking Tile, and creating a palette, one would expect that those are the weights as in
the 'chances' that each tile is painted. But then, landing on the 'Source' step, it is not clear
what it does, and why 'Random' overwrites what you have done before. I feel that the 'Tile'
attribute might be the hardest one to understand for the user."

### Analysis (2026-11-06, checked against the engine)

**How it works.** An operation does three things in a row:
1. the **Source** gives each selected cell a number from 0 to 1 (`packages/tileset/src/registry/sources.ts`);
2. the **palette** cuts 0–1 into bands, one per entry, each as wide as its weight;
3. each cell gets the tile whose band its number falls in (`applyTileMapping`, `packages/tileset/src/mapping.ts`).

So a weight is the width of a band of *numbers*, not a chance. It is a chance only when the
numbers are spread evenly over the cells, and only Random does that.

**Measured** on the readme grid (29×14, averaged over many seeds), with three entries of equal
weight (each shown as 33% in the editor), through the package's `evalSource` and
`applyTileMapping`:

| Source | A | B | C | Is the editor's % true? |
|---|---|---|---|---|
| random | 33% | 33% | 33% | yes: the weights are chances |
| valueNoise (5, 2 octaves) | 14% | **68%** | 18% | no: the middle entry wins |
| valueNoise (5, 3 octaves) | 12% | **75%** | 13% | no |
| gradient 0° | 34% | 31% | 34% | yes |
| gradient 45° | 26% | **48%** | 26% | no |
| constant | **100%** | 0% | 0% | no: only the first weighted entry is painted |

**Pol's intuition is right, and the editor contradicts it.** Random is the one Source where
"weights are chances" holds. The confusion comes from the editor:
1. **The order is backwards.** The steps run Selection → Attribute → Source → Blend
   (`STEPS`, `draft.svelte.ts`). The palette is built before the Source that decides what its
   weights mean, so choosing a Source afterwards silently changes what was built.
2. **"Source" is abstract.** Its question, "Where does each cell's number come from?"
   (`QUESTIONS`, `OperationBody.svelte`), asks the author to think in hidden numbers. Its options
   are named after algorithms, not after what they paint.
3. **The % is false under three of the four Sources.** It shows each weight's share of the
   total. Under noise and under a diagonal gradient the middle entries cover much more. Under
   `constant` only the first weighted entry is painted, yet every entry is listed with its %.
4. **The palette's layout ignores the Source.** Order and thresholds mean something under noise
   and gradient, nothing under random (advisory 8 is a patch on that mismatch), and under
   `constant` there is one tile, not a palette.

Numeric attributes share problem 1, but more mildly. `NumericMapping` already collapses to one
value under `constant` (§7.4), which is the precedent for the Tile step.

### Recommended direction (to confirm at T0)

This changes the editor only: the file format and the engine stay as they are. **Pattern first,
then tiles.**
1. **Swap the steps** to Selection → **Pattern** (today's Source) → Attribute → Blend, for every
   attribute. The steps stay navigable in any order (D8). Only the default walk and "Next"
   change.
2. **Name the patterns by what they paint**, each with artwork in the glyph grid: *Scattered*
   (random), *Patches* (valueNoise), *Bands* (gradient), *Same everywhere* (constant). The
   question becomes "How should the tiles spread?", or for a numeric attribute, "How should the
   values spread?".
3. **The palette adapts to the pattern:**
   - **Scattered:** a plain list of tiles, each with its **chance**. No numbers, no grip, no
     thresholds, because order means nothing. Advisory 8 is retired.
   - **Patches / Bands:** K3's ordered list (the strip, thresholds, numbers and grip). The caption
     says that neighbours meet, and under Patches that the middle entries cover more. Each row
     shows the share it **actually paints**, measured, instead of its share of the weights.
   - **Same everywhere:** one tile picker, the collapse `NumericMapping` already makes.
4. **Measured coverage.** `coverage(draft, config)` in `controls/palette.ts` evaluates the draft's
   Source over its Selection with the current seed (the package's `evalSource`,
   `applyTileMapping` and `selection`) and counts cells per entry. It is a pure, tested function,
   shown as "≈ 68%".

### Blocks

- **T0 · Questions (talk, no code).** For Pol:
  1. Swap the steps for every attribute, or rework only the Tile step?
  2. The step's name ("Pattern"? "Spread"?) and the four option names.
  3. Which % to show: measured coverage under Patches and Bands, and the chance under Scattered?
     The measured figure moves with the seed.
  4. Same everywhere with Tile collapses to one picker. Should Save write only that entry (what
     you see is what is saved), or keep the hidden ones?
  5. Under Scattered, hide the order UI and retire advisory 8?
  6. Record this as a decision in `DECISIONS.md` that amends `09` §7.6 and `04` §6.4?
- **T1 · Mocks.** A scratch page with the stepper in the new order, the palette in its three
  modes, and the pattern glyph artwork. Pol picks.
- **T2 · Pattern and docs.** `DESIGN_SYSTEM.md` (Operation stepper, Palette) and the decision
  record, before any code.
- **T3 · Implement.** Files:
  - `draft.svelte.ts`: the `STEPS` order, and the tests that rely on it;
  - `OperationBody.svelte`: `QUESTIONS`, the labels, and the source glyph artwork;
  - `labels.ts` and the `OperationCard` chips: their order and names;
  - `controls/PaletteList.svelte`: the three modes;
  - `controls/palette.ts`: `coverage`, with tests;
  - `NumericMapping`: keep its `constant` collapse;
  - the docs pages: operation-body, palette-list, operation-labels, draft.
- **T4 · Sweep, for this group and the palette group's K4.**
  - Smoke on the readme zip: build each pattern, check the measured % against the preview, the
    Same everywhere collapse, and Save then one undo.
  - K4's accessibility probes: 24px targets (including a zero weight), 12px text, no capitals,
    contrast, focus order, the keyboard path for reordering, and no sideways scroll at 1728,
    1024, 600 and 320.
  - Close both groups with Pol.

The palette group's test helpers, `k3/smoke.mjs` and `k3/readme.zip`, live in session
`c5a97149`'s scratchpad. Rebuild them if that is gone (see "How to test").

### T0 answers (Pol, 2026-11-06), done

These replace the "Recommended direction" above wherever the two differ.

1. **Step order:** swap the steps for **every** attribute: Selection → **Pattern** → Attribute →
   Blend.
2. **Naming:** the step "Source" is renamed **Pattern**. **The options keep their names** (Random,
   Noise, Gradient, Constant, from `labels.ts`), so *Scattered / Patches / Bands / Same
   everywhere* is dropped. The question becomes "How should the tiles spread?", or "How should
   the values spread?" for a numeric attribute.
3. **The row %:** the **chance** under Random, and the **measured coverage** ("≈ 68%") under Noise
   and Gradient. The measured figure moves with the seed and the selection.
4. **Constant with Tile** collapses to one tile picker. **Save writes only that entry**, so what
   you see is what is saved, as `NumericMapping` writes min = max. The draft keeps the other
   entries until Save, so switching the pattern back before saving restores them.
5. **Under Random:** hide the order UI (numbers, grip, thresholds) and **retire advisory 8**.
6. **Decision record:** here and in `DESIGN_SYSTEM.md` (T2). Not in the spec: the spec,
   `DECISIONS.md` and the ADRs are archived on purpose and frozen at v0.1.0 in
   `../gen-tileset-spec-archive/` (ab8bf3c; CLAUDE.md: "the code is the authority"). This
   decision **departs from archive `09` §7.6** (the step order) and **`04` §6.4** (the palette
   weights read as bands). Leave the archive as it is.

**Decision (2026-11-06): pattern before attribute.** A palette weight is the width of a band of
numbers, and it is a chance only under Random. So the editor asks for the pattern first, and the
palette shows what its weights mean under that pattern. The file format and the engine do not
change. Rejected: reworking only the Tile step (the stepper would then differ by attribute, and
numeric min/max share the problem in a milder form); renaming the options after what they paint
(Pol keeps the current names).

### T1 answers (Pol, 2026-11-06), done

Mocks are on a scratch page, not in the repo: the stepper in the new order, then the palette
under Random, Noise/Gradient (3a and 3b) and Constant, each at 455px and 380px.
- **The strip under Noise and Gradient: 3b.** It draws the **measured coverage**, so it matches
  the rows' "≈N%". The thresholds are dropped, because they no longer line up with it. "For
  now": the deeper problem, that Noise itself is unexplained, is backlog item 12.
- **Pattern glyphs: approved as mocked.** Each is 4×4 cells (10px at an 11px pitch) in ink
  tints (paper, grey-300, grey-500, ink). Random is scattered, Noise is clumped, Gradient is
  diagonal, and Constant is one flat tint.
- **Constant's kept-entries line: keep.** It is a muted info line under the picker, shown only
  when the draft holds other entries.
- Also mocked and not objected to: under Random, the strip stays (it shows the chances), the
  rows are unnumbered with "chance" over the %, and the ⋯ menu has no Move items. Under
  Noise/Gradient, the header says "≈ painted". At 320px the rows tighten their gaps (a
  container query) and drop that label.

### T2: pattern written (2026-11-06), waiting for Pol's review

`DESIGN_SYSTEM.md` changes:
- **Palette** is rewritten as one row with a shared anatomy and three modes (Random, Noise and
  Gradient, Constant).
- **Operation stepper** gets the new order and Pattern's question.
- **Operation card** chips are now Selection, Pattern, Blend.
- **Inline advisory:** advisory 8 is retired.
- **Tile picker** is also Constant's single tile.
- **Menu:** the Move items appear only under Noise and Gradient.
- **Operation glyphs:** the Pattern artwork is described.

There is no longer any "Source" in the user-facing docs (the code keeps `source` and
`sourceType`).

For T3, beyond the file list in "Blocks":
- **A new token**, `--thumb-lg` (48px), for Constant's thumbnail.
- **The strip's widths and the rows' "≈%"** both come from `coverage()`. `thresholds()` and the
  tick labels lose their last caller under Noise and Gradient, so delete them with their tests.
  Do not keep them unused.
- **`coverage()` cost:** it evaluates the Source over the selection on every weight drag. Measure
  it on the readme grid. If a drag stutters, derive coverage from the field computed once per
  pattern/seed/selection change (the weights only move the cut points). Do not throttle the
  readout.
- **Advisory 8** goes, with its `reorderedUnder` state in `PaletteList` and any docs or tests
  that name it.
- **Save under Constant** writes `palette: [shown entry]`. The draft keeps the full list until
  Save. Test this in `draft` (switch to Constant and back: the list is restored; Save: one
  entry).

## Next session plan: T3 · Implement (written 2026-11-06)

Read the **Palette**, **Operation stepper** and **Operation card** rows in `DESIGN_SYSTEM.md`
first, then "T0 answers", "T1 answers" and "T2" above. The mock is
`t1/mock.html` in session `097a483f`'s scratchpad; if it is gone, the T1 answers describe it.
T3 is one block and stops for Pol's review before committing, but it runs in four steps, each
with green tests before the next.

### Step 1 · Step order and the "Pattern" name (logic, then UI)
- `src/draft.svelte.ts`: `STEPS = ["selection", "source", "attribute", "blend"]`. The internal
  key stays `source` (it matches `op.source`, `sourceType` and the file). Update the comment
  above `STEPS`: it cites §7.4's constant collapse and the advisory about a reordered palette,
  and the advisory part goes.
- `src/lib/operations/labels.ts`: the step label. `labelFor(step)` renders step names
  (`OperationBody.svelte:282`, `OperationCard.svelte:140`), and `labelFor("source")` gives
  "Source". Add a `STEP_LABELS: Record<Step, string>` (`source` → "Pattern") and use it at both
  sites. Do not add `source` to `NAMED`, because that map is for registry names and a Source
  type named `source` would then be mislabelled. `summaryCells` / `summaryText` follow `STEPS`,
  so the summary becomes `Selection * Pattern * Attribute * Blend`: check
  `operation-labels` tests and docs.
- `OperationBody.svelte`: `QUESTIONS.source` = "How should the tiles spread?" when
  `isTileTarget(draft.target)`, or when no target is chosen yet (the default walk reaches
  Pattern before Attribute, and Tile is the common case). Otherwise it is "How should the values
  spread?". "Next" and the open-step walk (lines ~237–251) already follow `STEPS`.
- `OperationCard.svelte:79`: `chips = ["selection", "source", "blend"]` keeps that order, and
  the label comes from `STEP_LABELS`.
- `newDraft`: check which step a new draft opens on, and that "Next" from Selection goes to
  Pattern.
- Tests: `src/draft.test.ts` and the labels tests rely on the order. Update them, and add one:
  the default walk is selection → source → attribute → blend.

### Step 2 · Pattern glyph artwork
- `OperationBody.svelte`: the Source glyph grid (the `{:else if draft.step === "source"}` branch,
  ~line 376) gets an `artwork` snippet per Source, using the T1 mock's 4×4 tint grids
  (`ART` in the mock), as inline SVG with tokens: paper + 1px ink stroke, `--grey-300`,
  `--grey-500`, ink. Selection's glyphs are SVG files from Figma, but these are written by hand
  like All and Checkered, so inline is fine. A Source registered later with no artwork keeps a
  label-only cell (E9).

### Step 3 · `coverage()` and the palette's three modes
- **`coverage` in `src/controls/palette.ts`** (pure and tested). Signature, roughly:
  `coverage(config, operationId, seed, loadSalt): number[]`, giving the share of selected cells
  per **entry index**. It counts by index, not tile id, because two entries can share a tile, so
  it cannot just tally `applyTileMapping`'s return value. It is built only from the package's
  exports:
  - `selection(config, id, seed, loadSalt)` gives the predicate;
  - `operationCtx(config, op, effectiveSeeds(seed, loadSalt))` with `sources.get(type)` and
    `evalSource(...)` gives `t` per cell;
  - the band rule copied from `applyTileMapping` (`packages/tileset/src/mapping.ts:124`) gives
    the entry index. Add a **parity test**: for every cell of a fixture, the tile at
    `palette[index]` equals `applyTileMapping(m, t)`. If the copy drifts, the test fails.
  - Feed it the **shadow config** App already builds (`shadow`, `App.svelte` ~296). Then the
    measured % describes exactly what the preview draws, with the same `config.defaultSeed` and
    `loadSalt`. This needs a prop path from App to `PaletteList`: look at how `OperationBody`
    gets its context today and pick the smallest path.
  - **Grid size:** use the grid the preview is showing (the active breakpoint's rows and
    columns), if `PaletteList` can reach it cheaply. Otherwise use the base grid, and **ask
    Pol**.
  - **Speed:** time it on the readme grid (29×14) during a weight drag. If it stutters, split it
    into `fieldOf(...)`, which holds the selected cells' `t` values and is recomputed only when
    the pattern, params, seed, selection or grid change, and `coverageOf(field, palette)`, which
    is cheap per drag. Do not throttle the readout.
  - Tests: Random's coverage is near the weight shares on a large grid; with Constant, all cells
    go to the first non-zero entry; a zero weight gives 0; an empty selection gives all zeros
    (and the UI shows "—", not NaN); and the parity test.
- **`PaletteList.svelte`**, with its modes switched on `sourceType`:
  - **random:** no grip, no number, and no Move items in the Menu. The strip and the % come
    from `percents()` (the chances). The header label is "chance". The caption is from the T1
    mock.
  - **noise, gradient, and any other Source:** ordered rows. The strip widths and "≈N%" come
    from `coverage()`. The header label is "≈ painted". The captions are from the mock.
    **Delete `thresholds()`**, its tests and the tick markup, which lose their last caller.
  - **constant:** see Step 4.
  - **Retire advisory 8:** remove `reorderedUnder`, `orderMeaningless`, `showReorderAdvisory`
    and the advisory markup, and check `advisories.ts` and docs for any mention of 8.
  - At the narrowest widths, the container query from the mock: under 250px, the gaps go to
    `--space-2` and the header label is hidden.
- Tokens: `--thumb-lg: 48px` in `tokens.css` and in DESIGN_SYSTEM.md's Size row.

### Step 4 · Constant with Tile
- **What is shown:** the entry the engine paints under `constant`. That is the first entry with
  a non-zero weight (the engine maps `t = 0`), so not necessarily `palette[0]`. A pure helper
  `constantEntry(palette)` in `palette.ts`, tested.
- **UI:** the "Tile" label, a 48px thumb button that opens `TilePicker` (picking replaces that
  entry's tile), the name, and "every selected cell". The kept-entries info line lists the
  other tiles' names and shows only when they exist.
- **Save:** `mappingOf(draft)` (`draft.svelte.ts:216`) writes `{ palette: [constantEntry with
  weight 1] }` when `sourceType === "constant"` and the target is Tile. The draft's `palette`
  stays whole, so switching the Pattern back restores the list. `toShadowOperation` uses the
  same rule, so the preview matches. `draftDiffers` must treat a saved Constant operation
  opened again as unchanged.
- Tests in `draft.test.ts`: Constant gives a one-entry mapping; switching to Noise and back
  before Save restores the list; reopening a saved Constant op is not dirty; a file with a
  multi-entry palette under constant opens showing its first non-zero entry.
- `NumericMapping`'s constant collapse is unchanged; just check that it still renders under the
  new order.

### Docs (Starlight, `apps/docs/src/content/docs/editor/`)
`draft.md`, `operation-body.md`, `operation-card.md`, `operation-labels.md` and
`palette-list.mdx` (with `apps/docs/src/stories/PaletteListStory.svelte`: give it the three modes),
and `tile-picker.md` (Constant uses it). Run the docs build and the docs coverage check.

### Verify
- `pnpm test` and `pnpm typecheck` from the root, both green; the docs build passes.
- The browser smoke, rebuilt from K3's `k3/smoke.mjs` (session `c5a97149`'s scratchpad, with
  `k3/readme.zip`; rebuild with `os.walk` over `tiles/` if gone), dev server on **5175**:
  - a new Tile operation's walk: Selection → Pattern → Attribute → Blend via "Next";
  - each Pattern: the Random rows are unnumbered with chances; under Noise, "≈%" sums to about
    100 and matches a pixel count of the preview's cells; Gradient likewise;
  - Constant: one picker, the line about kept entries, Save, and the file holds one entry;
    switching back before Save restores the list; one undo after Save;
  - no advisory 8 anywhere;
  - no sideways scroll at 1728, 1024, 600 and 320, no text under 12px, targets of 24px or more.
- Stop for Pol's review. The **T4 sweep** (with K4's accessibility probes) follows, as planned in
  "Blocks".

## T3 (implemented 2026-11-06, in review, uncommitted)

Built as planned above, with these decisions and findings:
- **Coverage is measured on the grid the preview shows.** The open question needed no answer from
  Pol: `preview.width` is already a store, and the active rules give rows and columns. To get
  there, **`loadSalt` moved from `App.svelte` into `preview`** (`view.svelte.ts`), because App,
  the footer's Fresh load and the coverage all read it. `SidebarFooter` has no props now.
- **`shadowConfig(config, draft)`** in `draft.svelte.ts` replaces App's inline shadow, and
  `toShadowOperation` now carries the draft's real `source` once one is chosen. Nothing else
  changes for `selection()`, which never read it. The shadow still carries no palette, so a
  weight drag recounts the field and does not re-evaluate the pattern.
- **`fieldOf` + `coverageOf` were split from the start** rather than after timing. The field is
  derived in `OperationBody` and does not depend on `draft.palette`. `PaletteList` is
  presentational: it takes `coverage: number[] | null` and shows "—" for `null`.
- **The plan's "`toShadowOperation` uses the same Constant rule" was moot**: the preview draws
  `session.file`, not the draft, so only `mappingOf` (and with it `toOperation`, the card's
  title and `draftDiffers`) needed the one-entry rule.
- **Pattern glyphs** are `pattern-art.ts` (SVG strings, tested) passed to `GlyphGrid` as an
  `artwork` snippet via `createRawSnippet`; `GlyphGrid` items gained `artwork?: Snippet`.
- The Random list is a `<ul>`, the ordered one an `<ol>` (`svelte:element` with `role="list"`).
  A zero *measured* share also draws as a strip tick.
- Tokens: `--thumb-lg` 48, `--share-measured-w` 48 ("≈68%" did not fit `--share-w` 40).

Verified: `pnpm test` (655 package + 396 editor) and `pnpm typecheck` green, docs build and
coverage pass. The browser smoke passed **51/51** (`t3/smoke.mjs` + `t3/readme.zip` in session
`135a6279`'s scratchpad). Its ≈% figures were checked against `generate()` on op1 alone, counted
by a throwaway test: 29 columns [63, 37], and [16, 77, 7] with Pink added; 9 columns (the ≤500
breakpoint) [52, 48] and [0, 84, 16]. Fresh load moves them, since op1 reseeds on load. Constant
saves one entry, switching back before Save restores the list, one undo reverts the Save, and
there is no sideways scroll, no text under 12px and no target under 24px at 1728, 1024, 600 and
320 px.

Committed as `bf60a0d` (2026-11-06), with Pol's go-ahead.

## Next session plan: T4 · Sweep (written 2026-11-06)

T4 closes **two** groups: Tile and pattern (item 11), and the palette widget (item 7, whose K4
folded in here). It is one block that stops for Pol's review before committing. Read
`DESIGN_SYSTEM.md` (**Palette**, **Operation stepper**, **Tile picker**) and "T3" above first.
No new design: the sweep fixes what the probes find, and asks Pol before changing anything
visible.

### Step 0 · Three questions for Pol (before any fix)
1. **Constant shows "Tile" twice.** The options bar says "Tile", and inside the well the label
   is "Tile" again. The T1 mock did the same. Drop the inner label, or keep it?
2. **Old files with several entries under `constant`.** The stepper shows the one entry that
   paints, and Save writes only it. But a collapsed card reads the *file*, so until it is
   re-saved its title lists every entry, including ones that never paint. Make `writesOf` apply
   the same rule (`constantEntry`), or leave the card showing the file as written?
   Recommendation: apply it, because the card should say what the operation does.
3. **The open card's accent edge (backlog 10).** Handle it in this sweep, or leave it for later?

### Step 1 · Probes (rebuild from W5's and T3's helpers)
Use `t3/smoke.mjs` + `t3/readme.zip` (session `135a6279`'s scratchpad) and W5's `w5/probe.mjs`
(session `e17b73a2`'s scratchpad: targets, text size, capitals, contrast). If they are gone,
rebuild them (see "How to test"). Dev server on **5175**. Check:
- **Targets ≥ 24px**, including a zero-weight row's slider, the grip, Constant's 48px thumb, the
  Pattern glyph cells and the picker cells;
- **text ≥ 12px** and **no capitals** (`text-transform`), including "≈ painted", "chance",
  "every selected cell" and the glyph labels;
- **contrast**: the muted header note, captions, the "—" readout and the step answers (4.5:1).
  The Pattern glyphs' grey-300 cells are decorative, since the label carries the meaning; say so
  rather than "fixing" them;
- **focus order and keyboard**: the Pattern radiogroup's arrow keys, the keyboard reorder path
  (Menu → Move earlier/later, WCAG 2.5.7) under Noise and Gradient, the picker from Constant's
  thumb (opens, Esc returns focus), and after Remove;
- **no sideways scroll** at 1728, 1024, 600 and 320, with the palette open in each mode. The
  250px container query under the narrowest sidebar: the header note is hidden and nothing
  overflows (check that "≈100%" fits `--share-measured-w`);
- **screen reader names**: the Random list is a `ul` "Palette", the ordered one an `ol` "Palette,
  in order"; Constant's thumb is "Tile: Beige, change"; the kept-entries line is announced
  (Advisory's `role="status"`).

### Step 2 · Behaviour not covered by T3's smoke
- **Gradient against `generate()`**, as Noise was in T3: a throwaway vitest in `apps/editor/src`
  counting op1 under `gradient` (angle 45, and 0) at 29 and 9 columns, compared with the UI's ≈%.
  Delete the throwaway test afterwards.
- **"—"**: a Tile operation whose Selection selects nothing (Handpick with no cells) shows "—" on
  every row and draws no NaN in the strip.
- **Numeric attribute under Constant**: `NumericMapping` still collapses to one handle in the new
  order, and switching Pattern back un-collapses it.
- **Speed**: time a weight drag on the readme grid (29×14) and on a large grid (e.g. 60×120).
  The field does not depend on the palette, so a drag should only re-run `coverageOf`. Confirm
  this with a counter or a performance mark, then remove the instrumentation. Only optimise if it
  stutters.
- **Undo**: one Save is one undo entry under each pattern; Discard leaves no entry.
- **Edit-draft coverage**: reopening op1 (an edit-draft, so its id is already in the stack)
  measures the draft, not the stored operation. Change the noise params and the ≈% moves before
  Save.

### Step 3 · Leftovers and docs
- Apply Pol's Step 0 answers, with tests (`labels.test.ts` for question 2).
- Grep the user-facing docs and copy for a step called "Source". The code keeps `source` and
  `sourceType`, and the docs may name those, but not the step. Grep for "threshold" and "advisory
  8" too. Stale line-number citations in the touched docs pages: fix the ones T3 moved.
- Re-run the docs build and the coverage check.

### Step 4 · Close
- `pnpm test`, `pnpm typecheck` and the docs build all green; the probe and smoke counts recorded
  here.
- Stop for Pol's review, then commit and **close both groups** (item 7 and item 11) in "Current
  position" and the backlog.
- Pick the next group with Pol. Recommendation: **12 (explain Noise)**, while the Pattern step is
  fresh; then 1 (export menu), 6 (Attribute and Blend glyphs), 8, 9 and 10.

Side note: the notes untracked by 9e9590c had also been deleted from disk. `CLAUDE.md` and
`ARCHITECTURE.md` were restored from `9e9590c^` (Pol's choice: these two only).

### How to test

As before: the dev server on **5175**, Playwright from `node_modules/.pnpm/playwright-core@1.56.1`
with `executablePath` set to the headless shell (see "How to test" in P3b). Build test zips with
`os.walk` over `tiles/`. Zipping only the `tiles/t1` directories leaves the pictures out, and the
preview draws nothing. W5's `probe.mjs` (session scratchpad) is a template for the audit
helpers (targets, text size, capitals, contrast).

After item 7, the recommended order is 1 (export menu), 6 (glyphs), 8, 9 and 10.

## T4 · Step 0 answers (Pol, 2026-11-06), done
1. Constant's inner "Tile" label: **dropped**. The chip and the options caption keep it; the
   thumb's name ("Tile: Beige, change") still carries it for a screen reader.
2. Old multi-entry files under `constant`: **the card applies `constantEntry`**. `writesOf` and
   `summaryCells` name only the entry that paints.
3. Backlog 10 (accent edge): **left for later**.

## T4: sweep (2026-11-06), waiting for Pol's review, uncommitted

Changes:
- **`labels.ts`**: a `painting()` helper gives `writesOf` and `summaryCells` the one entry
  `constantEntry` picks under `constant`, so they agree with the stepper and with Save. 1 new
  test in `labels.test.ts` (an old two-entry file, a zero first weight, Noise unchanged).
- **`PaletteList.svelte`**: Constant's inner "Tile" label removed, with the reason in place.
- **`palette.ts`: `coverageOf` was too slow on large grids.** It read the draft's `$state`
  palette per cell and re-summed it every time: **13.9 ms a drag move on 61×120** (7,320 cells),
  1.4 ms on the readme grid. `entryWalk` reads the palette once, and `entryIndex` is now
  `entryWalk(palette)(t)`, so the parity test still covers the walk: **0.10 ms** and **0.02 ms**.
  A frame went from 49 ms back to the headless baseline of 33. The drag never recounts the
  field (`fieldOf` ran 0 times during it). 1 new test: `coverageOf` against `applyTileMapping`
  counted by id (diagonal Gradient, zero weights, `t = 1`).
- **Docs**: `numeric-mapping.mdx` called the step "Source" → "Pattern"; `operation-labels.md`
  gains `writesOf`/`writesText` and the Constant rule; `palette-list.mdx` and
  `operation-card.md` gain the T4 changes; stale line citations fixed in `app.md`, `draft.md`,
  `operation-body.md` and `operation-labels.md` (`draftDiffers` moved to `opening.svelte.ts`
  in W4). `app.md`'s `Tileset.svelte:199` stays: it describes the 0.8.1 code. "Threshold" and
  "advisory 8" appear only as "retired in T3" notes.

Verified:
- **Gradient against `generate()`** (a throwaway vitest, deleted): op1 at angle 0 and 45, at 29
  and 9 columns. generate() gave [48, 52], [44, 56], [50, 50], [50, 50]; the UI shows the same.
- **Probe 69/69** (`t4/probe.mjs` in session `06ac963b`'s scratchpad, built from W5's helpers;
  the two drag-timing checks need the counters, which are removed now). It covers: targets ≥ 24,
  text ≥ 12 and no capitals in the palette (all three modes), steps, Pattern glyphs, entry menu
  and picker; contrast ≥ 4.5 for the header note, caption, shares, "—", step answers and "every
  selected cell"; the `ol`/`ul` names, "Tile: Beige, change", and the kept line as a status; the
  Pattern arrow keys; Move earlier/later by keyboard under Noise and Gradient (focus stays on the
  row's menu); picker from the thumb by keyboard, Esc back to the thumb; Remove moves focus to
  "Add entry"; no sideways scroll at 1728, 1024, 600 and 320 in each mode, and "≈100%" fits;
  Handpick with no cells shows "—" with no NaN; Opacity collapses to one handle under Constant
  and comes back; reopening op1 and changing the noise moves the ≈% before Save; one Save is one
  undo entry under Random, Gradient and Constant, and Discard adds none.
- **T3's smoke 51/51** unchanged.
- `pnpm test` (655 package + 398 editor), `pnpm typecheck`, the docs build and coverage (122
  files) all green.

Notes, no change made:
- The grip is 24×32 and `aria-hidden`: a pointer-only shortcut, and the menu is the target.
- The Pattern glyphs' grey cells are decorative; the label carries the meaning.
- Under Noise, the ≈% belongs to the **position**, not the tile: swapping two equal-weight
  entries swaps the tiles and keeps [63, 37]. That is correct (the field is ordered), but it may
  surprise someone; item 12 (explain Noise) is the place to say so.
- At 1024 the palette is 280px wide, so the 250px container query only applies at 320.

Committed as `855d6ad` (2026-11-06), with Pol's go-ahead. Items 7 and 11 are closed.

## Next session plan: Explain Noise (item 12) (written 2026-11-06)

Read `DESIGN_SYSTEM.md` (Operation stepper, Palette, Glyph grid, Field row, Advisory) and "T4"
above first. Blocks are named N. Stop for Pol after each. This changes the editor only: the
file keeps `valueNoise`, `cellsPerFeature` and `octaves`, and the engine is untouched.

### The problem (Pol, T1 review)

The user needs Noise itself explained: why the middle entries cover more, and what *Octaves*
and *Cells per feature* do.

### Analysis (2026-11-06, measured against the engine)

**How it works** (`valueNoise`, `packages/tileset/src/registry/sources.ts`). The grid is
covered by a coarser lattice whose points are `cellsPerFeature` cells apart. Each lattice point
gets a random number, and each cell blends its four nearest points (bilinear, smoothstep). Each
extra octave adds a lattice twice as fine at half the weight, and the result is the weighted
average. Blending and averaging pull values toward 0.5, so the middle of 0–1 is common and the
ends are rare.

**Measured** on a 40×40 grid over 40 seeds, with three equal entries (as three equal bands):

| Octaves | Cells per feature | Share of each third | Neighbours in the same band | Spread (sd) |
|---|---|---|---|---|
| 1 | 2 / 5 / 10 | 27/47/26, 26/51/23, 25/51/24 | 65%, 84%, 92% | 0.21 |
| 2 | 2 / 5 / 10 | 16/69/15, 17/68/15, 17/69/14 | 71%, 83%, 91% | 0.15 |
| 3 | 2 / 5 / 10 | 12/76/12, 14/75/11, 13/76/11 | 71%, 84%, 91% | 0.14 |

So the two parameters do separate jobs, which is the explanation the author needs:
- **Octaves sets the bias toward the middle.** With 1, the end entries get about a quarter each.
  With 3, they get about an eighth. It also adds fine detail on top of the big patches.
- **Cells per feature sets the patch size, and nothing else.** It is roughly how many cells
  across one patch is. Small values give speckle, large values give broad areas. It does not
  change the shares.
- **Values below 0.1 and above 0.9 almost never happen** (0–2% of cells). An end entry needs a
  larger weight to show up at all.
- The ≈% belongs to the **position** in the list, not the tile (T4 note): swapping two
  equal-weight entries swaps the tiles and keeps the shares.

**What the editor shows today.** The Pattern step's Noise well has two field rows,
"Cells Per Feature" (a number field; `labelFor` title-cases it, unlike every other label) and
"Octaves" (segmented 1/2/3), each with only a range hint ("Accepts …"). The palette caption
says that middle entries cover more, but not why or what to do about it. Hints open only on
hover (backlog 9), so anything essential cannot live only in a hint.

### Recommended direction (to confirm at N0)

1. **Editor-only names**, in sentence case: *Cells per feature* → **Patch size** (in cells), and
   *Octaves* → **Detail** (1 / 2 / 3). Through `labelFor`'s fixed names, like `valueNoise` →
   "Noise". The docs give the file name next to each.
2. **A short caption in the Noise well**, always visible (not a hint): "Noise paints patches.
   Patch size is about how many cells across a patch is. More detail adds smaller patches on
   top and makes middle entries more common." Plus a hint on each label for the extra detail.
3. **A live field preview** in the Pattern well: a small greyscale map of the pattern's values
   on the grid the preview shows (`fieldOf` already computes them for the selected cells). It
   changes as Patch size and Detail change, so the effect is visible before any tile is chosen.
   Possibly for Gradient and Random too, for consistency.
4. **The palette caption says why and what to do.** Under Noise: "Middle entries cover more
   because noise rarely reaches its ends. Give the first and last entries more weight to even it
   out." Optional, for Pol: an **"Even out"** action that sets the weights so each entry paints
   about the same share with this seed (band edges at the field's quantiles). One undo.

### Blocks

- **N0 · Questions (talk, no code).** For Pol:
  1. Rename the params in the editor only (Patch size, Detail)? Or keep the names and only explain?
  2. Where the explanation lives: an always-visible caption in the well (recommended, since hints
     need a mouse), hints only, or a "How noise works" popover?
  3. The field preview: yes or no? For Noise only, or every pattern? Above or below the fields?
  4. "Even out" weights: build it, or only say what to do in the caption? It depends on the
     seed, like the ≈% does.
  5. Say in the caption that the ≈% follows the position, not the tile?
  6. Fix `labelFor`'s title case for every unnamed param (sentence case), or only these two?
- **N1 · Mocks.** A scratch page (not in the repo) with the Noise well in two or three variants:
  caption + preview + renamed fields, at 400px and at the narrowest sidebar. Pol picks.
- **N2 · Pattern and docs.** `DESIGN_SYSTEM.md` (Operation stepper's Pattern well, Palette
  caption, any new Field preview pattern) before any code.
- **N3 · Implement.** Likely files: `lib/operations/labels.ts` (`labelFor` names, tests);
  `controls/ParamFields.svelte` / `ParamControl.svelte` (per-param hints); `OperationBody.svelte`
  (the caption, the preview); a new `controls/field-preview.ts` (pure, tested: field → grey
  levels) and its component; `controls/palette.ts` (`evenOut`, with a test against `coverageOf`)
  if Pol wants it; `PaletteList.svelte` (caption); the docs pages.
- **N4 · Sweep.** Rebuild the probe from `t4/probe.mjs` (session `06ac963b`'s scratchpad):
  targets, text, capitals, contrast, keyboard, reflow at 1728/1024/600/320, the preview's cost
  on a 61×120 grid while dragging Patch size, and the measured shares after "Even out" against
  `generate()`. Close the group with Pol.

After 12, the recommended order is 1 (export menu), 6 (Attribute and Blend glyphs), 8, 9 and 10.

### N0 answers (Pol, 2026-11-06)

These replace the "Recommended direction" above where the two disagree.

1. **The names stay.** "Cells per feature" and "Octaves" are not renamed. Each label gets a
   hint (on hover) that says what it does: Cells per feature sets the patch size; Octaves sets
   how strongly the middle entries win, and adds finer detail.
2. **A "How noise works" popover**, opened from an ⓘ button in the Noise well (a Popup, so
   keyboard users can reach it), holds the explanation. There is no always-visible caption in
   the well.
3. **A field preview for every pattern** (Noise, Gradient and Random; hidden for Constant) in
   the Pattern well, **and the main preview goes live** (Pol: "the main preview will show the
   operation effect as it is being built … all the inputs of the operation must change the
   preview live"):
   - While the draft is incomplete (it has a pattern but cannot paint yet), the main preview
     shows the **pattern's greyscale field over the selected cells**, on top of the saved
     picture.
   - Once the draft is complete (`isComplete`), the main preview draws the **real result**:
     `<Tileset>` on the file with `toOperation(draft)` in it (`shadowConfig`'s rule: replace
     by id, else append).
   - The **draft cue** is an ultramarine accent frame around the preview and a "Draft · not
     saved" tag in the notice corner. Both go away on Save or Discard.
4. **No "Even out" action.** The palette caption under Noise says why and what to do:
   "Middle entries cover more because noise rarely reaches its ends. Give the first and last
   entries more weight to even it out."
5. That the ≈% follows the **position** in the list, not the tile, is said **in the popover
   only**.
6. **`labelFor`'s fallback becomes sentence case everywhere** ("Cells per feature"), with its
   tests and docs.

**This amends Invariant S2.** `App.svelte`'s header says the preview is `<Tileset>` on the
file the editor holds, with "no preview mode". While a complete draft is open, `<Tileset>` will
draw the file *with the draft's Operation in it*. What S2 guarantees still holds: it is the same
component and the same code, so the live picture is the one Save produces. But the input is no
longer the saved file. N2 records the amendment at the point of use (`App.svelte`) and in
`DESIGN_SYSTEM.md`, together with the option rejected (a separate preview renderer, which is
the drift S2 exists to prevent). **E3** is untouched: nothing is written to `session.file`.

### N1 picks (Pol, 2026-11-06)

The mock is a scratch page (session `47d2af55`, `n1/mock.html`), not in the repo.

1. **Field preview placement A**: above the fields in the well, full width, with a 0–1 scale
   under it.
2. The "How noise works" popover as mocked (explanation, the share bars for Octaves 1/2/3, the
   ends advice, the position note).
3. Gradient and Random get the same preview; Constant none.
4. **No incomplete-draft state.** The field is not drawn over the main preview. Until the draft
   can paint, the preview stays as today (the saved picture and the selection overlay); once
   `isComplete`, it draws the real result. N0.3's "field over selection" is dropped.
   Consequence (Claude's call, flagged in N2): the draft cue shows **only while the preview
   draws the draft**, so it always means "this picture is not saved".
5. The palette caption as mocked.
6. **Draft frame 1px** (`--rule-w`), ultramarine.

Measured for the popover (engine, `fieldOf` + `coverageOf`, Cells per feature 5, 40×40,
40 seeds, three entries): equal weights paint 23/52/26 (Octaves 1), 15/68/17 (2), 12/75/14
(3). First and last at weight *w*, Octaves 2: 1.5 → 22/54/25, 2 → 27/44/29, 2.5 → 30/37/33,
3 → 32/32/35. So "about three times the middle one" under 2 octaves.

### Blocks, revised after N0

- **N1 · Mocks.** A static scratch page (not in the repo) at a 400px sidebar and at the
  narrowest sidebar. It shows the Noise well (hints, the open popover, the small field preview
  in two or three placements), the main preview in three states (saved, incomplete draft with
  the field over the selection, complete draft live), each with the draft cue, and the
  palette's Noise caption. Pol picks.
- **N2 · Docs.** `DESIGN_SYSTEM.md`: the Pattern well (hints, popover, field preview), the
  live-draft preview and its cue, the palette's Noise caption, and the S2 amendment.
- **N3 · Implement.**
  - `lib/operations/labels.ts`: the sentence-case fallback, and `labels.test.ts`.
  - `controls/palette.ts`: `fieldCells(config, operationId, seed, loadSalt)` → `{x, y, t}[]`
    beside `fieldOf` (`fieldOf` becomes its `t`s), tested against `fieldOf`. The well's field
    preview needs the positions to draw the whole grid.
  - `draft.svelte.ts`: `draftFile(file, draft)`, the file with `toOperation(draft)` in it,
    or `null` while incomplete. It shares `shadowConfig`'s replace-or-append rule (factored
    into one function). Tested in `draft.test.ts`.
  - `App.svelte`: `<Tileset>` draws `draftFile ?? file`. While `draftFile` is not `null`, the
    1px accent frame and the "Draft · not saved" tag show. (No FieldLayer: N1 pick 4.)
  - The Pattern well: a small field-preview component (its logic in a tested `.ts` file:
    field → grey levels), the ⓘ popover, and per-param hints (`ParamFields` /
    `ParamControl`, hint text kept in the editor, keyed by param name).
  - `PaletteList.svelte`: the Noise caption.
- **N4 · Sweep.** Rebuild the probe from `t4/probe.mjs` (session `06ac963b`'s scratchpad):
  targets, text, case, contrast, the popover by keyboard, and reflow at 1728/1024/600/320.
  Measure the **cost of a live redraw** on a 61×120 grid while dragging a weight and Cells per
  feature (if regenerating `<Tileset>` on every tick is too slow, throttle to animation
  frames). Check that the live picture matches the picture after Save, cell for cell, and that
  the cue goes away on Save and on Discard. Close the group with Pol.

## Next session plan: N3 · Implement (written 2026-11-06)

Read first: `DESIGN_SYSTEM.md` (Layout: **Live draft**, **Draft cue**; Component patterns: the
**Operation stepper**'s Pattern well, **Explainer popover**, **Palette**'s Noise caption, **Field
row**), then "N0 answers" and "N1 picks" above. The N1 mock is session `47d2af55`'s scratchpad
`n1/mock.html` (copy, sizes, popover text). The engine is untouched; the file format is
untouched. Stop for Pol after step 0 if it needs an answer, and at the end.

### Step 0 · One question for Pol (before step 1)

`labelFor`'s fallback serves **registry names too**, not only params: `everyNth` → "Every Nth"
and `scaleX` → "Scale X" (`labels.test.ts` lines 29–30). Plain sentence case would give "Every
nth" and "Scale x". Recommendation: sentence case, but keep a **single-letter word** uppercase
(an axis: "Scale X") and give `everyNth` a fixed name in `NAMED` ("Every Nth"). Ask Pol, then
apply.

### Step 1 · Labels (`lib/operations/labels.ts`)

- `labelFor` fallback: sentence case per step 0. Update `labels.test.ts` (add
  `cellsPerFeature` → "Cells per feature") and grep the docs pages and other tests for
  title-cased labels ("Cells Per Feature", "Every Nth", …).

### Step 2 · Pure logic, tested

- `controls/palette.ts`: `fieldCells(config, operationId, seed, loadSalt)` → `{ x, y, t }[]`
  (selected cells, reading order); `fieldOf` becomes `fieldCells(...).map((c) => c.t)`. Test:
  same values as before for random/noise/gradient/constant (the existing parity test keeps
  passing).
- New `controls/field-preview.ts`: from the grid size and `fieldCells`, the preview's cell
  greys: `t` → a grey between paper and ink, unselected → `null` (drawn `--grey-200`). Tests:
  ends map to paper and ink, unselected cells stay `null`, length = rows × columns.
- `draft.svelte.ts`: factor `shadowConfig`'s replace-or-append into one helper, then
  `draftFile(file, draft)`: `null` unless `isComplete(draft)`, else the file with
  `toOperation(draft)` in it. Tests in `draft.test.ts`: create appends, edit replaces in place
  (index kept), incomplete → `null`, Constant saves one entry (as `toOperation` does).
- Param hints: a map in the editor, keyed by `"<sourceType>.<param>"` (e.g.
  `valueNoise.cellsPerFeature`), its text from the N1 mock. `ParamControl` today builds
  `Accepts <range>.`; join the two ("About how many cells across … Accepts 1–64."). Keep the
  map in a `.ts` (e.g. `controls/param-hints.ts`) with a test that every key names a real
  registered param, so a renamed param fails loudly.

### Step 3 · The Pattern well (`lib/operations/OperationBody.svelte`)

- **`field` is split.** Today it is `null` unless the Target is a tile target, because only the
  palette read it. The well's preview is shown on the Pattern step, **before** the Attribute
  is chosen, so derive the field cells whenever a Selection and a Pattern exist; `measured`
  (coverage) keeps its tile-target condition. Same grid (active breakpoint at
  `preview.width`), seed and `preview.loadSalt`.
- A new `controls/FieldPreview.svelte`: a `<canvas>` (one pixel per cell, scaled with
  `image-rendering: pixelated`, keeping the grid's ratio, `aria-hidden`), then the 6px 0–1
  scale. Drawn at the top of the Pattern well for Random, Noise, Gradient; not for Constant.
  The well currently renders only when the source has fields or is stochastic (line ~419):
  Random has no fields but is stochastic, so it shows; check Gradient/Random still reach it.
- The `options` snippet (line ~498) gets an optional action slot at the right of the
  options bar for Noise's tertiary "ⓘ How noise works" button.
- New `lib/ui/Explainer.svelte`: the non-modal popover. Take its placement and close logic
  from `controls/TilePicker.svelte` (fixed against the anchor, Esc / click outside / ✕,
  focus back to the trigger). If that logic is inline there, move it to a small tested
  `.ts` both use, rather than copying it. Content for Noise: the mock's text and the
  measured bars (23/52/26, 15/68/17, 12/75/14), as data in a `.ts`, not hard-coded markup.
- Each new `.svelte`/`.ts` gets its docs page (docs coverage checks this).

### Step 4 · Live draft (`App.svelte`)

- `const drawn = $derived(drafting.draft === null ? null : draftFile(file, drafting.draft))`;
  `<Tileset file={drawn ?? file}>`. **`shapedAt` must use the same file** (`drawn ?? file`),
  so the frame height and overlays agree with the picture. The editing controls keep reading
  `session.file`.
- Rewrite the **S2** header comment at the point of use: what changed, why (Pol, N0), what
  still holds (one component, same code, the picture Save produces), what was rejected (a
  second renderer), and that **E3** is untouched.
- Draft cue: the 1px accent frame inside the picture area (`.canvas`), and the "Draft · not
  saved" tag at the top of `NoticeStack` (a prop, or a sibling in the same stack container,
  so it sits above notices and shares their placement and reflow). Both only while
  `drawn !== null`. Not dismissible.
- Check the asset error path: a draft palette's picture that fails to load reports through
  `onAssetError` like any other; make sure discarding the draft clears that notice.

### Step 5 · Palette caption (`controls/PaletteList.svelte`)

Line ~253: the Noise caption becomes "Order matters: neighbours in this list meet on the
canvas. Middle entries cover more because noise rarely reaches its ends. Give the first and
last entries more weight to even it out."

### Step 6 · Checks

- `pnpm test`, `pnpm typecheck` (root), docs coverage and docs build.
- Browser (dev server on 5175; Playwright headless shell as in `t4/probe.mjs`, session
  `06ac963b`): the field preview changes with Cells per feature and Octaves; Constant shows
  none; the popover opens by keyboard, Esc returns focus; the live picture **equals the
  picture after Save**, cell for cell (compare the rendered box before and after Save); the
  cue shows only when the draft is complete, and goes on Save and on Discard; an edit-draft
  of an existing operation replaces it (no doubled operation); **cost**: time a weight drag
  and a Cells per feature change on a 61×120 grid. If a redraw per input tick is too slow,
  throttle `drawn` to animation frames and note it.
- No sideways scroll at 1728/1024/600/320.

Then stop for Pol's review; N4 is the sweep.

### N3 · Done (2026-11-06, uncommitted)

**Step 0 (Pol): plain sentence case, no exceptions.** `everyNth` → "Every nth", `scaleX` →
"Scale x", `cellsPerFeature` → "Cells per feature". `NAMED` still wins (Handpick, Checkered,
Tile, Noise). Keeping one-letter words or "Nth" uppercase was offered and turned down.

What was built, by step:

1. `labelFor` is sentence case; tests, comments and docs pages updated (also the docs story's
   "Every nth"). The `scaleX` / `scaleY` targets now read "Scale x" / "Scale y" everywhere.
2. `fieldCells` (`fieldOf` is its `t`s), `field-preview.ts` (`fieldPixels`, RGBA bytes),
   `draftFile` + a shared private `withOperation` in `draft.svelte.ts`, `param-hints.ts`
   (`SOURCE_PARAM_HINTS`, Noise's two params, test against the registry). `ParamFields` takes
   `hints`; `ParamControl` takes `about` and says it before "Accepts …".
3. `FieldPreview.svelte` at the top of the Pattern well for every Pattern but Constant; the
   well now also shows for a Pattern with only a preview. `field` in `OperationBody` is
   `{ rows, columns, cells }`, computed on the Pattern step (before an Attribute) and on the
   Attribute step under Tile. `lib/ui/popover.ts` (`placeAt`, `pressedOutside`) is shared by
   `TilePicker` and the new `lib/ui/Explainer.svelte`; content is data (`ui/explainer.ts`
   types, `operations/noise-explainer.ts`). `Button` gained `expanded` and a bindable
   `element`. The `options` snippet takes an optional action at the bar's right.
4. App draws `shown = drawn ?? file`, `drawn = draftFile(file, $state.snapshot(draft))`. The S2
   header comment is rewritten. Cue: `.canvas.drafting::after` (1px accent inset) and
   `NoticeStack`'s `draft` prop (the tag; not a live region). A failure reported while a draft
   was drawn goes once no palette in `shown` names its tile (`paintedTiles`), so Discard takes
   it away; saved-file failures behave as before.
5. The Noise caption is the N1 text.
6. Tokens: `--explainer-w` 340px, `--field-scale-h` 6px, `--field-preview-max-h` 240px.

**Pol's review of N3 (round 1):** the draft frame is **2px** (`--rule-strong`), not 1px; the
**accent is pink #E94B82** (`--pink`, replacing `--ultramarine` #3340ff everywhere: focus,
the open operation, the active step, the selection overlay, the draft cue). And "I don't see
the bottom of the preview container": the **page itself scrolled**. OperationCard's visually
hidden spans were absolutely positioned against ScrollArea's `.area`, outside the scroller,
and added ~1,200px below the window. A wheel over the preview scrolled the page and moved the
top bar and the frame's bottom out of view. This predates N3. Fixed in `ScrollArea`
(`.viewport { position: relative }`).

**Round 2:** the **pink is darkened to #CD1957**, the same hue and saturation as #E94B82. It
is the lightest shade that passes 4.5:1 for text on white, the ground, a well and its own wash.
**The selection overlay has its own colour**: neutral and two-tone (`--color-selection` ink,
`--color-selection-halo` paper). That is a 75% ink edge with a 75% paper line inside it and a
10% ink wash, so one of the two lines stands out on any tile and no hue is added. The
`PaintLayer` brush cursor got the same paper line inside its dashes.

**Round 3:** Pol rejected the two-tone edge as too thick and wanted the colour closer to the
accent. The overlay is now `--berry` #8E294C, the accent's hue darker and muted (8.2:1 on
white): a 1px line at 60% and a 12% wash. `--color-selection-halo` and the brush's paper line
are gone.

**Decisions made in N3 (for Pol to check):**

- **A tall grid's field preview is capped at 240px high** and drawn narrower, centred. At full
  well width a 61×120 grid was ~590px tall and pushed the fields off screen.
  `DESIGN_SYSTEM.md` says so.
- **`shapedAt` keeps reading the saved file**, not the drawn one (the plan said the drawn one).
  `draftFile` changes only `config.operations`, so the shape is the same, and
  `draft.test.ts` now holds it to that. Reshaping the drawn file, which is a new object on
  every change, made both overlays rebuild on every tick: most of a weight drag's cost.
- **The drawn file is built from `$state.snapshot(draft)`.** Without it, the engine read the
  palette proxy once per cell.
- The popover takes focus itself (not the ✕), and focus leaving it closes it (no trap), like
  the tile picker. Its bars carry a hidden text line each ("Octaves 2: 15%, 68%, 17%").

**Checks.** Tests 655 + 420, typecheck, docs coverage (129/129), docs build: all green.
Browser probe: 46/46 (`n3/probe.mjs` in session `e5333bf0`'s scratchpad, with `readme.zip`).
It covers:
- the field preview follows Cells per feature and Octaves; Constant has none
- sentence-case labels, and a hint that says what the param does, then its range
- the popover: opens by keyboard, Esc / ✕ / a press outside close it, focus returns, inside
  the window at 320
- the live picture equals the picture after Save; Add equals too
- the cue: only for a complete draft, gone on Save and on Discard; Discard brings back the
  saved picture
- an edit-draft's Save keeps the operation count
- no sideways scroll at 1728, 1024, 600 and 320

**Cost on 61×120** (`n3/timing.mjs`: in-page, median of 15, one change and two frames):

| Build | Re-seed (baseline) | Weight drag | Cells per feature |
|---|---|---|---|
| Production | 67 ms | 59 ms | 67 ms |
| Dev | 80 ms | 67 ms | 168 ms |

No throttle was needed. The dev-only extra on Cells per feature is Svelte's dev tracking. It
comes from the Selection overlay re-rendering every cell when the draft's Pattern changes,
because App's overlay shadow carries the Pattern. That predates N3. N4 could give the overlay
a shadow without the Pattern if Pol wants it faster in dev.

### N4 · Sweep (2026-11-06)

There are no code changes. The probe is `n4/probe.mjs` in session `e5333bf0`'s scratchpad, built
on T4's helpers, and it passes 40/40. With N3's 46/46 probe it covers every N4 item in the plan:

- **Targets, text size and capitals**: no control under 24×24, no text under 12px and no
  capitals, in the Noise well, the popover and the draft tag.
- **Contrast** (≥ 4.5:1 with the new accent): the options caption, "How noise works", the field
  labels, the 0 / 1 scale, the active step's name on its wash, the white number on the accent,
  the popover's heading, body and muted text, the draft tag, and the Noise caption.
- **Keyboard**: Tab goes from the Pattern glyphs to "How noise works", then to Cells per
  feature, Octaves, Reseed on load and the next steps. In the popover, Tab reaches ✕ and Tab
  out closes it. Changing step closes it too.
- **Assistive tech**: the popover is named by its heading, each bar row has a hidden text
  line, and the draft tag is not a live region.
- **The cue**: a 2px frame and a 28px tag.
- **The overlay**: a 1px berry line at 60%, no halo.
- **Focus ring**: #cd1957.
- **Reflow**: no sideways scroll at 1728, 1024, 600 and 320, and the page itself does not
  scroll at 1024 and above.
- **From N3's probe**: the live picture equals the picture after Save, the cue goes on Save and
  on Discard, and the production cost on 61×120 is the same as a re-seed.

Open, for later: in dev only, a Cells per feature change on 61×120 costs ~145–170 ms, because
App's overlay shadow carries the Pattern (see "N3 · Done"). Production is fine.

## Next session plan: Export menu (item 1) (written 2026-11-06)

**Read first:**
- `DESIGN_SYSTEM.md`: Layout (the sidebar top bar), the **Menu** and **Button** rows, Popup,
  Notice.
- `src/lib/sections/SidebarTopBar.svelte`: Export is the area's one primary button. Today it
  runs `exportZip` directly.
- `src/export.ts`: **E14**, so the file and its asset folder go out together, and it explains
  why they are one action, not two.
- `src/download.ts`: `zipOf`, `exportZip`.
- `lib/ui/Menu.svelte`: the WAI-ARIA menu button that the operation and palette ⋯ menus use.

### What exists

- **One action, Export.** It writes `tileset.zip`: `tileset.json`, plus
  `tiles/<tileId>/<assetId>.<ext>` for every asset. `engineVersion` is stamped at export.
- A failure opens a Popup ("Export failed"). An empty export pushes advisory 5
  (`exportedEmpty`), which never blocks.
- **No image export.** The backlog says so ("image export does not exist yet").

What the package offers for an image:
- The preview draws one `<canvas class="presented">` (the default `"canvas"` substrate), at
  the preview width × `devicePixelRatio`.
- Its pictures are same-origin `blob:` URLs from the editor's store, so the canvas is not
  tainted and `canvas.toBlob("image/png")` should work. **Check this in X3 before relying on
  it.**
- The preview's background colour is CSS on `.canvas`, not in the tileset canvas. So a capture
  has a transparent background unless it is filled.
- The package has no "render at width W to an image" function. A size other than the one on
  screen means an offscreen `TilesetRenderer` (`render/renderer.ts`) in a hidden box, waiting
  for its pictures to load. That costs more.

### Recommendation (to confirm at X0)

- **Export becomes a split control:** the primary "Export" still does the zip in one click
  (the common case, and E14's pairing), with a chevron that opens a Menu of:
  - **Tileset (.zip)**, which is what Export does;
  - **Image (.png)**, the picture as the preview shows it now: the active width, the file's
    seed and the current load preview.
- **The image is a capture of the preview's own canvas,** so it is exactly the picture the
  author sees (the S2 spirit; no second renderer). Pixels are the canvas's (width × dpr).
- The preview's background is optional, filled from `preview.background` by default.
- File name: `tileset-<width>px.png`.

### Blocks

- **X0 · Questions (talk, no code).** For Pol:
  1. **Menu shape:** a split button (Export = zip, chevron = menu), or Export always opens the
     menu (two clicks for the zip)?
  2. **What the menu holds:** the zip and a PNG? Also SVG? Also a "copy embed snippet"
     (the `<Tileset>` / vanilla call with the package version)? JSON alone stays out, because
     it breaks E14.
  3. **Image size:** the preview as shown (width × dpr)? Or also chosen sizes (each breakpoint
     width, 1×/2×)? The second needs the offscreen renderer.
  4. **Background:** the preview's colour, or transparent, or a choice?
  5. **An open draft:** while the preview draws an unsaved draft, export the picture on screen
     (draft included) or the saved one? The zip always exports the saved file. Recommendation:
     the image follows the zip and uses the saved file; while a draft is drawn, the menu item
     says so ("Image of the saved tileset"), or asks.
  6. **Seed:** the file's seed is the default. "Preview a fresh load" changes `loadSalt`.
     Should an image after a fresh-load preview capture that load (what is on screen)?
- **X1 · Mocks.** A scratch page (not in the repo) showing the top bar with the split button
  and the open menu, at 400px and at the narrowest sidebar, plus any image options. Pol picks.
- **X2 · Docs.** `DESIGN_SYSTEM.md`: a **Split button** pattern (or the Menu row), the Export
  menu, and image export's rules, before any code.
- **X3 · Implement.** *(Amended by the X0 answers below.)*
  - First, a short analysis for Pol of the package addition (see "X0 answers").
  - The split control in `lib/ui/` (its logic in a tested `.ts` if it has any).
  - `SidebarTopBar` wiring, and the Export image Dialog.
  - An `image-export.ts` (pure, tested): the size list from `boundsOf`, the file name
    `tileset-<W>px@<d>x.png`, the options to pixels. ~~The capture goes through the preview's
    canvas~~: withdrawn. Every size is an offscreen render of the saved file.
  - Failure goes to the existing Popup.
  - A docs page for each new file.
- **X4 · Sweep.**
  - Probe the menu: keyboard (WAI-ARIA menu button), 24px targets, contrast, reflow at
    1728/1024/600/320.
  - The PNG's size and pixels against the on-screen canvas.
  - The zip unchanged: compare with `w5/probe.mjs` (session `e17b73a2`), and keep the
    `tiles/*/*` check.
  - Then close the group with Pol.

**How to test:**
- The dev server runs on 5175.
- The probes start from `n4/probe.mjs` (session `e5333bf0`'s scratchpad). It has the
  Playwright headless shell path, the audit and contrast helpers, and `readme.zip`.
- A download in Playwright: `page.waitForEvent("download")`.

### X0 answers (Pol, 2026-11-06)

1. **A split button.** "Export" still downloads the zip in one click. A chevron opens a Menu with
   **Tileset (.zip)** and **Image (.png)…**.
2. **Contents:** the zip and a PNG only. No SVG and no embed snippet. JSON on its own stays out
   (**E14**).
3. **Size is chosen explicitly at each export:** "Current preview · W px", plus one entry per
   breakpoint bound (`boundsOf(rules)`, labelled like the top bar, with its holding rule). There
   are no presets. With no breakpoints, only "Current preview" is listed.
4. **Background:** a choice between the preview colour (`preview.background`) and transparent.
5. The choices live in a **Dialog** ("Export image"): size, background, and **density 1× / 2×**
   (2× by default, so the output does not depend on the machine's DPR), then Cancel / Download.
6. **Draft:** the image uses the **saved** file, like the zip. While a draft is drawn, the
   dialog says "Draft not included: this is the saved tileset".
7. **Load:** the image uses the **current `loadSalt`** (the load on screen) and the file's
   `defaultSeed`.

**A finding that changes X3.** Sizes other than the one on screen, a fixed density and "the saved
file, not the draft" rule out capturing the preview canvas. Every export is one **offscreen
render**, and today the package cannot do one:
- `TilesetRenderer` reads the DPR from `window` (`measure.ts` `currentDpr`, `observeDpr`). It
  has no DPR option.
- It has no public signal that says "pictures settled, canvas painted". The drawable bank
  settles in private (`#settle`, `#settled`, `pending`).
- Rendering at 2·W with a DPR of 1 instead is wrong, because it crosses breakpoints, so the rows
  and columns change.

So X3 needs a **package addition**: either a `dpr` override plus a `settled()` promise on
`TilesetRenderer`, or one exported `renderImage(file, { width, density, seed, loadSalt,
provider }) → Promise<HTMLCanvasElement>`, which mounts a hidden host that is laid out. The
image is the box (W × natural height), clipped like `overflow: hidden`, so the bleed is cut. It
is a public API addition at 0.x, so it needs a version bump and a CHANGELOG line. No generated
output changes. Recommendation: `renderImage`. Rendering at a width to an image is useful to any
consumer, and it keeps a DPR override out of the live renderer's options. X3 opens with this
analysis for Pol.

### X1 picks (Pol, 2026-11-07)

The mock is in session `312c3a1c`'s scratchpad, `x1/mock.html`, not in the repo.

1. **Split button A:** one ink control. A white hairline at 32% splits off a 28px chevron segment
   (`box-shadow: inset 1px 0 0 rgb(255 255 255 / .32)`), with outer corners only. The chevron is
   its own `<button>` with `aria-haspopup="menu"` and the name "More export options". The menu
   holds Tileset (.zip) and Image (.png)…. The muted "Export" aside on the zip item was optional
   in the mock, and Pol did not ask for it, so leave it out.
2. **Size control 1, the radio list, amended:** each breakpoint row's label **includes its rule
   number**, and the muted "rule 2 + 3" label at the right goes (and with it the "base" on
   Current preview). A row is then `● Breakpoint 2 · 768 px`; Current preview is
   `● Current preview · 1180 px`. The number is the sidebar's "Rule N" (`BreakpointsSection`:
   `Rule {i + 1}`), so the author can find it. Settle two edge cases in X2:
   - A rule with both `minWidth` and `maxWidth` names two bounds. Both rows carry its number,
     and the px tells them apart.
   - A bound that two rules name gets both numbers: "Breakpoint 2 + 3".
3. **The top bar is swapped:** New, Import and Export go to the **left**, and Undo goes to the
   **right**. The menu then opens under a split button near the bar's left edge, so it
   left-aligns with the button instead of right-aligning like the ⋯ menus. The `Menu` row in
   `DESIGN_SYSTEM.md` and its `--right` positioning need a left option.
4. **Kept from the mock with no objection:**
   - The dialog uses the Popup panel with actions and `role="dialog"`, titled "Export image".
     It is not the `Dialog` component, which is an alertdialog whose title is a question.
   - Background and density are two Toggles side by side.
   - The muted info line "Draft not included: this is the saved tileset" shows only while a draft is drawn.
   - A "File" line gives the name and pixel size: `tileset-<W>px@<d>x.png · W×d × H×d px`.
   - The buttons are Cancel / Download PNG.
   - With no breakpoints, the one "Current preview" row is still shown.
   - It opens on the size used last in the session, else Current preview.
   - New icons `archive` and `image` (Lucide).
   - Mock bug to fix in the real thing: the white swatch inside the chosen (ink) "Preview"
     segment rendered dark.

## Next session plan: X2 · Docs, then the X3 package analysis (written 2026-11-07)

Two short blocks, stopping for Pol after each. **No editor code before X2 is reviewed.**

**Read first:** "X0 answers" and "X1 picks" above; `DESIGN_SYSTEM.md` Layout (top bar), the
Button, Menu, Popup, Dialog, Segmented control and Inline advisory rows, Icons;
`lib/sections/SidebarTopBar.svelte`; `lib/ui/Menu.svelte` (how `--top`/`--right` are set);
`lib/preview/width.ts` (`boundsOf`, `holdingLabel`).

### X2 · Docs (`DESIGN_SYSTEM.md` only, then commit and stop)

1. **Layout → Top row:** the sidebar bar is now New, Import and Export (primary, split) on the
   left, and Undo on the right. Say why in a line (Pol, X1: the document's actions come first).
2. **A new Split button row:** anatomy as in "X1 picks" 1. Keyboard: Enter/Space on the main
   part runs the default action; on the chevron it opens the menu on its first item; arrows
   move; Esc closes and focus returns to the chevron. Targets: 28×30 chevron (2.5.8). It is used
   by Export.
3. **Menu row:** add the split button's menu: it is anchored to the chevron's control and
   **left-aligned** when the control sits at the bar's left. The items are an icon plus a label,
   and "…" marks one that opens a dialog.
4. **A new Export image dialog row** (or a "Form popup" row, if it is worth a general pattern:
   Popup + `role="dialog"`, a noun title, fieldsets with `.t-label` legends, Cancel + a verb
   primary): the size radio list (a new **Radio list** anatomy: a field-grey well, 30px rows, a
   12px ring dot, the chosen row ink with white text, label + mono px, arrow keys move within
   the radiogroup), the two Toggles, the draft line (Inline advisory), the File line (`.t-label`
   + mono), the default size, and no breakpoints.
5. **Image export rules** (Interaction conventions, or a short "Export" subsection):
   - The saved file, never the draft.
   - The file's `defaultSeed` and the current `loadSalt`.
   - The width is the chosen bound, or the current preview width. The density is 1× or 2×.
   - The image is the box (W × natural height), with the bleed clipped.
   - The background is the preview colour or transparent.
   - The file name is `tileset-<W>px@<d>x.png`.
   - A failure opens the existing "Export failed" Popup.
   - The zip is unchanged (**E14**).
6. **Icons:** add `archive` and `image` to the set list.
7. **Accessibility table:** the radio list's ring and chosen row; the split parts have separate
   accessible names.
8. **Leave the code alone:** `SidebarTopBar`'s header comment ("Left, the edit history: Undo")
   becomes stale with the swap. Change it in X3, together with the markup.

### X2 · Done (2026-11-07), waiting for Pol's review

Written in `DESIGN_SYSTEM.md` only; no code changed:
- **Layout → Top row:** New, Import, Export (split) on the left; Undo on the right.
- New rows: **Split button**, **Form popup** (Popup + `role="dialog"`, noun title; a general
  pattern, set against Dialog's question-and-alertdialog), **Radio list**, **Export image**.
- **Menu** row: "…" opens a dialog, and the alignment rule (⋯ menus right-align; the split
  button's menu left-aligns under the whole control).
- A new **Export** subsection under Interaction conventions with the image rules (saved file,
  `defaultSeed` + current `loadSalt`, W × natural height clipped, density not DPR, name, failure
  Popup, offscreen render and why).
- Icons: `archive`, `image`; the chevron reuses `down` (no new icon).
- Accessibility: rows for the split button and the radio list. "Selected" lists the radio row.
- Left for X3: the `SidebarTopBar` header comment and the Naming list (`SplitButton`,
  `RadioList` get named when they exist, with their docs pages).

### X3a · The package analysis (talk, no code; after X2 is reviewed)

Read `packages/tileset/src/render/renderer.ts` (constructor, `#settle`, `pending`, the paint
path), `render/measure.ts` (`currentDpr`, `observeDpr`, `track`), `render/model.ts` (`dpr` input)
and `packages/tileset/RELEASING.md`. Bring Pol:
- **Shape A:** `TilesetRendererInit.dpr?` plus `renderer.settled(): Promise<void>`. **Shape B:**
  `renderImage(file, { width, density, seed, loadSalt, provider }) → Promise<HTMLCanvasElement>`
  built on A internally, but with only B exported. Recommendation: B.
- How B gets a laid-out box: a hidden host in `document.body`
  (`position: fixed; left: -99999px; width: Wpx`). Measurement needs layout, so it can't be
  detached. Then destroy it.
- What "settled" means: every drawable the grid needs is loaded or failed, and the canvas is
  painted. A failure rejects, or resolves with the failures listed, and B's caller decides. (Pol
  picks. "Failure is loud" suggests reject.)
- Composing the PNG: a W·d × H·d canvas, fill or not, then draw the presented canvas at
  `leftCss·d`, clipped to the box.
- Release: bump `packages/tileset/package.json` (0.x minor), add a CHANGELOG line, and add a
  docs page. No output change for existing calls (`generate()` is untouched), so no
  regression-table work.
- Tests: what `renderer.test.ts` can cover (settled timing with a fake provider, `dpr` override →
  `uniformGeometry`), and what only the editor probe can (real PNG pixels).

### X3a · Analysis and Pol's answers (2026-11-07)

**Finding: no hidden host is needed.** `TilesetModel` reads only four inputs from the page
(`ModelInputs` in `render/model.ts`): `width`, `height` (only for a non-top `alignY`), `rects`
(only with `avoid`) and `dpr`. For an image all four are known: W, the natural height, `null`,
and the chosen density. So the image is rendered by **driving the model directly**, with no
element in `document.body`, no `ResizeObserver` and no wait for layout. Shape A (a `dpr`
override and `settled()` on the live `TilesetRenderer`) is not needed.

Pol's answers:
1. **Shape: `renderImage`, from the model.** It is one new export from `./render`.
   `TilesetRenderer`'s public API is unchanged. The tile loop in `TilesetRenderer.#paint` (the
   mask, the `ready` lookup, `coverRect`, alpha and the matrix) moves into one shared function
   used by both, so the image and the live canvas draw with the same code (the S2 spirit).
2. **An asset failure rejects**, naming every asset that failed (`tileId/assetId`), and no PNG
   is written. The editor shows that message in its existing "Export failed" Popup.
3. **Cross-origin: `renderImage` loads with `crossOrigin = "anonymous"`.** A server without CORS
   headers makes that picture fail, and the failure names it (2), instead of `toBlob` throwing a
   `SecurityError` that names nothing. The live renderer stays as it is: `ImageBank` gets an
   option for this, and it defaults to off. The editor's `blob:` URLs are unaffected.
4. **It returns a PNG `Blob`, the simpler way** (Pol: "the option that gives a png the simpler
   way"), with a `background?` option (a CSS colour; transparent when it is left out).

So: `renderImage(file, { width, density, background?, seed?, loadSalt?, provider?, sizing?,
align?, responsive? }) → Promise<Blob>`. The output is `round(W·d) × round(H·d)` px, where H is
the box's natural height at W (`aspect-ratio`, or `fixedHeight` under `"fixed"`). The presented
canvas is drawn at `leftCss·d` and `topCss·d` and clipped to the box. `substrate`, `avoid`,
`overflow` and `onAssetError` are not accepted: an image is always the canvas, clipped, with
no page around it.

## Next session plan: X3b · Implement (written 2026-11-07)

Three blocks. **Stop for Pol after each.** Commit each block once Pol has reviewed it.

**Pol's change (2026-11-07, at the start of X3b):** "Current preview" becomes **"Design
width"**. The first size row exports at the saved file's design width (`layout.referenceWidth`,
the Grid & size field), **not** at the preview's current width, so dragging the handles never
changes the image. The row reads `Design width · 1000 px`; it is the only row with no
breakpoints and the fallback when the size used last is gone. A bound equal to the design width
keeps its own breakpoint row (the rule number is what the author looks for). The X0 and X1 notes
above are left as they were decided; the steps below are updated.

**Read first:**
- "X2 · Done" and "X3a · Analysis and Pol's answers" above.
- `DESIGN_SYSTEM.md`: the Split button, Menu, Form popup, Radio list and Export image rows, and
  the "Export" subsection.
- `packages/tileset/src/render/renderer.ts` (`#paint`, `#settle`), `model.ts` (`ModelInputs`,
  `presentation`, `fixedHeight`, `ratio`, `drawables`), `images.ts` (`ImageBank`),
  `uniform.ts` (`CanvasPresentation`), and `render/index.ts`.
- `apps/editor/src/App.svelte`, around line 433. The preview passes only
  `{ loadSalt, provider: editorProvider, onAssetError }`, so the image passes the same
  `loadSalt` and `provider`, and no seed (the file's `defaultSeed` holds).

### X3b-1 · The package: `renderImage` (then stop)

1. **`render/paint.ts`, `drawItems(ctx, items, ready, mask)`:** the per-item loop moved out of
   `#paint`. It covers the mask skip, R3's missing drawable, `coverRect`, alpha, the matrix, and
   the DEV `assetTooSmall` warning, passed in as a callback so `paint.ts` holds no `WarnOnce`.
   `#paint` calls it. **No behaviour change:** `renderer.test.ts` must pass untouched.
2. **`ImageBank`:** a constructor option `{ crossOrigin?: "anonymous" }`, off by default. Change
   its comment ("Nothing here ever reads the canvas back") to say the image path is the one that
   does, and why it opts in.
3. **`render/image.ts`:**
   - `imageSize(model or geometry, W, d)` is pure and tested. It returns the box's height at W
     (fluid: `W / ratio`; fixed: `fixedHeight`), the output pixels `round(W·d) × round(H·d)`,
     and where the presented canvas goes (`leftCss·d`, `topCss·d`, `widthCss·d`).
   - `renderImage(file, opts): Promise<Blob>`, where `opts` is `{ width, density, background?,
     seed?, loadSalt?, provider?, sizing?, align?, responsive? }`. The steps:
     1. Build a `TilesetModel` with `{ width: W, height: H, rects: null, dpr: d }`.
     2. Await every drawable. A rejection is a failure.
     3. Sync a private `ImageBank({ crossOrigin: "anonymous" })` and wait until every key has
        called back, ready or failed. Do this as a promise over `onChange`/`onError` counts, or
        add a `whenSettled()` to the bank, whichever tests cleaner.
     4. If anything failed, reject with one `Error` that lists `tileId/assetId` for each.
     5. Otherwise paint a raster canvas (`rasterWidthDev × rasterHeightDev`) with `drawItems`.
     6. Compose into a `round(W·d) × round(H·d)` canvas: fill `background` if one is given, then
        `drawImage(raster, leftCss·d, topCss·d, widthCss·d, …)`. Pixels outside the canvas
        are simply not drawn, which is the clip.
     7. Return `toBlob("image/png")`; a `null` blob rejects.
   - The model needs an id. It's never written to the DOM here, so a fixed `"gts-image"` is fine;
     say why at the point of use.
   - Tests (Node, so no real canvas): `imageSize` for fluid and fixed sizing, with bleed (a
     negative `leftCss`), and with a rule active at W; the settle wait with a fake provider (a
     promise that resolves, one that rejects, one that is late); and the failure message listing
     every asset.
4. Export `renderImage` (and `imageSize` only if the editor needs it) from `render/index.ts`.
5. Bump to **0.11.0**, add a CHANGELOG entry, and add docs pages `renderer/image.md` and
   `renderer/paint.md` in `apps/docs/src/content/docs/renderer/` (the coverage check needs them).
   **Don't tag.**
6. `pnpm test` and `pnpm typecheck` from the root, then stop for Pol.

### X3b-1 · Done (2026-11-07), uncommitted, waiting for Pol's review

- **`render/paint.ts` `drawItems`:** the tile loop moved out of `TilesetRenderer.#paint`; the
  DEV `assetTooSmall` warning is an `onDraw` callback. `renderer.test.ts` passes untouched.
- **`ImageBank(checks?, { crossOrigin? })`:** off by default; the comment now says only the
  image path reads back, and why it opts in.
- **`render/image.ts`:** `renderImage(file, ImageOptions) → Promise<Blob>` and
  `imageSize(file, ImageOptions) → { width, height }`, both from one model, exported from
  `render/index.ts`. Helpers `settleDrawables` and `loadAll` (a promise over `sync`'s callbacks;
  no new bank method) are exported from the module for tests only.
- **Two choices that differ from the plan's wording, for Pol:**
  - The height is the **presented canvas's** height (`height: auto` from the raster's ratio),
    not `W / ratio` or `fixedHeight`. It is what the live box takes once measured, and it
    includes `yOffset`'s rounding to a device px, so no hairline under the last row or shaved
    sliver. It differs from `W / ratio` by under a device px (test: 26 vs 25.9).
  - A non-top `alignY` is pushed back to the grid's own height, so the grid sits at the top: an
    image's box is exactly as tall as its grid.
  - Wholly hidden bleed columns are culled from the raster, as on the live canvas.
- **0.11.0**, CHANGELOG entry, docs pages `renderer/paint.md` and `renderer/image.md`;
  `images.md`, `render-index.md` and `renderer.md` updated. Not tagged.
- `pnpm test` 671 + 420, `pnpm typecheck` green, docs coverage 131/131. `image.test.ts`: 16
  tests (sizes fluid/fixed/rule/yOffset/invalid, compose, half-column bleed, bottom align,
  background, CORS, the failure message, encode failure, settle and load waits).

### X3b-2 · Editor primitives (then stop)

**Next session starts here** (X3b-1 committed 9b2d73a). Plan written 2026-11-07, after reading
`ui/Menu.svelte`, `ui/Button.svelte`, `ui/icons.ts`, `preview/width.ts` and `SidebarTopBar.svelte`.

**Read first:** "X3b-1 · Done" above; DESIGN_SYSTEM.md rows Split button (121), Menu (123),
Radio list (137), Export image (138), Icons (147), Accessibility (211–212);
`packages/tileset/src/render/image.ts` (`imageSize`, `ImageOptions`).

**Step 0 · One question for Pol before code.** DESIGN_SYSTEM.md says "A Split button's chevron
reuses `down`", but `down` in `icons.ts` is an **arrow** (`M12 5v14m7-7-7 7-7-7`, Move later).
The chevron is `fold` (`m6 9 6 6 6-6`, the Collapsible disclosure). Recommendation: use `fold`
and correct the doc line. An arrow reads as "download", which the main part already does.

1. **`Menu` gets a trigger option and an alignment, with the ⋯ menus unchanged.** Today `Menu`
   renders its own `IconButton icon="more"` and positions with `--top`/`--right` from that
   button's rect. Its users are `lib/operations/OperationCard.svelte:119` and
   `controls/PaletteList.svelte`, and both must look and behave exactly as before.
   - Add `align?: "left" | "right"` (default `"right"`) and `anchor?: HTMLElement` (the element
     whose rect places the list; default the trigger). Under `"left"`, set `--left: r.left`
     and use `left: var(--left)` instead of `right`.
   - Add a `trigger?: Snippet<[{ open: boolean; toggle: () => void; bind: (el) => void }]>`, or
     simpler: export `show`/`close` and accept `trigger` as an element bound by the parent.
     Pick whichever keeps the open, close and refocus logic in one place. Esc and focus return
     must go to the **chevron** (the trigger), while the position follows the **anchor** (the
     whole split control).
   - Move the placement maths (`up` when there's no room below, top/left/right) into a tiny
     `ui/menu.ts` with a test, per CLAUDE.md (logic in `.ts`).
2. **`ui/SplitButton.svelte`:** props `label`, `icon`, `onclick`, `menuLabel` ("More export
   options"), `items: MenuItem[]`, `disabled?`, `busy?` (for "Exporting…"). Markup: a wrapper
   `div.split` (the anchor) holding the main `Button variant="primary"` with its right corners
   squared, and the 28×30 chevron `<button>` (`aria-haspopup="menu"`, `aria-expanded`, the
   `fold` icon, white hairline `box-shadow: inset 1px 0 0 rgb(255 255 255 / .32)`, left
   corners squared). Hover and focus states as on primary Button. Check that the main part keeps
   `Button`'s styling with a `class`/`squared` prop rather than copying its CSS.
3. **`ui/RadioList.svelte`:** `fieldset` + `legend` (`.t-label`), native `<input type="radio">`
   visually replaced by a 12px ring (`appearance: none`), each row a `<label>` 30px tall: dot,
   label, mono value at the right. Props `legend`, `name`, `options: { value, label, detail }[]`,
   `bind:value`. The chosen row is ink with white text and a filled white dot. Hover darkens one
   step. Native radios give Tab-in-on-chosen and arrow keys for free, so no key handling is
   needed. Focus ring: `:focus-visible` on the input draws on the row (`:has(:focus-visible)`).
4. **Icons:** `archive` (Lucide archive) and `image` (Lucide image) in `icons.ts`, as 24-box
   paths like the others. `icons.test.ts` must stay green (it checks every path parses, so run
   it).
5. **`src/image-export.ts`, pure and tested (`image-export.test.ts`):**
   - `sizeRows(rules, designWidth): { value, label, detail }[]`. The first row is
     `{ value: designWidth, label: "Design width", detail: "1000 px" }`. Then one row per
     `boundsOf(rules)` bound, ascending. Its label is "Breakpoint " + the 1-based numbers of every
     rule whose `minWidth` or `maxWidth` equals it, joined " + ". The numbers match
     BreakpointsSection's `Rule {i + 1}`.
     - Rows are **not** de-duplicated against the design width (Pol, X3b), so `value` alone is
       not unique. Give each row a `key` (`"design"`, `"bound:768"`) and have the RadioList bind
       the key.
   - Tests: no rules → one row; a min+max rule gives two rows with the same number; a shared
     bound → "Breakpoint 2 + 3"; a bound equal to the design width gives two rows; ascending order.
   - `fileName(W, d)` → `tileset-${W}px@${d}x.png`. Is W ever fractional? A bound and
     `referenceWidth` are integers by validation, but check `fields.ts` `parseReferenceWidth`.
     Round only if they aren't.
   - `pixelSize(file, W, d)` is a thin wrapper over the package's `imageSize(file, { width: W,
     density: d })`. Don't restate the arithmetic. Test once against a fixture
     (600 px design, 4 rows of 60 → `{1200, 480}` at 2×), and memoise in the component, not here.
   - `rememberedSize(rows, lastKey)` → that key if it is still in `rows`, else `"design"`.
     The session memory itself (a module `let`) lives in X3b-3's component.
6. **Docs:** pages in `apps/docs/src/content/docs/editor/` for `split-button`, `radio-list`,
   `image-export` and `menu` if the page doesn't exist yet (`ls` first; the coverage script
   names any file that's missing). Add `SplitButton` and `RadioList` to DESIGN_SYSTEM.md's
   Naming list, and fix the chevron line after Step 0.
7. **Check without wiring:** `pnpm test`, `pnpm typecheck` (svelte-check `--fail-on-warnings`),
   and the docs coverage (`node apps/docs/scripts/coverage.ts`). Optionally, mount SplitButton
   in place of Export temporarily to eyeball it on 5175, but revert: the swap is X3b-3. Then
   update "X3b-2 · Done" and the memory file, and **stop for Pol**.

### X3b-2 · Done (2026-11-07), uncommitted, waiting for Pol's review

- **Step 0 (Pol):** the chevron is `fold`, not `down`. DESIGN_SYSTEM.md's Split button and Icons
  lines are corrected.
- **`Menu`:** `align` (default right), `anchor` (default the trigger) and an optional `trigger`
  snippet (`MenuTrigger`: `{ open, toggle, attach }`, wired with `{@attach}`), so open, close and
  refocus stay in Menu. **Differs from the plan:** no `ui/menu.ts`. The placement and the
  outside-press test are `popover.ts`'s `placeAt` and `pressedOutside`, which already do exactly
  this and are tested; Menu now calls them (`ui-popover-ts.md` lists Menu as a caller).
- **`Button`:** a `squared?: "left" | "right"` prop, so SplitButton's main part is the real primary
  Button.
- **`SplitButton`:** `label, icon, onclick, menuLabel, items, disabled`. **No `busy` prop**: the
  zip export is async and the bar already shows "Exporting…" by swapping `label` and setting
  `disabled`, which SplitButton takes as is; `disabled` turns off both parts.
- **`RadioList`:** generic over the key, native radios, focus ring on the row. The input needed
  `color: inherit` (form controls don't inherit it), or the chosen dot drew black on ink.
- **Icons:** `archive`, `image`.
- **`src/image-export.ts`:** `sizeRows` (rows are `{ key, width, label, detail }`; `width`, not
  the plan's `value`), `rememberedSize`, `fileName` (a fractional `referenceWidth` is written as
  it is: `parseReferenceWidth` accepts any positive number), `pixelSize`. 10 tests.
- **Docs:** new `ui-split-button.mdx`, `ui-radio-list.mdx` (both with a story demo in
  `UiPrimitivesStory`), `image-export.md`; `ui-menu.mdx`, `ui-button.mdx`, `ui-icons.md` and
  `ui-popover-ts.md` updated; DESIGN_SYSTEM.md's Naming list and Menu row.
- **Checks:** tests 671 + 430, typecheck green, docs coverage 134/134. On 5175, SplitButton and a
  RadioList were mounted for a moment (then reverted; `SidebarTopBar.svelte` is unchanged):
  chevron 28×30, Enter opens on the first item, the menu's left edge equals the control's,
  arrows, Esc back to the chevron, outside click closes; radio arrows and click choose, rows 30px.
  The readme fixture's ⋯ menu still right-aligns and refocuses. Scripts: `x3b2/check.mjs` and
  `x3b2/more.mjs` in session `ddbd1c91`'s scratchpad (with `readme.zip`).

### X3b-3 · Wiring (then stop)

1. **`lib/sections/ExportImage.svelte`** (a Form popup built on `Popup` with `role="dialog"`):
   - Size (RadioList), Background (a `Toggle` with the swatch in the "Preview colour" segment,
     which keeps its real colour when chosen), and Density (a `Toggle`, 2× by default).
   - The draft Advisory while `drawn !== null`, the File line, and Cancel / Download PNG.
   - The size used last lives in module state (for the session), falling back to Design width
     if that bound no longer exists.
   - Download: `renderImage(session.file, { width, density, background, loadSalt:
     preview.loadSalt, provider: editorProvider })`, then the same download helper the zip uses
     (`download.ts`).
   - Show "Exporting…" on the primary button while it runs. A rejection closes the form and
     opens "Export failed" with the message.
2. **`SidebarTopBar.svelte`:** New / Import / Export (SplitButton) on the left and Undo on the
   right. The menu has Tileset (.zip) → `runExport` and Image (.png)… → open ExportImage. Rewrite
   the header comment ("Left, the edit history: Undo" is stale), and keep the **E14**
   paragraph. ExportImage needs to know whether a draft is drawn: pass it as a prop from App, or
   read `drafting`.
3. **Checks:**
   - `pnpm test` and `pnpm typecheck`.
   - A Playwright probe on the dev server (5175), starting from `n4/probe.mjs`:
     - the split button: one-click zip, chevron keyboard, Esc back to the chevron, left-aligned
       menu;
     - Export image: arrow keys in the radio list, Esc, focus returning to the trigger;
     - download PNGs at Design width 1× and 2× and at a breakpoint bound, then read their
       pixel size against `pixelSize` and check for opaque pixels. Check a transparent export
       has alpha 0 at a gap, and a preview-colour export doesn't;
     - with a draft open: the advisory shows, and the PNG equals the saved file's;
     - the zip is unchanged, including the `tiles/*/*` check.
   - Then stop for Pol. X4 (the sweep) follows.

### X3b-3 · Done (2026-11-07), uncommitted, waiting for Pol's review

X3b-2 committed f3427b4 (Pol: "continue").

- **`lib/sections/ExportImage.svelte`:** the Form popup as specified. The row picked since
  opening is held apart from the remembered size (module `let lastSize`) and cleared on close, so
  opening needs no effect. `pixelSize` runs only while open. The click reads file, size, width,
  density and name once, then `renderImage` → `saveBlob` → close; a rejection closes the form and
  calls `onFailed`. Background and Density share their row 3:2 (an even split cut off "Preview
  colour" at 480px) and wrap on a narrow screen.
- **`Popup`:** `closable` (a ✕ in the bar) and `initialFocus` (called after `showModal()`), so
  the form starts on the chosen size, not on the ✕.
- **`Toggle`:** an optional `swatch` per option (10px, `--color-edge` ring), kept in its own
  colour on the chosen segment.
- **`download.ts`:** `saveBlob(blob, name)` split out of `exportZip`; the zip uses it unchanged.
- **`SidebarTopBar`:** New / Import / Export (SplitButton) left, Undo right; the menu has Tileset
  (.zip) and Image (.png)…; one "Export failed" Popup for both. Header comment rewritten, E14 kept.
  `draft` prop from App (`drawn !== null`).
- **Bug found by the probe, fixed in `Menu`:** after Image (.png)… then Esc, focus went to
  `<body>`. The list was gone when the dialog opened, so the dialog remembered `<body>`, and
  Menu's refocus came after the page was inert. `run()` now refocuses the trigger before the
  action too (`close(true)`); a ⋯ Move later still ends on its ⋯ button.
- **Docs:** new `export-image.md`; `sidebar-top-bar.md`, `ui-popup.mdx`, `ui-toggle.mdx`,
  `download.md`, `ui-menu.mdx` and the three X3b-2 pages' callers updated. Coverage 135/135.
- **Checks:** tests 671 + 430, typecheck green. Probe 32/32 (`x3b3/probe.mjs`, session
  `ddbd1c91` scratchpad): bar order; one-click zip and the menu's zip (17 entries, `tiles/*/*`);
  chevron keyboard, left-aligned menu, Esc to the chevron; the dialog's role, focus on the chosen
  size, rows "Design width 720 px" / "Breakpoint 1 500 px", arrows, Esc and focus back to the
  chevron; PNGs at 720@2× (1440×687), 720@1× (720×344) and 500@1× (500×781), each matching the
  File line by IHDR; preview colour has no clear pixels, transparent has some; the size is
  remembered; with an operation open the advisory shows and the PNG is byte-identical to the
  saved one's. Not checked yet: the form at 320px wide (X4).

**How to test:**
- The dev server runs on 5175.
- The Playwright headless shell path is in `x1/check.mjs` (session `312c3a1c`) and in
  `n4/probe.mjs` (session `e5333bf0`), with `readme.zip`.
- A download in Playwright: `page.waitForEvent("download")`. Read the PNG size from the IHDR
  bytes (width at offset 16, height at 20, big-endian).

After 1, the remaining backlog is 6 (Attribute and Blend glyphs), 8 (label spacing), 9 (hints
for keyboard users) and 10 (the open card's accent edge).

## Known issues / notes

- **Block F testing** (headless Chrome): a target probe finds no enabled control under 24×24 in
  the sidebar. (The preview's 9px width handles were the exception until Stage 2 P3b made them 24px.) A hover probe finds a change on every
  enabled control except the already-chosen ones (on purpose) and sliders (their change is on a
  pseudo-element the probe cannot read; checked by eye). No sideways scroll at 1728, 1024, 600 or
  320. Folding animates, and is instant with reduced motion emulated. The Block E flows
  (24 checks) pass. Typecheck, 655 + 314 tests, docs coverage (107 files) and the docs build pass.
- A zero-weight palette segment is 4px wide, under the 24px target. It is selectable with the
  keyboard and by its neighbours' Earlier / Later; revisit in Stage 2 item 7.

- **Field rows are about 33px apart, not Figma's 22** (29 before Block F's 24px fields). Figma's rows are 14px tall because its
  fields are empty. A field showing a value needs room for its digits; the input uses
  `line-height: 1` (was `normal`, 33px pitch). Forcing a 14px input pushes the digits through the
  underline. Accepted by Pol in the Block C review.
- `Collapsible`'s bar was 33px instead of 25 (`min-height` without `border-box`). Fixed in Block C.
- Block C testing (browser, 27 checks): breakpoints add / edit / reorder / drop / remove, seed and
  asset rerolls, assets-on-load toggle (click and arrows), fresh load enabled only when something
  reseeds, undo, hints, collapse, drop import on the footer (armed state, undoable), popup focus
  and Esc, no page scroll at 1024×700. It found one bug, fixed: a hidden hint still took layout
  room (page scrolled 10px), and the footer's hints opened off-screen. Hints now use
  `display: none` and open upward in the footer (`--hint-top` / `--hint-bottom`).
- Block D testing (headless Chromium, 32 checks, including a refused duplicate rename and `grass 2`; including reset weights: enabled after a change, equalises, disabled when equal, one undo): 3 files → 1 group named after the first;
  square + and drop-on-group add variants; drop on the section → 1 group; shares; badge hidden, shown
  on hover, deletes, disabled on the last variant, reachable by Shift+Tab; thumbnail hint; zero weight allowed then refused on the last one (popup, thumb snaps back); Shift+arrow
  0.1; one undo per commit; live % during a drag; rename; trash; closed thumbnails; no page scroll;
  no console errors.
- Block E testing (headless Chrome, 24 checks): add a full operation (one undo entry), summary,
  arrows disabled at the ends and reorder, a tab opens that step, reseed-on-load only for a
  stochastic Source, instant switch with no change, popup with a change (Keep editing keeps the
  draft, Discard switches), Blend grid, re-seed while open survives Save, delete while open
  discards, Add disabled with its hint, Handpick paints and counts, palette entries, Constant
  collapses to one Value field, no page scroll, no console errors (only the missing favicon 404).
- Label-only glyph cells keep the 60px glyph height, so the Attribute grid is tall. Revisit when
  Stage 2 designs those glyphs.
- The sidebar colour `#E4F6F5` was sampled from a lossless Figma render, because it is not a
  Figma variable. Pol confirmed it in the Block A review.

## Block F plan (approved by Pol, 2026-11-04)

Goal: close Stage 1. Everything in the sidebar is on tokens and primitives, sized for
accessibility, with clear interaction feedback, and documented. The preview's and the footer's
design are not done here (Stage 2, items 1–2).

1. **Accessibility sizing pass.** Pol: "I want you to be the judge on how the sizes should be, in
   order to provide accessibility compliance", and the sidebar may get wider. Target WCAG 2.2 AA:
   - Every pointer target at least 24×24 CSS px (2.5.8), counting the spacing around it:
     `Toggle` chips, `IconButton`s (trash, re-seed, arrows, chevrons), `Button`s, tabs, glyph
     cells, palette segments, the delete badge, slider thumbs.
   - Text contrast at least 4.5:1, and 3:1 for control boundaries and focus indicators (1.4.3,
     1.4.11). Check every text/background pair in both themes; `--color-inactive` text on paper
     only where it marks a disabled control (exempt), never for information.
   - Readable minimum text size (no 10px for content people must read; the console and chip text
     grow), a type scale that steps clearly, and line-height that survives wrapping.
   - Reflow at 320px-equivalent and 200% zoom (1.4.10, 1.4.4) without sideways scrolling in the
     sidebar; the sidebar width clamp (`--sidebar-w`) may grow.
   - Visible focus everywhere (2.4.7, 2.4.11 not obscured by the overlay scroll handle or sticky
     parts).
   Change tokens, not components. Record each decision and its WCAG reason in `DESIGN_SYSTEM.md`.
2. **Interactivity feedback improvement** (Pol). One rule per kind of control, applied
   everywhere, so every interactive element answers hover, press and focus:
   - Black bars that act (add bars, square "+", step tabs, section and group bars): **invert on
     hover**, the bar turns paper and its content ink (Pol's example: the add buttons).
   - Paper chips and buttons: invert on hover (already), plus a pressed state.
   - Underline fields and sliders: thicken on hover (done in Block E), pressed thumb.
   - Glyph cells, palette segments: selected look on hover (done), pressed state.
   - Icon buttons: a hover change that keeps the seed colour meaning (e.g. a frame or fill
     behind the icon rather than a colour change).
   - Cursors: pointer for actions, text for fields, grab for drag, help for hints.
   A browser probe checks that every enabled control changes on hover.
3. **Animate folding.** `Collapsible` opens and closes with Svelte's `slide` over `--dur-fast`
   (none under `prefers-reduced-motion`). The body still unmounts when closed.
4. **Preview scroll handle.** The preview column uses `ScrollArea` too (Pol).
5. **Colour sweep.** Replace the ~36 hex colours left in the preview chrome (`PreviewFrame`,
   `ReferenceControls`, `SelectionOverlay`, `PaintLayer`, `ReferenceLayer`) and the stray raw px
   values with tokens. Colours that are part of the rendered picture stay named constants.
6. **Leftovers.** Remove `offersReseedOnLoad` / `setReseedOnLoad` if only tests use them. Check
   `Section.svelte` still earns its place over `Collapsible`.
7. **Visual review against Figma**, section by section, with a list of remaining mismatches:
   fixed now, or moved to the Stage 2 backlog. Where accessibility (step 1) overrides Figma, say so.
8. **Docs and checks**: changed files' pages, `DESIGN_SYSTEM.md`, coverage, typecheck, tests,
   docs build, and a browser run of the earlier block checks plus the hover probe.

## Tweaks for Block F (Pol, after the Block C review, 2026-11-04) — done in Block F

- **Overall sizing.** Some text is too small and some too big. Controls are too small: the
  boolean chips (`Toggle`), the re-seed `IconButton`s, and similar. Revisit the type and size
  tokens against Figma at real size, not per component.
- **Animate folding.** Sections (and tile groups) should animate open and closed instead of
  appearing and disappearing. `Collapsible` unmounts its body today; it needs a height
  transition that still respects `prefers-reduced-motion`.
- **Footer layout will change.** Its arrangement is temporary anyway (Stage 2 footer design);
  do not polish it before that.

## Open questions

- None open. (Delete asset was decided in Block D.)

## Stage 2 backlog (one design group each, discussed before implementing)

1. Sidebar footer: seed and re-seed, an export menu (image export does not exist yet), import, undo.
   *(Partly done by the adopted design: Undo, New, Import and Export moved to the sidebar top
   bar, and the footer holds only randomness. The export menu is still to do.)*
2. *(Done, Stage 2 · Preview P1–P4.)* Preview: top UI (sizes, colour, current size), minimal corner handles, a full-viewport grid
   tied to the tileset grid, breakpoint buttons, removal of the reference image.
3. *(Done, Stage 2 · Warnings and dialogs W1–W3 and W5.)* Warnings as dismissible pop-ups (one
   reusable notification component).
4. *(Done, Stage 2 · Warnings and dialogs W4 and W5.)* Destructive params confirm **on blur**, and
   only when the value really changed. Redesigned dialog.
5. *(Done in P1.)* Remove the "The file" debug view.
6. Glyphs for Attribute, Source and Blend.
7. *(Done: cards plus a stepper in the adopted design; the palette widget in K0–K3 and T4.)* Operations stack design (Pol, Block E review): it should be obvious which action comes next.
   Block E added a Next button only; the stack, header and body need a design pass in Figma.
   The palette widget is hard to grasp (Pol, Block F review round 2) and belongs here.
8. Space between field labels and their values across the sidebar (Pol, Block F review round 2:
   "will come back to it").
9. Hints for keyboard users (found in P4): `ui/Hint` opens only on hover, so a hint on something
   that is not focusable (the preview readout, tile thumbnails) never shows without a mouse. A
   screen reader still reads it through `aria-describedby`. Decide system-wide (show on
   focus-within, or make the anchors focusable).
10. The open operation card's 3px accent edge may become subtler, like the failure notice's
    red edge, which was removed in W1 (Pol, 2026-11-06: "we will handle the one in operation
    section later").
11. *(Done, T0–T4.)* Tile and pattern (Pol, reviewing K3, 2026-11-06): the Tile attribute and the Source
    contradict each other. Palette weights read as chances, but the Source, chosen afterwards,
    decides what they mean. The editor's % is false under noise, a diagonal gradient and
    constant. Planned in "Next session plan: Tile and pattern (item 11)".
12. *(Done, N0–N4.)* Explain Noise (Pol, T1 review, 2026-11-06): the user needs Noise itself explained. Why do
    the middle entries cover more? What do *Octaves* and *Cells per feature* do? Settle this
    after item 11. Options include a hint or a short explainer on the Pattern step, a live
    preview of the field, and renaming the params in the editor only (the file format keeps
    `cellsPerFeature` and `octaves`).
