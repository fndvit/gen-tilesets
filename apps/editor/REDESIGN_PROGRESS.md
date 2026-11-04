# Editor redesign — progress

**Branch:** `editor-redesign` · **Plan:** Stage 1, blocks A–F · **Design system:** `DESIGN_SYSTEM.md`
**Figma:** `VCp0HyxbLOBq0vOkpDWmIL` (page *Editor*; frame `Page` 502:849)

## Current position

**Stage 1, Block F (sweep + review) is implemented and tested (2026-11-04), awaiting Pol's
review.** When it is approved, Stage 1 is closed and Stage 2 starts with the backlog below, one
design group at a time.

## Stage 1 blocks

Each block is implemented, then reviewed with Pol, then tested, before the next one starts.

| Block | Scope | Status |
|---|---|---|
| A. Foundation | `styles/tokens.css`, `styles/base.css`, Roboto Mono, this file and `DESIGN_SYSTEM.md` | Done, approved |
| B. Primitives | `lib/ui/`: Icon, IconButton, Collapsible, FieldRow, Toggle, AddBar, Slider, Marquee, TabBar, GlyphGrid + OperationGlyph (artwork-agnostic); restyle `NumericInput`; a docs page for each new file | Done (committed `cd31b44`) |
| C. Layout + Grid & Size | Page grid, sidebar split into scrollable and fixed parts, header removed, `Section` rebuilt on Collapsible, Grid & Size section; sections extracted to `lib/sections/`; `Button`, `Popup` | Done, approved |
| D. Tiles | TileLibrary rebuilt as TileGroup / TileAsset, weight slider, N files → 1 group, add variant via picker | Done, approved |
| E. Operations | OperationHeader, step tabs open the draft, selection glyph grid, label-only grids, ParamFields restyle, token restyle of PaletteBar / NumericMapping; BlendControl replaced by a glyph grid | Done, approved |
| F. Sweep + review | Accessibility sizing, hover / press feedback, animated folding, preview `ScrollArea`, colour sweep, leftovers, Figma review, docs | Done, awaiting review |

## Decisions

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

Block F visual review against Figma (`Page` 502:849, at 1728):
- Accessibility overrides Figma (kept): bar heights, chip and button heights, field-row pitch,
  operation header height, the type scale, sidebar width (518 vs 477).
- Already decided earlier (kept): chevrons on the left, Breakpoints / Derived / Design width,
  the footer, label-only Attribute / Source / Blend glyphs.
- Stage 2 (unchanged): the whole preview (size readout, preset bar, corner handles, grid,
  breakpoint buttons), the warnings.
- Nothing left to fix in Stage 1.

## Known issues / notes

- **Block F testing** (headless Chrome): a target probe finds no enabled control under 24×24 in
  the sidebar. The preview's 9px width handles are the exception, allowed by 2.5.8's spacing rule
  (nothing else within 24px) and usable with arrow keys. A hover probe finds a change on every
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
2. Preview: top UI (sizes, colour, current size), minimal corner handles, a full-viewport grid
   tied to the tileset grid, breakpoint buttons, removal of the reference image.
3. Warnings as dismissible pop-ups (one reusable notification component).
4. Destructive params confirm **on blur**, and only when the value really changed. Redesigned dialog.
5. Remove the "The file" debug view.
6. Glyphs for Attribute, Source and Blend.
7. Operations stack design (Pol, Block E review): it should be obvious which action comes next.
   Block E added a Next button only; the stack, header and body need a design pass in Figma.
