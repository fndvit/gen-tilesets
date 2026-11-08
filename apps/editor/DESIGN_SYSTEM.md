# Editor design system

The visual language of the tileset editor: **"Ink on paper, with one live accent"**, adopted on
2026-11-06 from the design exploration (iteration 2). Its tokens live in `src/styles/tokens.css`.
For why each choice was made, and what it replaced, see `editor-redesign/DESIGN_DIRECTION.md` in
the archive (`../gen-tileset-spec-archive/`).
Read this file before building or restyling any editor component.

Layout and the Selection artwork still come from the Figma file **Tileset Creator Editor**
(`VCp0HyxbLOBq0vOkpDWmIL`, page *Editor*). The look no longer follows Figma's black bars.

## Principles

1. **Paper cards on a grey table.** The sidebar is a grey ground. Every section is a white card
   on it, open or closed. A nested group (breakpoint rule, tile group, operation) is a faint grey
   well inside a card. A field is one step darker than whatever it sits on. Surface value carries
   hierarchy, and there are almost no borders.
2. **Ink is structure, sparingly.** Ink fills only what is primary (one per area) or selected.
   Ink draws only three lines: the 2px rule under an open section's header, the hairline under
   the two top bars, and the ring of a selected glyph.
3. **One accent with one meaning.** Pink, #CD1957 (`--color-accent`; ultramarine until N3; Pol picked #E94B82, darkened to pass AA for text) means **"what you are editing
   now"**: the open operation's edge and index square, its active step, the focus ring, and the
   draft cue (the preview's 2px frame and its "Draft · not saved" tag). The cells it selects in
   the preview are **not** accent: they have their own colour, `--berry` #8E294C, the accent's
   hue darker and muted, as a thin 1px line and a light wash (Pol, N3). Do not use it for anything else. There is no colour for
   "random": the re-seed icon's shape says "draw again".
4. **Two voices of type, never caps.** Helvetica carries words; Roboto Mono carries data (what a
   field holds, the seed, summaries, chips, captions). Size, weight and colour make the steps.
   No style uppercases.
5. **The square is the motif.** It is the tile the product makes. It appears in index squares,
   thumbnails, icon buttons and the section chevron's box. A square is always a control or data,
   never decoration.
6. **Tokens only.** Components never contain raw hex values, px sizes for type, or ad-hoc
   spacing. If a value is missing, add a token first.
7. **Reuse before inventing.** Every new control is a composition of the patterns below.

## Tokens (`src/styles/tokens.css`)

| Group | Tokens | Notes |
|---|---|---|
| Colour, primitive | `--white` · `--grey-50 100 200 300 400 450 500 600 800` · `--black` (#111) · `--black-6/10/12` washes · `--pink` (#cd1957) · `--pink-10` · `--berry` (#8e294c) · `--red-600` | Only `tokens.css` reads these |
| Colour, surfaces | `--color-ground` (grey-100) · `--color-card` and `--color-panel` (white) · `--color-well` (grey-50) · `--color-field` / `--color-field-hover` · `--color-edge` (grey-500, a field's bottom edge) | A container can reset `--color-field` (white fields in a grey well) |
| Colour, text | `--color-ink` · `--color-muted` (grey-600, 6.5:1 on white) · `--color-disabled` (grey-450) · `--color-paper` | |
| Colour, actions | `--color-primary` / `-hover` / `--color-on-primary` · `--color-secondary` / `-hover` / `-pressed` · `--color-hover` / `--color-pressed` (washes for tertiary, icons and headers) · `--color-selected` / `--color-on-selected` (ink) | |
| Colour, accent | `--color-accent` · `--color-accent-wash` (the active step's row) · `--color-selection` (`--berry` #8e294c, kin to the accent): the preview's selected and painted cells (N3) · `--color-erase` | |
| Colour, lines | `--color-bar-rule` (ink, under both top bars) · `--color-track` (slider tracks, the stepper line, hairlines) · `--color-grid` · `--color-scrollbar` | |
| Status | `--color-danger` (= `--red-600`) | Only the alert icon of a failure notice. There is no warning colour: an advisory is ink |
| Font | `--font-ui` (Helvetica, standing in for Neue Haas Grotesk) · `--font-mono` (Roboto Mono 400 and 500, self-hosted via `@fontsource`) | |
| Space | `--space-1…7` = 2 / 4 / 6 / 8 / 10 / 12 / 16 px | 2px base |
| Size | `--control-h` 30 · `--header-h` 52 (a section header) · `--preview-bar-h` 52 (both top bars) · `--group-h` 34 · `--add-h` 32 · `--icon` 16 · `--icon-button` 28 · `--op-index` 24 · `--step-dot` 20 · `--menu-w` 200 · `--thumb` 32 · `--thumb-sm` 16 · `--thumb-lg` 48 (Constant's one tile) · `--share-measured-w` 48 (a "≈68%") · `--slider-thumb` 16 · `--glyph-w` 72 · `--glyph-slot` 43 · `--badge` 16 · `--field-label-w` 38% (`-compact` 116px in an operation) · `--width-chip-w` 48 · `--swatch-w` 30 · `--sidebar-w` clamp(400, 30vw, 560) · the preview handle sizes | |
| Shape | `--radius-xs` 3 (thumbnails, index squares) · `--radius-sm` 6 (fields, buttons, segments, icon buttons) · `--radius` 8 (cards, wells) · `--radius-lg` 12 (popups) · `--radius-round` · `--rule-w` 1 · `--rule-strong` 2 · `--accent-edge` 3 | |
| Elevation | `--shadow-raised` (a raised control on a track) · `--shadow-float` (popups, menus, notices) | |
| Focus | `--focus-w` 2 · `--focus-offset` 2, in `--color-accent` | |
| Motion | `--dur-fast` 120ms · `--ease` · `--marquee-speed` | Respects `prefers-reduced-motion` |

## Typography (`src/styles/type.css`)

`type.css` holds only these classes and the fonts, so the docs stories can load it without
`base.css`. Single-line classes trim the box to cap height (`text-box: trim-both cap
alphabetic`); a title that clips for an ellipsis is untrimmed, with `--leading-title`.

| Class | Spec | Used for |
|---|---|---|
| `.t-section` | Helvetica 17 / 600 | Section titles, popup titles |
| `.t-title` | Helvetica 14 / 600 | Group titles (rule, tile group), an operation's attribute, a step's name, the footer's heading |
| `.t-label` | Helvetica 13 / 400, muted | Field labels, questions |
| `.t-value` | Roboto Mono 13 / 400, tabular | What a field holds, the seed, % shares, readouts |
| `.t-body` | Helvetica 13 / 400 | Running text, hints |
| `.t-xs` | Helvetica 13 / 500 | Buttons, segments, menu items |
| `.t-console` | Roboto Mono 12 / 400 | Section summaries, chip answers, captions, glyph labels |

## Layout

- **Page:** two columns at full viewport height, sidebar (`--sidebar-w`) and preview. The page
  never scrolls; each column scrolls its own content (`ScrollArea`).
- **Top row:** both columns start with a top bar on the grey ground, in **one grid row** (CSS
  subgrid on `main`). They are always the same height, even when the preview bar wraps, and one
  ink hairline (`--color-bar-rule`) runs under both.
  - The sidebar bar (`SidebarTopBar`) holds the document: New, Import and Export (the primary,
    a **Split button**) on the left; Undo on the right. The document's actions come first, and
    Export's menu then opens left-aligned under it (Pol, X1). It also takes dropped zips.
  - The preview bar holds the width readout, the breakpoints, the grid toggle, the sizes and the
    background swatch.
- **Sidebar body:** the scrolling sections (8px padding, cards 6px apart), then the fixed
  **Randomness** footer card, which never scrolls.
- **Section:** the card header (title, summary while closed, "+" for a list, chevron), then
  content with 12px above and 16px at the sides and below. Each body sets its own row gap.
- **Reports after an action** (a refused import, a failed export) open in a `Popup` and never take
  space in the layout.
- **Notices** float in a stack at the preview's top-right, `--space-6` under the top bar's
  hairline, newest on top. They never cover the sidebar, and they never take space in the layout.
  At narrow widths the stack fills the preview's width, less `--space-6` on each side.
- **Live draft** (item 12): while an open operation's draft is complete (`isComplete`), the
  preview draws it. `<Tileset>` gets the file with the draft's Operation in it (`draftFile`:
  replaced by id, or appended for a new one), so every change to the draft shows at once and
  the picture is exactly what Save will produce. Nothing is written to the file until Save
  (**E3**). While the draft is incomplete, the preview shows the saved picture and the selection
  overlay, as before: there is no half-painted state (Pol, N1). This amends **Invariant S2**
  (`App.svelte`): the preview is still the one `<Tileset>` and the same code, but while a draft
  paints, its input is the file plus the draft. A separate preview renderer was rejected,
  because it could drift from what Save produces, which is what S2 exists to prevent.
- **Draft cue:** while the preview draws a draft, and only then, a 2px (`--rule-strong`) `--color-accent` frame
  runs inside the picture area, and a "Draft · not saved" tag sits at the top of the notice
  stack, above any notice: a white chip (`--radius-sm`, `--shadow-float`, 28px tall) with an
  8px accent square and the words in accent `.t-xs`. It is not dismissible. Save, Discard, or
  the draft becoming incomplete removes both. The cue marks a picture that is not saved, not an
  operation that is open, so an open draft that cannot paint yet shows no cue.
- **Reflow:** below `40rem` the columns stack; only then does the page scroll.
- **Every grid in the sidebar** names its column (`minmax(0, 1fr)`).

## Component patterns

| Pattern | Anatomy | Where it appears |
|---|---|---|
| **Section** (`Section` + `Collapsible variant="section"`) | A white card. Its 52px header has the title in `.t-section`, and under it, while closed, a one-line `.t-console` summary. On the right sit an optional "+" (`onAdd`, which also opens the section) and the chevron in a grey 28px square. Open, a 2px ink rule runs under the header. The whole header washes on hover. Section selectors are scoped to the section's own heading, so they never leak into nested groups | Grid & size, Breakpoints, Derived, Tiles, Operations |
| **Group** (`Collapsible variant="group"`) | A grey well. A 34px header with the title in `.t-title`, the summary on the same line, actions, then the chevron | Breakpoint rule, tile group |
| **Field row** | A muted `.t-label` in a fixed label column (`--field-label-w`), then the control. An explanation is a hint on the label, never text in the row. A param with no fixed name is labelled from its name in sentence case (`labelFor`: `cellsPerFeature` → "Cells per feature") | Numeric and boolean inputs, operation params, the seed |
| **Input** | A filled box (`--color-field`), radius 6, with a 1px `--color-edge` bottom edge. The value is in `.t-value` (mono). Hover darkens the fill a step | Numeric inputs, the seed |
| **Input, waiting** (`NumericInput commit="blur"`) | A field holding a changed value that is not applied yet: "↵ Enter to apply" in muted mono at its right edge, also in the field's `aria-describedby`. The field keeps room for it, so the digits never run under it. It is not shown for the same value, for an invalid one, or after Esc or Enter | Fields that shape the grid: Grid & size's cell size, rows and design width; a breakpoint's rows, columns and cell size |
| **Segmented control** (`Toggle`) | A grey track with equal segments. The chosen one is ink with white text | Alignment, Assets on load, enum params, the preview's sizes |
| **Button** | `primary` (ink, one per area), `secondary` (grey fill), `tertiary` (text, a wash on hover). 30px tall, radius 6, `.t-xs`. An optional leading `icon` | Export, Save/Add, Undo, New, Import, Reroll assets, Discard |
| **Split button** | One primary (ink) control in two parts. The main part is a Button that runs the default action. At its right, a 28px chevron segment (the `fold` icon, the disclosure chevron; `down` is an arrow and would read as a download) is split off by a white hairline at 32% (`box-shadow: inset 1px 0 0 rgb(255 255 255 / .32)`); only the control's outer corners are rounded. The parts are two `<button>`s with their own accessible names: the main part says what it does ("Export"), the chevron has `aria-haspopup="menu"` and says what it opens ("More export options"). Enter or Space on the main part runs the default action; on the chevron it opens the **Menu** on its first item. The menu then works as every Menu does, and Esc returns focus to the chevron. The chevron is 28×30 (2.5.8). The default action must also be in the menu, so the menu is a complete list on its own | Export: the main part downloads the zip in one click (**E14**); the menu adds the image |
| **Icon button** | A 28px square, with a 16px icon muted at rest. It turns ink on a wash under the pointer. `strong` keeps it ink at rest (re-seed) | Re-seed, trash, close, reorder |
| **Menu** | An icon button (`more`) that opens a floating list (`--shadow-float`) of icon plus label items. It follows the WAI-ARIA menu button pattern. Focus returns to the button after an action. A label ending in "…" opens a dialog rather than acting at once.<br>**Alignment:** the list is anchored under its trigger and aligns with the trigger's edge nearest the bar's edge: the ⋯ menus sit at a row's right and right-align; a **Split button**'s menu opens under the whole control and left-aligns with it, because Export sits at the bar's left. Either way the list is kept 8px inside the window (a narrow screen). In code: `Menu`'s `align`, `anchor` (the element it is placed against) and `trigger` (a snippet for the caller's own button; Esc and refocus go to it) | An operation's Move earlier, Move later and Delete; a palette entry's Change tile, Move earlier, Move later (only under Noise and Gradient) and Remove; Export's Tileset (.zip) (`archive`) and Image (.png)… (`image`) |
| **Add row** | `+` and a label, tertiary. The square variant is a 32px grey "+" | Add breakpoint, tile group, operation; add a tile |
| **Tile group / tile asset** | A well with up to four 16px thumbnails in the header. Each row is a 32px thumbnail, a slider (4px track, 16px round ink thumb) and the % in mono. "+" and Reset weights at the foot | Tiles |
| **Palette** (`PaletteList`) | Its shape follows the operation's **Pattern** (Tile and pattern, T0–T1).<br>**Shared:** a `.t-label` "Palette" with a muted mono label at the right ("chance" or "≈ painted"). Under it is a 12px **proportion strip**, read-only and hidden from assistive tech: one segment per entry, filled with the tile's picture (clear is the slashed square, a missing picture is field grey; a zero weight is a 2px ink tick). Then the **entry rows**, each 32px: the thumbnail (a button that opens the tile picker), the name, the tile group's slider (0 to the larger of 2 and the largest weight), the % in mono, and a Menu. Hovering or focusing a row rings its segment in the accent. Under the rows is a muted `.t-body` caption, then "+ Entry" (Add row), which opens the picker and adds the chosen tile at the end with weight 1.<br>**Random:** order means nothing, so there is no number, no grip and no threshold, and the Menu has no Move items. The strip segments are as wide as the weights, and the % is each entry's **chance**. Caption: "Each cell picks a tile at random. The % is each tile's chance."<br>**Noise, Gradient:** an ordered list. Each row adds a grip (pointer only) and a mono number before the thumbnail. The % is the **measured coverage**, written "≈68%": the share of the selected cells the entry actually paints with the current seed (`coverage`, `controls/palette.ts`). The strip draws the same measured shares, so the two always agree; there are no threshold labels. The caption says that neighbours in the list meet on the canvas. Under Noise it adds why the middle entries cover more and what to do: "Middle entries cover more because noise rarely reaches its ends. Give the first and last entries more weight to even it out." There is no "Even out" action (Pol, N0): the right weights depend on the seed. Under Gradient it adds that the bands follow the list. Dragging the grip reorders live, and the Menu's Move earlier / Move later is the keyboard path (WCAG 2.5.7).<br>**Constant:** one tile, not a palette. The label is "Tile", then a 48px thumbnail button (opens the picker), the name, and "every selected cell" in muted mono. A muted `info` line, "… are kept until you save, in case you switch back to a pattern that uses a palette.", shows only while the draft holds other entries. Save writes only the shown entry.<br>At the narrowest widths (a container under 250px), the rows' gaps tighten to `--space-2` and the right-hand label is hidden | An open operation that writes Tile |
| **Tile picker** (`TilePicker`) | A non-modal popover (white, radius 12, `--shadow-float`) under its trigger: a muted "Choose a tile", then a grid of 64px cells, each a 36px thumbnail over a mono name. Clear is always the first cell. The current tile has the glyph grid's 2px ink ring; hover washes. Arrow keys move between cells, Enter or a click picks, Esc or a click outside closes, and focus returns to the trigger | A palette entry's tile, "+ Entry", the single tile under Constant |
| **Operation card** (`OperationCard`) | A grey well, collapsed:<br>1. a 24px ink index square;<br>2. the title, which is what it writes: the attribute in `.t-title`, then palette thumbnails and names, or the range in mono;<br>3. re-seed and a menu;<br>4. a row of step chips (Selection, Pattern, Blend), in step order, each a muted step name and a mono answer, on white, wrapping. Each chip opens its step; the title opens Attribute.<br>Open, the card is white with a 3px accent edge and an accent index, and holds the stepper | Operations |
| **Operation stepper** (`OperationBody`) | Four rows joined by a vertical line, in this order: **Selection → Pattern → Attribute → Blend**. Pattern comes before Attribute because it decides what the attribute's values mean (a palette weight is a chance only under Random). The steps stay navigable in any order; only the default walk and "Next" follow it. Pattern's question is "How should the tiles spread?" ("How should the values spread?" for a numeric attribute), and its options keep their names: Random, Noise, Gradient, Constant. Each row is a 20px number, the step name in `.t-title`, and the answer in mono. The number is hollow when unanswered, ink when answered, and accent while active (the active row also gets the accent wash). The active step unfolds under its row: the question, a glyph grid, then the chosen option's fields in a grey well under a muted caption. The card ends, under a hairline, with Discard, **Next: <step>** and Save/Add.<br>**The Pattern well** (item 12): first a **field preview**, then the option's fields. The preview is the whole grid of the active breakpoint at full well width, one square per cell, keeping the grid's ratio (a grid so tall it would push the fields out of view is capped at `--field-preview-max-h`, 240px, and drawn narrower, centred): selected cells in greys from paper (0) to ink (1), the pattern's value there with the current seed; unselected cells in `--grey-200`. Under it, a 6px 0–1 scale (paper to ink) between a mono "0" and "1". It changes live with every field. It is hidden from assistive tech (the fields carry the values) and shown for Random, Noise and Gradient; Constant has none, because its field is one flat value. The field labels have hints that say what each param does. **Noise** also puts a tertiary "ⓘ How noise works" button at the right of the options bar, which opens the **Explainer popover** | Operations, open |
| **Glyph grid** | Cells at `--glyph-w` or wider (`auto-fill`): a mono label over a 43px artwork slot. Hover washes; selected is a white tile with a 2px ink ring | Operation step options |
| **Popup** | A white panel, radius 12, `--shadow-float`, with no frame or black title bar | Reports after an action where nothing happened: an import refused, an export failed, a Tiles refusal (a taken name, a tile in use, the last variant, the last non-zero weight), a palette refusal (the last entry, the last non-zero weight) |
| **Explainer popover** | A non-modal popover like the Tile picker's (white, radius 12, `--shadow-float`, `--space-6` padding, under its trigger, at most 340px wide): a `.t-title` heading with a ✕, then `.t-body` running text, each param as a `.t-title` name over a muted explanation, small ink-and-grey bars for measured figures, and a muted note under a hairline. Esc, ✕ or a click outside closes it, and focus returns to the trigger. It explains; it never holds a control. It is the one exception to "explanations are hints": an explanation too long for a hint and needed without a mouse goes here | "How noise works" (the Pattern step under Noise): patches, Cells per feature (patch size, not shares), Octaves (the middle bias, measured: equal entries paint about 23/52/26, 15/68/17, 12/75/14 for 1, 2, 3), the ends advice (about 3× under 2 octaves), and that the ≈% belongs to the position in the list |
| **Notice** (`Notice`, `NoticeStack`, `notices` store, `advisories.ts`) | A 360px white card, radius 8, `--shadow-float`, never blocking. It holds a 16px icon, then the title in `.t-title`, data (file names, numbers) in ink `.t-console`, a muted `.t-body` explanation, optional tertiary actions, and a 28px ✕. An advisory has the `info` icon in ink. A failure has the `alert` icon in `--color-danger`, which is its only colour: no edge, no fill. ✕ dismisses it until its condition changes. A notice goes away by itself when its condition does | Asset load failures (one notice for all), files that did not attach in Tiles (one notice per drop), advisories 1, 2, 3, 4, 5 and 7, an import's upgrade and unreadable pictures |
| **Inline advisory** (`Advisory`) | A muted `info` icon and a muted `.t-body` line under the control it is about. No box, no colour, no ✕. It shows only while its condition holds. Constant's kept-entries line in the palette uses it too | Advisories about one control: duplicate tile names (6) and rotation ends (9). Advisory 8 (palette reordered under random) is retired: under Random the palette has no order to change |
| **Dialog** (`Dialog`) | The Popup panel asking one question. The title is the question ("Change columns to 8?"), and the body says what changes and how to undo it, with any affected operations listed in a well. Buttons: Cancel (secondary), then the verb that names the action (primary, at the far right: "Change columns", not "OK"). Danger is in the words, never in red. Focus starts on Cancel, Esc cancels, and focus returns to the trigger | Destructive resize (E12), New tileset, unsaved changes |
| **Form popup** | The Popup panel holding a few choices before an action. Unlike a Dialog it asks no question: it is a `role="dialog"` (not alertdialog) with a noun title ("Export image") and a ✕. The body is fieldsets, each with a `.t-label` legend, then an optional Inline advisory and a summary line, then Cancel (secondary) and the verb that names the action (primary, at the far right: "Download PNG"). Focus starts on the first field, Esc or Cancel closes it, and focus returns to the trigger | Export image |
| **Radio list** | One choice from a short list whose options need more than a word. A field-grey well (`--color-field`, radius 6) of 30px rows, each a 12px ring dot, the label, and a mono value at the right. The chosen row is ink with white text and a filled white dot. Hover darkens a row one step. It is a `radiogroup` of native radios: Tab enters on the chosen row, the arrow keys move and choose | Export image's size |
| **Export image** (a Form popup) | **Size** (a Radio list): first `Design width · 1000 px` (the saved file's design width, `layout.referenceWidth`, the Grid & size field; not the preview's width, so the handles never change the image. Pol, X3b), then one row per breakpoint bound (`boundsOf(rules)`, ascending), named by the rule that sets it, using the sidebar's "Rule N" number: `Breakpoint 2 · 768 px`. A rule with both a min and a max width names two bounds; both rows carry its number and the px tells them apart. A bound that two rules name lists both: `Breakpoint 2 + 3 · 1024 px`. There is no "base" or "rule N" label at the right. A bound equal to the design width keeps its own breakpoint row, because the rule number is what the author looks for. With no breakpoints, Design width is the one row, still shown. It opens on the size used last in the session, else Design width.<br>**Background** (Preview colour / Transparent) and **Density** (1× / 2×, 2× by default): two segmented controls side by side. The Preview colour segment carries a small swatch of `preview.background`, which keeps its own colour on the chosen ink segment.<br>While the preview draws a draft, an Inline advisory: "Draft not included: this is the saved tileset".<br>A **File** line: `.t-label` "File", then in mono the name and pixel size, for example `tileset-1000px@2x.png · 2000 × 1194 px`.<br>Buttons: Cancel, Download PNG. The rules for the image itself are under **Export** below | Export's Image (.png)… |
| **Width choices, swatch** | Segments on a white track in the preview bar; the chosen one is ink. The swatch is a 30px rounded square with an edge | Preview top bar |
| **Footer: Randomness** | A white card with a `.t-title` heading. It holds the seed field and a strong re-seed button; Assets on load; then Reroll assets and Preview a fresh load as two secondary buttons with the re-seed icon | Sidebar foot |

### Icons (`src/lib/ui/icons.ts`)

There is one outline family, made of Lucide paths (ISC licence). They are drawn on a 24-unit
grid, rendered at 16px with a 1.5px stroke and round caps and joins, in `currentColor`.
- The set: `fold`, `up`, `down`, `plus`, `close`, `trash`, `reseed`, `undo`, `import`, `export`,
  `new`, `more`, `check`, `info` (an advisory), `alert` (a failure), `grip` (drag to reorder, Lucide grip-vertical), `swap` (change a palette entry's tile, Lucide arrow-right-left), `archive` (the zip, Lucide archive), `image` (a PNG, Lucide image). A Split button's chevron reuses `fold`.
- An icon names an action, sits beside a word or inside a named control, and is never
  decorative.
- Add an icon only in the same family and grid.

### Operation glyphs

A glyph cell has a fixed frame: a mono label over a **43×43 artwork slot**. What fills the slot
is supplied per option, as an image (`src`) or as markup (an `artwork` snippet). Artwork uses ink
and paper only, with 1px strokes.

**Selection** glyphs are SVG files exported from Figma, in `src/assets/glyphs/selection/` (`all`,
`checkered`, `every-nth`, `random`, `rect`, `handpick`): 4×4 cells, with 10px cells at an 11px
pitch. All and Checkered were written by hand in the same geometry.

**Pattern** glyphs use the same 4×4 geometry, filled in four ink tints (paper with a 1px ink
stroke, `--grey-300`, `--grey-500`, ink) to show what each pattern paints: Random is scattered,
Noise is clumped, Gradient is a diagonal, and Constant is one flat tint (approved at T1). Attribute
and Blend glyphs are **not designed yet**, and show label-only cells.

## Interaction conventions

| State | Rule |
|---|---|
| Hover | A wash (`--color-hover`) on tertiary buttons, icon buttons, headers, step rows, glyph cells and menu items. Secondary and primary buttons, fields and chips step one grey darker. An icon turns from muted to ink |
| Pressed | One step further: `--color-pressed`, `--color-secondary-pressed`, or an inset ring on primary |
| Selected | Ink fill with white text (segments, width choices, the chosen Radio list row, the edited palette entry), or a white tile with a 2px ink ring (glyph cells, whose artwork is ink). Already chosen items do not react to hover and have `cursor: default` |
| Editing now | The accent: the open operation (edge and index), the active step (number, name and wash), and the preview's selected cells |
| Focus | A 2px `--color-accent` ring, offset 2px; inset on full-width rows |
| Disabled | `--color-disabled`, `cursor: default`, kept in place (never hidden) |
| Warnings and confirmations | Asked or shown only once a value is **committed** (blur, Enter or a drag let go), never while the author is typing, so nothing interrupts them twice. `entry.svelte.ts` knows when an entry is under way; the notice stack and inline advisories hold their last state until it ends. A destructive field asks its Dialog on commit, and only when the value really changed: its `NumericInput` uses `commit="blur"` (Enter or blur commits once; Esc reverts; focus comes back to the field after the Dialog). While it holds a changed value, the field shows "↵ Enter to apply" at its right edge in muted mono. Every field that shapes the grid commits this way, in Grid & size and in a breakpoint rule (rows, columns, cell size), so typing "14" never builds a 1-row grid first. Y offset and the other rule fields follow the typing: their changes are harmless and the live preview helps. A report where part of an action worked (some files attached, some did not) is a failure notice; a Popup is only for a report where nothing happened. An advisory never blocks and never edits the file (**E16**) |
| Explanations | A hint (`ui/Hint`) on the label or control: an ink bubble shown on hover, with `aria-describedby` on the control. Never text in the layout. An explanation too long for a hint, or one a keyboard user needs, goes in an **Explainer popover** behind an "ⓘ" button |
| Secondary actions | They live in a menu when showing them on every row would crowd it (operation reorder and delete). An action used often stays visible (re-seed) |
| Scrolling | `ScrollArea`: the native scrollbar is hidden, and an overlay handle shows while hovered or scrolling. A scrollbar never takes width |
| Width | Nothing in the sidebar sets its width from its content (`minmax(0, 1fr)` columns; long text ellipsizes or wraps) |
| Motion | `--dur-fast` with `--ease`. Sections and groups slide open. Nothing animates under `prefers-reduced-motion` |
| Sticky headers | An open section's header sticks to the top of the sidebar while its body scrolls under it, with its ink rule. It sticks within its own card only, so the next section's header pushes it off; headers never stack. `z-index: 2`: over the body's raised parts (1), under the scroll handle (3) and every fixed popover (20). Groups do not stick |

### Export

Export's main part writes the zip, unchanged: the file and its asset folder together, in one
click (**E14**). JSON on its own is never offered. Image (.png)… opens **Export image**, and the
image follows these rules (Pol, X0):
- It draws the **saved** file, like the zip, never the open draft.
- It uses the file's `defaultSeed` and the **current `loadSalt`**: the load on screen.
- Its width is the chosen size (the file's design width or a breakpoint bound; never the preview's current width), and its
  density is the chosen 1× or 2×, never the machine's DPR. So the same choices give the same PNG
  on any screen.
- It is the box: W × the natural height at W, with the bleed clipped as `overflow: hidden` would.
- Its background is the preview colour or transparent.
- Its name is `tileset-<W>px@<d>x.png`, and its pixels are (W·d) × (H·d).
- A failure opens the existing "Export failed" Popup. Nothing is written on a failure.
- Every size is an offscreen render, not a capture of the preview's canvas (a capture could
  only give the width on screen, at the screen's DPR, with the draft in it).

## Accessibility (WCAG 2.2 AA)

| Decision | WCAG | Notes |
|---|---|---|
| Every enabled pointer target at least `--target-min` (24px). Icon buttons are 28, controls 30 | 2.5.8 | The tile asset delete badge keeps a 16px circle with a 24px hit area. The preview handles have a 24px hit area outside the edge |
| No text under 12px; no uppercase anywhere | 1.4.4, 1.4.12 | Steps 17 / 14 / 13 / 12 |
| Text contrast: ink 18.9:1 on white; muted 6.5:1 on white and 5.5:1 on the ground; accent 6.3:1 on white and 5.4:1 on the ground | 1.4.3 | Disabled (grey-450) is exempt and never carries information |
| Non-text: a field's edge 4.3:1 on white; ink lines; accent rings | 1.4.11 | The fill alone would be too faint to say "type here", so the edge carries it |
| Reflow: one column below 40rem, no sideways scroll at 320 | 1.4.10 | Chips and actions wrap |
| Focus visible everywhere; the menu returns focus to its button after an action | 2.4.7, 2.4.11 | |
| A Split button's parts are separate buttons with separate names ("Export", "More export options"); the chevron is 28×30 | 4.1.2, 2.5.8 | |
| The Radio list's choice shows by its dot (ring vs filled) and the ink row, not by colour alone; it uses native radios, so arrow keys and the group's name come for free | 1.4.1, 1.4.11, 4.1.2 | The ring is ink on the field grey |
| Notices are announced without taking focus: advisories in a polite live region, failures in an assertive one. A failure is told apart by its icon's shape and its words, not by colour alone | 4.1.3, 1.4.1 | Dialogs are modal `<dialog>`s with `role="alertdialog"` |

## Naming

Components are PascalCase nouns (`Section`, `TileGroup`, `TileAsset`, `OperationCard`,
`OperationBody`, `OperationGlyph`, `GlyphGrid`).
- Generic primitives live in `src/lib/ui/`: `Icon`, `IconButton`, `AddBar`, `Collapsible`,
  `FieldRow`, `Hint`, `InlineEdit`, `Toggle`, `Button`, `SplitButton`, `Menu`, `RadioList`, `Popup`, `Dialog`, `Notice`, `Advisory`, `Slider`, `Marquee`,
  `OperationGlyph`, `GlyphGrid`, `ScrollArea`. Alongside them: `icons.ts`, `keys.ts` and
  `motion.ts`.
- Sidebar sections, the top bar and the footer live in `src/lib/sections/`.
- Tile rows live in `src/lib/tiles/`.
- The operation card, body and labels live in `src/lib/operations/`.

Every new `.ts` or `.svelte` file under `src/` needs a page in
`apps/docs/src/content/docs/editor/`, or the docs coverage check fails.
