# Editor redesign — progress

**Branch:** `editor-redesign` · **Plan:** Stage 1, blocks A–F · **Design system:** `DESIGN_SYSTEM.md`
**Figma:** `VCp0HyxbLOBq0vOkpDWmIL` (page *Editor*; frame `Page` 502:849)

## Current position

**Stage 1, Block C (layout + Grid & Size) is done: reviewed by Pol and tested on 2026-11-04.**
Next is **Block D, Tiles**. Start it in a new session.

## Stage 1 blocks

Each block is implemented, then reviewed with Pol, then tested, before the next one starts.

| Block | Scope | Status |
|---|---|---|
| A. Foundation | `styles/tokens.css`, `styles/base.css`, Roboto Mono, this file and `DESIGN_SYSTEM.md` | Done, approved |
| B. Primitives | `lib/ui/`: Icon, IconButton, Collapsible, FieldRow, Toggle, AddBar, Slider, Marquee, TabBar, GlyphGrid + OperationGlyph (artwork-agnostic); restyle `NumericInput`; a docs page for each new file | Done (committed `cd31b44`) |
| C. Layout + Grid & Size | Page grid, sidebar split into scrollable and fixed parts, header removed, `Section` rebuilt on Collapsible, Grid & Size section; sections extracted to `lib/sections/`; `Button`, `Popup` | Done, approved |
| D. Tiles | TileLibrary rebuilt as TileGroup / TileAsset, weight slider, N files → 1 group, add variant via picker | |
| E. Operations | OperationHeader, step tabs open the draft, selection glyph grid, label-only grids, ParamFields restyle, token restyle of PaletteBar / NumericMapping / BlendControl | |
| F. Sweep + review | Hardcoded colours replaced by tokens, docs pages, visual review against Figma | |

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

## Known issues / notes

- **Field rows are about 29px apart, not Figma's 22.** Figma's rows are 14px tall because its
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
- Tiles and Operations still have their old insides (Blocks D and E), so they look out of place
  next to the new sections until then.
- The sidebar colour `#E4F6F5` was sampled from a lossless Figma render, because it is not a
  Figma variable. Pol confirmed it in the Block A review.

## Open questions

- Delete asset (a single variant) is not in Figma. To decide in Block D.

## Stage 2 backlog (one design group each, discussed before implementing)

1. Sidebar footer: seed and re-seed, an export menu (image export does not exist yet), import, undo.
2. Preview: top UI (sizes, colour, current size), minimal corner handles, a full-viewport grid
   tied to the tileset grid, breakpoint buttons, removal of the reference image.
3. Warnings as dismissible pop-ups (one reusable notification component).
4. Destructive params confirm **on blur**, and only when the value really changed. Redesigned dialog.
5. Remove the "The file" debug view.
6. Glyphs for Attribute, Source and Blend.
