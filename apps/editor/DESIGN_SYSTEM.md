# Editor design system

The visual language of the tileset editor: **"Ink on paper, with one live accent"**, adopted on
2026-11-06 from the design exploration (iteration 2). Its tokens live in `src/styles/tokens.css`.
For why each choice was made, and what it replaced, see `DESIGN_DIRECTION.md` next to this file.
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
3. **One accent with one meaning.** Ultramarine (`--color-accent`) means **"what you are editing
   now"**: the open operation's edge and index square, its active step, the focus ring, and the
   cells it selects in the preview. Do not use it for anything else. There is no colour for
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
| Colour, primitive | `--white` · `--grey-50 100 200 300 400 450 500 600 800` · `--black` (#111) · `--black-6/10/12` washes · `--ultramarine` (#3340ff) · `--ultramarine-10` · `--red-600` | Only `tokens.css` reads these |
| Colour, surfaces | `--color-ground` (grey-100) · `--color-card` and `--color-panel` (white) · `--color-well` (grey-50) · `--color-field` / `--color-field-hover` · `--color-edge` (grey-500, a field's bottom edge) | A container can reset `--color-field` (white fields in a grey well) |
| Colour, text | `--color-ink` · `--color-muted` (grey-600, 6.5:1 on white) · `--color-disabled` (grey-450) · `--color-paper` | |
| Colour, actions | `--color-primary` / `-hover` / `--color-on-primary` · `--color-secondary` / `-hover` / `-pressed` · `--color-hover` / `--color-pressed` (washes for tertiary, icons and headers) · `--color-selected` / `--color-on-selected` (ink) | |
| Colour, accent | `--color-accent` · `--color-accent-wash` (the active step's row) · `--color-selection` (= accent, the preview's selected and painted cells) · `--color-erase` | |
| Colour, lines | `--color-bar-rule` (ink, under both top bars) · `--color-track` (slider tracks, the stepper line, hairlines) · `--color-grid` · `--color-scrollbar` | |
| Status | `--color-danger` `--color-warn` | Placeholders until Stage 2 (warnings) |
| Font | `--font-ui` (Helvetica, standing in for Neue Haas Grotesk) · `--font-mono` (Roboto Mono 400 and 500, self-hosted via `@fontsource`) | |
| Space | `--space-1…7` = 2 / 4 / 6 / 8 / 10 / 12 / 16 px | 2px base |
| Size | `--control-h` 30 · `--header-h` 52 (a section header) · `--preview-bar-h` 52 (both top bars) · `--group-h` 34 · `--add-h` 32 · `--icon` 16 · `--icon-button` 28 · `--op-index` 24 · `--step-dot` 20 · `--menu-w` 200 · `--thumb` 32 · `--thumb-sm` 16 · `--slider-thumb` 16 · `--glyph-w` 72 · `--glyph-slot` 43 · `--badge` 16 · `--field-label-w` 38% (`-compact` 116px in an operation) · `--width-chip-w` 48 · `--swatch-w` 30 · `--sidebar-w` clamp(400, 30vw, 560) · the preview handle sizes | |
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
  - The sidebar bar (`SidebarTopBar`) holds the document: Undo on the left; New, Import and
    Export (the primary) on the right. It also takes dropped zips.
  - The preview bar holds the width readout, the breakpoints, the grid toggle, the sizes and the
    background swatch.
- **Sidebar body:** the scrolling sections (8px padding, cards 6px apart), then the fixed
  **Randomness** footer card, which never scrolls.
- **Section:** the card header (title, summary while closed, "+" for a list, chevron), then
  content with 12px above and 16px at the sides and below. Each body sets its own row gap.
- **Reports after an action** (a refused import, a failed export) open in a `Popup` and never take
  space in the layout.
- **Reflow:** below `40rem` the columns stack; only then does the page scroll.
- **Every grid in the sidebar** names its column (`minmax(0, 1fr)`).

## Component patterns

| Pattern | Anatomy | Where it appears |
|---|---|---|
| **Section** (`Section` + `Collapsible variant="section"`) | A white card. Its 52px header has the title in `.t-section`, and under it, while closed, a one-line `.t-console` summary. On the right sit an optional "+" (`onAdd`, which also opens the section) and the chevron in a grey 28px square. Open, a 2px ink rule runs under the header. The whole header washes on hover. Section selectors are scoped to the section's own heading, so they never leak into nested groups | Grid & size, Breakpoints, Derived, Tiles, Operations |
| **Group** (`Collapsible variant="group"`) | A grey well. A 34px header with the title in `.t-title`, the summary on the same line, actions, then the chevron | Breakpoint rule, tile group |
| **Field row** | A muted `.t-label` in a fixed label column (`--field-label-w`), then the control. An explanation is a hint on the label, never text in the row | Numeric and boolean inputs, operation params, the seed |
| **Input** | A filled box (`--color-field`), radius 6, with a 1px `--color-edge` bottom edge. The value is in `.t-value` (mono). Hover darkens the fill a step | Numeric inputs, the seed, the palette's select |
| **Segmented control** (`Toggle`) | A grey track with equal segments. The chosen one is ink with white text | Alignment, Assets on load, enum params, the preview's sizes |
| **Button** | `primary` (ink, one per area), `secondary` (grey fill), `tertiary` (text, a wash on hover). 30px tall, radius 6, `.t-xs`. An optional leading `icon` | Export, Save/Add, Undo, New, Import, Reroll assets, Discard |
| **Icon button** | A 28px square, with a 16px icon muted at rest. It turns ink on a wash under the pointer. `strong` keeps it ink at rest (re-seed) | Re-seed, trash, close, reorder |
| **Menu** | An icon button (`more`) that opens a floating list (`--shadow-float`) of icon plus label items. It follows the WAI-ARIA menu button pattern. Focus returns to the button after an action | An operation's Move earlier, Move later and Delete |
| **Add row** | `+` and a label, tertiary. The square variant is a 32px grey "+" | Add breakpoint, tile group, operation; add a tile |
| **Tile group / tile asset** | A well with up to four 16px thumbnails in the header. Each row is a 32px thumbnail, a slider (4px track, 16px round ink thumb) and the % in mono. "+" and Reset weights at the foot | Tiles |
| **Operation card** (`OperationCard`) | A grey well, collapsed:<br>1. a 24px ink index square;<br>2. the title, which is what it writes: the attribute in `.t-title`, then palette thumbnails and names, or the range in mono;<br>3. re-seed and a menu;<br>4. a row of step chips (Selection, Source, Blend), each a muted step name and a mono answer, on white, wrapping. Each chip opens its step; the title opens Attribute.<br>Open, the card is white with a 3px accent edge and an accent index, and holds the stepper | Operations |
| **Operation stepper** (`OperationBody`) | Four rows joined by a vertical line. Each row is a 20px number, the step name in `.t-title`, and the answer in mono. The number is hollow when unanswered, ink when answered, and accent while active (the active row also gets the accent wash). The active step unfolds under its row: the question, a glyph grid, then the chosen option's fields in a grey well under a muted caption. The card ends, under a hairline, with Discard, **Next: <step>** and Save/Add | Operations, open |
| **Glyph grid** | Cells at `--glyph-w` or wider (`auto-fill`): a mono label over a 43px artwork slot. Hover washes; selected is a white tile with a 2px ink ring | Operation step options |
| **Popup** | A white panel, radius 12, `--shadow-float`, with no frame or black title bar | Reports, unsaved-changes question |
| **Width choices, swatch** | Segments on a white track in the preview bar; the chosen one is ink. The swatch is a 30px rounded square with an edge | Preview top bar |
| **Footer: Randomness** | A white card with a `.t-title` heading. It holds the seed field and a strong re-seed button; Assets on load; then Reroll assets and Preview a fresh load as two secondary buttons with the re-seed icon | Sidebar foot |

### Icons (`src/lib/ui/icons.ts`)

There is one outline family, made of Lucide paths (ISC licence). They are drawn on a 24-unit
grid, rendered at 16px with a 1.5px stroke and round caps and joins, in `currentColor`.
- The set: `fold`, `up`, `down`, `plus`, `close`, `trash`, `reseed`, `undo`, `import`, `export`,
  `new`, `more`, `check`.
- An icon names an action, sits beside a word or inside a named control, and is never
  decorative.
- Add an icon only in the same family and grid.

### Operation glyphs

A glyph cell has a fixed frame: a mono label over a **43×43 artwork slot**. What fills the slot
is supplied per option, as an image (`src`) or as markup (an `artwork` snippet). Artwork uses ink
and paper only, with 1px strokes.

**Selection** glyphs are SVG files exported from Figma, in `src/assets/glyphs/selection/` (`all`,
`checkered`, `every-nth`, `random`, `rect`, `handpick`): 4×4 cells, with 10px cells at an 11px
pitch. All and Checkered were written by hand in the same geometry. Attribute, Source and Blend
glyphs are **not designed yet**, and show label-only cells.

## Interaction conventions

| State | Rule |
|---|---|
| Hover | A wash (`--color-hover`) on tertiary buttons, icon buttons, headers, step rows, glyph cells and menu items. Secondary and primary buttons, fields and chips step one grey darker. An icon turns from muted to ink |
| Pressed | One step further: `--color-pressed`, `--color-secondary-pressed`, or an inset ring on primary |
| Selected | Ink fill with white text (segments, width choices, the edited palette entry), or a white tile with a 2px ink ring (glyph cells, whose artwork is ink). Already chosen items do not react to hover and have `cursor: default` |
| Editing now | The accent: the open operation (edge and index), the active step (number, name and wash), and the preview's selected cells |
| Focus | A 2px `--color-accent` ring, offset 2px; inset on full-width rows |
| Disabled | `--color-disabled`, `cursor: default`, kept in place (never hidden) |
| Explanations | A hint (`ui/Hint`) on the label or control: an ink bubble shown on hover, with `aria-describedby` on the control. Never text in the layout |
| Secondary actions | They live in a menu when showing them on every row would crowd it (operation reorder and delete). An action used often stays visible (re-seed) |
| Scrolling | `ScrollArea`: the native scrollbar is hidden, and an overlay handle shows while hovered or scrolling. A scrollbar never takes width |
| Width | Nothing in the sidebar sets its width from its content (`minmax(0, 1fr)` columns; long text ellipsizes or wraps) |
| Motion | `--dur-fast` with `--ease`. Sections and groups slide open. Nothing animates under `prefers-reduced-motion` |

## Accessibility (WCAG 2.2 AA)

| Decision | WCAG | Notes |
|---|---|---|
| Every enabled pointer target at least `--target-min` (24px). Icon buttons are 28, controls 30 | 2.5.8 | The tile asset delete badge keeps a 16px circle with a 24px hit area. The preview handles have a 24px hit area outside the edge |
| No text under 12px; no uppercase anywhere | 1.4.4, 1.4.12 | Steps 17 / 14 / 13 / 12 |
| Text contrast: ink 18.9:1 on white; muted 6.5:1 on white and 5.5:1 on the ground; accent 6.3:1 on white and 5.4:1 on the ground | 1.4.3 | Disabled (grey-450) is exempt and never carries information |
| Non-text: a field's edge 4.3:1 on white; ink lines; accent rings | 1.4.11 | The fill alone would be too faint to say "type here", so the edge carries it |
| Reflow: one column below 40rem, no sideways scroll at 320 | 1.4.10 | Chips and actions wrap |
| Focus visible everywhere; the menu returns focus to its button after an action | 2.4.7, 2.4.11 | |

## Naming

Components are PascalCase nouns (`Section`, `TileGroup`, `TileAsset`, `OperationCard`,
`OperationBody`, `OperationGlyph`, `GlyphGrid`).
- Generic primitives live in `src/lib/ui/`: `Icon`, `IconButton`, `AddBar`, `Collapsible`,
  `FieldRow`, `Hint`, `InlineEdit`, `Toggle`, `Button`, `Menu`, `Popup`, `Slider`, `Marquee`,
  `OperationGlyph`, `GlyphGrid`, `ScrollArea`. Alongside them: `icons.ts`, `keys.ts` and
  `motion.ts`.
- Sidebar sections, the top bar and the footer live in `src/lib/sections/`.
- Tile rows live in `src/lib/tiles/`.
- The operation card, body and labels live in `src/lib/operations/`.

Every new `.ts` or `.svelte` file under `src/` needs a page in
`apps/docs/src/content/docs/editor/`, or the docs coverage check fails.
