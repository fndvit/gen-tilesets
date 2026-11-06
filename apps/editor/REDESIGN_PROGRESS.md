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
Warnings and dialogs is **closed** (W0–W5: `8364d4e`, `3034fc1`, `3a8ca84`, `feafa9a`). **Next
session: follow "Next session plan: Palette widget (item 7)" below**, starting with K0's questions
for Pol.

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

Next: Pol reviews K3, commit, then K4 (sweep: probes at 1728 / 1024 / 600 / 320, contrast, focus
order).

### How to test

As before: the dev server on **5175**, Playwright from `node_modules/.pnpm/playwright-core@1.56.1`
with `executablePath` set to the headless shell (see "How to test" in P3b). Build test zips with
`os.walk` over `tiles/`. Zipping only the `tiles/t1` directories leaves the pictures out, and the
preview draws nothing. W5's `probe.mjs` (session scratchpad) is a template for the audit
helpers (targets, text size, capitals, contrast).

After item 7, the recommended order is 1 (export menu), 6 (glyphs), 8, 9 and 10.

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
7. *(Stack, header and body redesigned by the adopted design: cards plus a stepper. The palette
   widget is still to do.)* Operations stack design (Pol, Block E review): it should be obvious which action comes next.
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
