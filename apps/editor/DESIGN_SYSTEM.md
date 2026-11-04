# Editor design system

The visual language of the tileset editor. It was extracted from the Figma file
**Tileset Creator Editor** (`VCp0HyxbLOBq0vOkpDWmIL`, page *Editor*), and its tokens live in
`src/styles/tokens.css`. Read this before building or restyling any editor component.

## Principles

1. **Black on white, with inversion as hierarchy.** Structure comes from solid black bars carrying
   white uppercase text, set on paper or on the pale aqua sidebar surface. Emphasis and selection
   are shown by inverting colours. There are no radii, shadows or gradients.
2. **One accent with one meaning.** Magenta (`--color-seed`) marks anything non-deterministic:
   re-seed, reroll, or a stochastic source. Do not use it for anything else.
3. **Tokens only.** Components never contain raw hex values, px sizes for type, or ad-hoc spacing.
   If a value is missing, add a token here first.
4. **Reuse before inventing.** Every new control is a composition of the patterns below. A new
   pattern should only be added here after it is agreed.

## Tokens (`src/styles/tokens.css`)

| Group | Tokens | Notes |
|---|---|---|
| Colour, primitive | `--black` `--white` `--grey-100` `--grey-200` `--grey-500` `--grey-600` `--grey-700` `--aqua-50` `--magenta` `--blue-500` `--red-600` | Only `tokens.css` reads these |
| Colour, semantic | `--color-ink` `--color-paper` `--color-surface` `--color-bar` `--color-on-bar` `--color-inactive` `--color-rule` `--color-grid` `--color-seed` `--color-scrollbar` `--color-pressed` `--color-on-pressed` | Components read these. Declared on `:root, .theme-default`; `.theme-inverted` swaps ink/paper and bar/on-bar, and sets `--color-inactive` to `--grey-700` so disabled dims on black (see Layout) |
| Colour, preview chrome | `--color-muted` (secondary text, 7:1) · `--color-selection` (selected / painted cells) · `--color-erase` (a stroke that removes) · `--color-frame` (the frame's dashed edge and width handles) | Overlays mix them with `color-mix(… transparent)`. Colours that belong to the picture (the white backdrop) stay named constants |
| Status | `--color-danger` `--color-warn` | Placeholders until Stage 2 (warnings) |
| Font | `--font-ui` (Helvetica, standing in for Neue Haas Grotesk Display) · `--font-mono` (Roboto Mono, self-hosted via `@fontsource`) | |
| Space | `--space-1…6` = 2 / 4 / 6 / 8 / 10 / 12 px | 2px base |
| Size | `--target-min` 24 · `--icon-seed` 18 (re-seed, in a `--control-h` box) · `--control-h` 28 · `--bar-h-section` 32 · `--bar-h-group` 32 · `--bar-h-add` 32 · `--op-header-h` 56 · `--thumb` 32 · `--thumb-sm` 14 · `--icon` 12 · `--icon-add` 18 · `--field-w` 106 · `--slider-thumb-*` 12×24 · `--glyph-w/h` 75×60 (75 = narrowest cell) · `--glyph-cell` 10 · `--glyph-gap` 1 · `--glyph-slot` 43 · `--chip-gap` 9 · `--console-pad-y` 3 · `--badge` 16 · `--handle-w` 9 · `--asset-gap` 10 · `--share-w` 46 · `--sidebar-w` clamp(400, 30vw, 560) | Block F sizes; see Accessibility |
| Border | `--rule` (1px in `--color-rule`, declared with each theme) · `--radius` 0 · `--radius-xs` 1px (glyph cells only) · `--radius-round` 50% (delete badge only) | |
| Focus | `--focus-w` 2 · `--focus-offset` 1 | |
| Motion | `--dur-fast` 120ms · `--ease` · `--marquee-speed` 40px/s | Respects `prefers-reduced-motion` |

## Typography (`src/styles/type.css`)

Each Figma text style becomes one class. `type.css` holds only these classes and the font, so a
page outside the editor (the docs stories) can load it without `base.css`'s global focus ring.
`base.css` imports it. Every class trims the text box to cap height, as
Figma does (`text-box: trim-both cap alphabetic`, with `line-height: 1` as the fallback).

| Class | Figma style | Spec | Used for |
|---|---|---|---|
| `.t-section` | Section Header | 20 · Medium · UPPER (Figma 24) | Section bar titles, operation index |
| `.t-label` | UI small UC | 16 · Roman · UPPER (Figma 20) | Field labels, group titles, weight % |
| `.t-body` | UI regular | 14 · Light | Step questions, running text |
| `.t-xs` | UI XS Bold | 12 · Medium · UPPER (Figma 10) | Chips, tabs, small buttons |
| `.t-console` | Console | Roboto Mono 12 · Medium · +2% (Figma 10) | Operation summary, glyph labels |

## Layout

- **Page:** two columns at full viewport height (`100dvh`), sidebar (`--sidebar-w`) and preview
  (`minmax(0, 1fr)`). No header. The page never scrolls; each column scrolls its own content.
- **Sidebar:** a 1px ink frame on `--color-surface`, split into `.scrollable` (the sections,
  stacked with no gap) and `.fixed` (a black footer that never scrolls or collapses).
- **Section:** a bar (`--bar-h-section`, 2px padding and a 1px frame inside it, `border-box`) followed by
  content. Content has 6px padding plus a 4px inner slot (`Section.svelte`); each body sets its
  own row gap.
- **Inverted block:** `.theme-inverted` on a container makes every primitive inside render white
  on black with no style of its own (the sidebar footer). `.theme-default` restores the page
  inside one (a popup opened from the footer).
- **Reports after an action** (a refused import, a failed export) open in a `Popup` and never
  take space in the layout.
- **Rows:** 8px apart in a field list, 4px apart in lists of bars.
- **Reflow:** below `40rem` of viewport width (a 320px window, or 1280px at 200% zoom) the two
  columns stack: the sidebar fills the screen and scrolls on its own, the preview follows, and
  only then does the page scroll.
- **Every grid in the sidebar** names its column (`minmax(0, 1fr)`), the aside and the footer
  included.

## Component patterns

| Pattern | Anatomy | Where it appears |
|---|---|---|
| **Bar** | Black, white text and icons, 4px padding. A section or group bar has the chevron first, then the title; any action (trash) sits at the right end with an extra 8px margin, clear of the overlay scroll handle (Pol, Block E review) | Section header, tile group header, add bar, step tabs |
| **Field row** | `.t-label` label on the left, control on the right, aligned to the bottom. No explanatory text in the row: an explanation is a `hint`, shown on hovering the label | Numeric and boolean inputs, operation params |
| **Numeric input** | Field row whose control is a `--field-w` underline (1px ink bottom rule) as long as the input. Half-typed text looks the same as committed text | Cell size, rows, Y offset |
| **Boolean / choice input** | Field row whose control is a set of chips: 1px ink border, `--control-h` tall with 8px side padding, `.t-xs`, `--chip-gap` apart. Selected = filled ink | Alignment, enum params |
| **Button** | A text action in the chip look: 1px border, `--control-h` tall, 8px side padding, `.t-xs`, hover inverts. Never stays filled. `wide` fills its container | Undo, Import, New, Download, Close, Change it / Cancel |
| **Popup** | Native modal `<dialog>`: black `.t-section` title bar, paper body, Close button, 1px ink frame. Esc closes | Import and export reports |
| **Add bar** | Full-width black bar (`--bar-h-add`, 32px) with a centred 18px "+". The square variant is 32×32 | Add tile group, add operation, add tile |
| **Tile group** | Group bar (chevron, title editable on click, up to 4 thumbnails at 14px, then trash at the right end) above a white body with a 1px ink border holding tile asset rows | Tiles section |
| **Tile asset** | 32px thumbnail · slider (1px track, 12×24 block thumb) · `.t-label` % (46px wide, right-aligned), 6px gap. Rows 10px apart, body padding 4px inside the frame | Group body |
| **Delete badge** | A `--badge` (16px) ink circle with a white 6px cross and a 24px hit area (`::before`), 4px out from a thumbnail's top-right corner. Shown on row hover or focus-within, focusable while hidden; disabled = `--color-inactive`. The one round shape and the one control hidden at rest (Pol, Block D) | Tile asset |
| **Operation header** | Black index cell · icon column (delete, re-seed in seed colour) · console strip above the tab row · icon column (up/down). 56px tall, two 24px icon targets per column | Operations section |
| **Console strip** | `.t-console` on `--color-inactive` with a 1px ink border and 3px vertical padding. Scrolls right to left only when it overflows | Operation summary |
| **Tab row** | Equal-width black tabs in `.t-xs`. Active = paper with ink text | Operation steps |
| **Glyph grid** | As many cells per row as fit at `--glyph-w` or wider (`auto-fill`), 4px apart: a `.t-console` label above a `--glyph-slot` artwork slot (any iconography; see below). Selected and hover = `--color-inactive` fill with a 1px border | Operation step options |
| **Operation body** | Paper, `--rule` frame without a top border, 6px padding, 8px between parts: a `.t-body` question, a glyph grid, then field rows. Ends in a right-aligned row of `Button`s: Discard, then **Next: <step>** while a step is unanswered (it goes to the first unanswered step after this one), then Save (Add for a new one). A disabled Save has a hint naming the unanswered steps. **Fields are compact** inside it: the body sets `--label-size: var(--text-body-size)`, `--label-case: none`, `--field-label-w: var(--field-label-w-compact)` (128px) and `--field-justify: flex-start`, so labels are 14px sentence case in a column and each control sits right after its label | Operations section, under the open header |
| **Question popup** | A `Popup` whose `actions` replace Close with the choices (Keep editing, Discard) | Switching away from an open operation with unsaved changes |

### Operation glyphs

A glyph cell has a fixed frame: a `.t-console` label above a **43×43 artwork slot**, with the
selected, hover and focus states listed above. **What goes in the slot is not fixed.** Each step
can use whatever iconography suits its options, as long as it keeps the shared language: ink and
paper only, 1px strokes, a 1px radius at most, and no other colours. The one exception is
`--color-seed` for something non-deterministic.

The artwork is supplied per option, as an image (`src`) or as markup (an `artwork` snippet), so a
new kind of glyph needs no change to the cell.

#### Selection: SVG artwork from Figma

Selection glyphs are **SVG files exported from Figma**, in `src/assets/glyphs/selection/`
(`all`, `checkered`, `every-nth`, `random`, `rect`, `handpick`). They are 43×43 and draw 4×4
cells: 10px cells at an 11px pitch, a 1px ink stroke, a 1px radius, and filled ink or paper.
Handpick adds a cursor at the bottom right. Every Nth, Random, Rect and Handpick are the Figma
exports unchanged. All and Checkered are frames, not vectors, in Figma, so they were written by
hand in the same geometry. The cell shows them with `<img>` (`OperationGlyph src`).

Attribute, Source and Blend glyphs are **not designed yet**, and they may use a different kind of
iconography. Until they are designed, their grids show label-only cells.

## Interaction conventions

| State | Rule |
|---|---|
| Hover, on a black bar that acts | **Invert**: the bar turns paper with ink content and a 1px ink frame (add bars, square "+", step tabs) |
| Hover, on a header bar | **No inversion** (Pol, Block F review). Section and tile group bars stay black; the chevron and title dim to `--color-inactive`, an editable title underlines, the trash shows its frame |
| Hover, on a paper chip or button | Invert (ink fill, paper text) |
| Pressed (`:active`) | Add bars, tabs, chips, buttons, the delete badge: `--color-pressed` fill with `--color-on-pressed` text. Glyph cells and palette segments: the frame thickens to `--focus-w`, drawn inside. Icon buttons: their hover frame thickens. Sliders and palette segments: `grabbing` |
| Hover, on an icon button | A 1px frame in the icon's own colour round its 24px box, so a seed button keeps its magenta |
| Hover, on an editable title | Underline (it would vanish if dimmed on the inverted bar) |
| Already chosen | A selected chip or glyph and the active tab do not change on hover and have `cursor: default`: choosing them again does nothing |
| Cursors | `pointer` for actions, `text` for fields and editable titles, `grab` / `grabbing` for sliders and palette segments, `help` for hint anchors, `default` for disabled and already chosen |
| Hover, on a glyph cell | Same as selected: `--color-inactive` fill and a 1px ink border. Never inverted, which would sink ink artwork into an ink fill |
| Hover, on an underline field or a slider | The underline (or track) thickens to `--focus-w`, as on focus. Numeric inputs, the seed field, the palette's tile select, sliders and the numeric mapping track |
| Hover, on a palette segment | Same as selected: `--color-inactive` fill |
| Explanations | A hint (`ui/Hint`; `--hint-top/bottom/left/right` place the bubble) on the label, thumbnail or title: an ink bubble with paper `.t-body` text (`--hint-w` at most) under the label, shown at once on hovering the label, and the control's `aria-describedby`. Never as text in the layout, never a native `title`. The anchor has `cursor: help`, so the pointer says a hint is there |
| Selected | Invert (chips, tabs), or `--color-inactive` fill with a border (glyphs) |
| Focus | 2px outline in `--color-ink`, 1px offset. Inside `.on-bar` the outline is `--color-on-bar`. Underline fields (numeric input, inline edit) never get the ring: their underline thickens to `--focus-w` instead |
| Disabled | `--color-inactive` and `cursor: default`. Stays in place (never hidden) |
| Scrolling | The sidebar and the preview column scroll in a `ScrollArea`: the native scrollbar is hidden and a `--scrollbar-w` mid-grey handle (`--color-scrollbar`) is drawn over the content, shown while hovered, scrolling or dragged. A scrollbar never takes width (Pol, Block E review) |
| Width | Nothing in the sidebar may set its width from its content. A grid that stacks rows uses `grid-template-columns: minmax(0, 1fr)`, never the implicit `auto` column, which grows to the widest content (a long summary pushed the sidebar 413px wide). `Marquee` has `contain: inline-size` |
| Seed / random | `--color-seed`, always |
| Motion | `--dur-fast` with `--ease`. Sections and tile groups slide open and closed (`Collapsible`, `slide`). Nothing animates under `prefers-reduced-motion`: CSS through `base.css`, JavaScript transitions through `ui/motion.ts` |

## Accessibility (WCAG 2.2 AA, Block F)

Pol delegated the sizes to accessibility (2026-11-04). Where these override Figma, the Figma value
is in brackets.

| Decision | WCAG | Notes |
|---|---|---|
| Every pointer target at least `--target-min` (24px) square: icon buttons, the chevron, the editable title, underline fields (padding above the digits), slider thumbs (12×24 [10×20]), the delete badge's hit area | 2.5.8 Target size (minimum) | Chips and buttons go further, to `--control-h` 28px [≈17], because Pol found them too small. The preview's 9px width handles pass by the spacing exception (nothing else to hit within 24px) and have arrow keys |
| Bars 32px [25 / 24 / 28], operation header 56px [40] | 2.5.8 | Room for 24px targets inside the bar's padding. Re-seed is larger still: a 28px box with an 18px icon [12] (Pol) |
| Bar titles are untrimmed with `--leading-title` 1.2 | 1.4.12 Text spacing | A cap-trimmed box with `overflow: hidden` (for the ellipsis) clipped the tops of letters (Pol) |
| Type: section 20 [24], label 16 [20], body 14, chips and tabs 12 [10], console 12 [10] | 1.4.4 Resize text, 1.4.12 | No content text below 12px; steps 20/16/14/12 stay distinct by size, case and weight. Pol found some text too big and some too small |
| Sidebar `clamp(400px, 30vw, 560px)` [477 at 1728] | 1.4.10 Reflow | The glyph grid reflows (`auto-fill`); below 40rem the page stacks into one column, so nothing scrolls sideways at 320px |
| Text contrast: ink on paper, aqua and `--color-inactive` ≥ 15:1; paper on ink 21:1; `--color-muted` 7:1; `--color-on-pressed` on `--color-pressed` 8.5:1 | 1.4.3 Contrast (minimum) | `--color-inactive` (1.3:1 on paper) only marks disabled controls, which are exempt, never information |
| Non-text contrast: magenta on paper 3.5:1, on aqua 3.1:1, on black 6:1; the preview frame grey 3.9:1; focus ring ink on paper / paper on bars | 1.4.11 Non-text contrast | Magenta is never used for text |
| In `.theme-inverted`, `--color-inactive` is `--grey-700` | 1.4.11 / clarity | Light grey on black looked enabled |
| Focus: 2px ring everywhere; underline fields thicken instead | 2.4.7, 2.4.11 | The 6px overlay scroll handle can cover only part of a ring. The sticky preview notices go away with Stage 2's pop-ups |

## Naming

Components are PascalCase nouns that match the Figma component names (`SectionHeader`,
`NumericInput`, `TileGroup`, `TileAsset`, `OperationHeader`, `OperationBody`, `OperationGlyph`, `GlyphGrid`).
Generic primitives live in `src/lib/ui/`: `Icon`, `IconButton`, `AddBar`, `Collapsible`,
`FieldRow`, `Hint`, `InlineEdit`, `Toggle`, `Button`, `Popup`, `Slider`, `Marquee`, `TabBar`, `OperationGlyph`, `GlyphGrid`, `ScrollArea`, with icon
path data in `icons.ts`, keyboard arithmetic in `keys.ts` and transition durations in `motion.ts`. Sidebar sections built from them
live in `src/lib/sections/`, the tile group and tile asset rows in `src/lib/tiles/`, and the operation header, body and display labels (`labels.ts`) in `src/lib/operations/`. Every new `.ts` or `.svelte` file under `src/` needs a
page in `apps/docs/src/content/docs/editor/`, or the docs coverage check fails.
