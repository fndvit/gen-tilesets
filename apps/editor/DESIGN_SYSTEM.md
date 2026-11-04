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
| Colour, primitive | `--black` `--white` `--grey-200` `--grey-100` `--aqua-50` `--magenta` | Only `tokens.css` reads these |
| Colour, semantic | `--color-ink` `--color-paper` `--color-surface` `--color-bar` `--color-on-bar` `--color-inactive` `--color-rule` `--color-grid` `--color-seed` | Components read these. Declared on `:root, .theme-default`; `.theme-inverted` swaps ink/paper and bar/on-bar (see Layout) |
| Status | `--color-danger` `--color-warn` | Placeholders until Stage 2 (warnings) |
| Font | `--font-ui` (Helvetica, standing in for Neue Haas Grotesk Display) · `--font-mono` (Roboto Mono, self-hosted via `@fontsource`) | |
| Space | `--space-1…6` = 2 / 4 / 6 / 8 / 10 / 12 px | 2px base |
| Size | `--bar-h-section` 25 · `--bar-h-group` 24 · `--bar-h-add` 28 · `--op-header-h` 40 · `--thumb` 32 · `--thumb-sm` 14 · `--icon` 12 · `--icon-add` 18 · `--field-w` 106 · `--slider-thumb-*` 10×20 · `--glyph-w/h` 75×60 · `--glyph-cell` 10 · `--glyph-gap` 1 · `--glyph-slot` 43 · `--glyph-cols` 5 · `--chip-gap` 9 · `--console-pad-y` 3 · `--sidebar-w` clamp(360, 28vw, 520) | |
| Border | `--rule` (1px in `--color-rule`, declared with each theme) · `--radius` 0 · `--radius-xs` 1px (glyph cells only) | |
| Focus | `--focus-w` 2 · `--focus-offset` 1 | |
| Motion | `--dur-fast` 120ms · `--ease` · `--marquee-speed` 40px/s | Respects `prefers-reduced-motion` |

## Typography (`src/styles/type.css`)

Each Figma text style becomes one class. `type.css` holds only these classes and the font, so a
page outside the editor (the docs stories) can load it without `base.css`'s global focus ring.
`base.css` imports it. Every class trims the text box to cap height, as
Figma does (`text-box: trim-both cap alphabetic`, with `line-height: 1` as the fallback).

| Class | Figma style | Spec | Used for |
|---|---|---|---|
| `.t-section` | Section Header | 24 · Medium · UPPER | Section bar titles, operation index |
| `.t-label` | UI small UC | 20 · Roman · UPPER | Field labels, group titles, weight % |
| `.t-body` | UI regular | 14 · Light | Step questions, running text |
| `.t-xs` | UI XS Bold | 10 · Medium · UPPER | Chips, tabs, small buttons |
| `.t-console` | Console | Roboto Mono 10 · Medium · +2% | Operation summary, glyph labels |

## Layout

- **Page:** two columns at full viewport height (`100dvh`), sidebar (`--sidebar-w`) and preview
  (`minmax(0, 1fr)`). No header. The page never scrolls; each column scrolls its own content.
- **Sidebar:** a 1px ink frame on `--color-surface`, split into `.scrollable` (the sections,
  stacked with no gap) and `.fixed` (a black footer that never scrolls or collapses).
- **Section:** a bar (`--bar-h-section`, 4px padding inside it, `border-box`) followed by
  content. Content has 6px padding plus a 4px inner slot (`Section.svelte`); each body sets its
  own row gap.
- **Inverted block:** `.theme-inverted` on a container makes every primitive inside render white
  on black with no style of its own (the sidebar footer). `.theme-default` restores the page
  inside one (a popup opened from the footer).
- **Reports after an action** (a refused import, a failed export) open in a `Popup` and never
  take space in the layout.
- **Rows:** 8px apart in a field list, 4px apart in lists of bars.

## Component patterns

| Pattern | Anatomy | Where it appears |
|---|---|---|
| **Bar** | Black, white text and icons, 4px padding, title on one side and a chevron on the other | Section header, tile group header, add bar, step tabs |
| **Field row** | `.t-label` label on the left, control on the right, aligned to the bottom. No explanatory text in the row: an explanation is a `hint`, shown on hovering the label | Numeric and boolean inputs, operation params |
| **Numeric input** | Field row whose control is a `--field-w` underline (1px ink bottom rule) as long as the input. Half-typed text looks the same as committed text | Cell size, rows, Y offset |
| **Boolean / choice input** | Field row whose control is a set of chips: 1px ink border, 4px padding, `.t-xs`, `--chip-gap` apart. Selected = filled ink | Alignment, enum params |
| **Button** | A text action in the chip look: 1px border, 4px padding, `.t-xs`, hover inverts. Never stays filled. `wide` fills its container | Undo, Import, New, Download, Close, Change it / Cancel |
| **Popup** | Native modal `<dialog>`: black `.t-section` title bar, paper body, Close button, 1px ink frame. Esc closes | Import and export reports |
| **Add bar** | Full-width black bar (`--bar-h-add`) with a centred 18px "+". The square variant is 32×32 | Add tile group, add operation, add tile |
| **Tile group** | Group bar (trash, title editable on click, then up to 4 thumbnails at 14px and the chevron) above a white body with a 1px ink border holding tile asset rows | Tiles section |
| **Tile asset** | 32px thumbnail · slider (1px track, 10×20 block thumb) · `.t-label` % (46px wide, right-aligned), 6px gap | Group body |
| **Operation header** | Black index cell · icon column (delete, re-seed in seed colour) · console strip above the tab row · icon column (up/down). 40px tall | Operations section |
| **Console strip** | `.t-console` on `--color-inactive` with a 1px ink border and 3px vertical padding. Scrolls right to left only when it overflows | Operation summary |
| **Tab row** | Equal-width black tabs in `.t-xs`. Active = paper with ink text | Operation steps |
| **Glyph grid** | `--glyph-cols` cells per row, 4px apart: a `.t-console` label above a `--glyph-slot` artwork slot (any iconography; see below). Selected and hover = `--color-inactive` fill with a 1px border | Operation step options |

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
| Hover, on a bar | Text and icons dim to `--color-inactive` |
| Hover, on a paper chip | Invert (ink fill, paper text) |
| Hover, on a glyph cell | Same as selected: `--color-inactive` fill and a 1px ink border. Never inverted, which would sink ink artwork into an ink fill |
| Hover, on a seed control | No change. The seed colour is a meaning, not a state |
| Explanations | A `hint` on the label: an ink bubble with paper `.t-body` text (`--hint-w` at most) under the label, shown at once on hovering the label, and the control's `aria-describedby`. Never as text in the layout, never a native `title` |
| Selected | Invert (chips, tabs), or `--color-inactive` fill with a border (glyphs) |
| Focus | 2px outline in `--color-ink`, 1px offset. Inside `.on-bar` the outline is `--color-on-bar`. Underline fields (numeric input, inline edit) never get the ring: their underline thickens to `--focus-w` instead |
| Disabled | `--color-inactive` and `cursor: default`. Stays in place (never hidden) |
| Seed / random | `--color-seed`, always |
| Motion | `--dur-fast` with `--ease`. Nothing animates under `prefers-reduced-motion` |

## Naming

Components are PascalCase nouns that match the Figma component names (`SectionHeader`,
`NumericInput`, `TileGroup`, `TileAsset`, `OperationHeader`, `OperationGlyph`, `GlyphGrid`).
Generic primitives live in `src/lib/ui/`: `Icon`, `IconButton`, `AddBar`, `Collapsible`,
`FieldRow`, `InlineEdit`, `Toggle`, `Button`, `Popup`, `Slider`, `Marquee`, `TabBar`, `OperationGlyph`, `GlyphGrid`, with icon
path data in `icons.ts` and keyboard arithmetic in `keys.ts`. Sidebar sections built from them
live in `src/lib/sections/`. Every new `.ts` or `.svelte` file under `src/` needs a
page in `apps/docs/src/content/docs/editor/`, or the docs coverage check fails.
