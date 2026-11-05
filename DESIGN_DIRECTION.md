# Design direction 3 — "Inspector"

Branch `exploration/design-direction-3`. Run it from `apps/editor` with
`pnpm exec vite --port 5203 --strictPort`.

## Design concept

The sidebar is treated as a professional **property inspector**: Figma's right panel, Ableton's
device view, Blender's properties editor. Those tools show far more controls than this editor in
the same space and still read calmly, and the reason is not decoration. It is that **every row
follows the same micro-structure**: a 28px box, a short label, a value, a 1px divider between
groups, and actions in the header of the thing they act on.

So this direction carries hierarchy by **density and structure**, not by fills (direction 1) or by
type and rhythm (direction 2):

- One panel, white, no cards and no black slabs. A section is a 32px header row and a body, closed
  by a 1px divider.
- Inside a section, values are **boxed fields in a 2-column grid** with the label inside the box
  ("Cell size 25 px", "Rows 14"). The eye scans a column of values, not a list of rows.
- Nested things (a breakpoint rule, a tile group, an operation's body) are **indented list rows
  with a disclosure triangle**, not framed boxes. The indent is the grouping.
- Actions live **in the header row** of what they act on: the "+" that adds a rule, a tile group
  or an operation is an icon button beside the section title; reorder and delete sit at the right
  end of each rule, group and operation row.
- A strict **ink-role map**: the same grey always means the same job, everywhere.

The aim is that Grid & Size, Breakpoints and a full tile group fit on one screen, and that adding
more controls later (Stage 2's warnings, more parameters) costs one more 28px row each, not
another heavy block.

## Visual hierarchy

Hierarchy has four levels, and each is told apart by **position and weight**, never by size jumps
or colour:

| Level | What | How it reads |
|---|---|---|
| 1 | Section (Grid & Size, Tiles…) | 32px row, 13 semibold ink-900, triangle hanging in the 16px gutter, divider below the section. Sticky while its body scrolls. |
| 2 | Nested group (Rule 1, a tile group, an operation) | 28px row, 13 medium ink-900, one 24px indent in (the triangle's column). Actions at the right in the label grey. |
| 3 | Fields | 28px boxes, label 12 regular ink-600 inside, value mono 12 ink-900. |
| 4 | Annotations | Units, summaries, empty states: 12 regular in ink-600/500. |

What draws the eye is decided by the role map, not by layout: **black** appears only where
something is selected or is the primary action (a chosen segment, the open step tab, Grid on,
Download, Save). In any one view there are a handful of black shapes, and each means "this one".

A closed section is no longer silent (problem 8): its header shows a one-line summary of what it
holds, from existing values only ("25 px cells · 14 rows · 720 wide", "1 rule", "29 columns ·
725 × 350 px", "5 groups · 16 variants", "4 operations"). A closed rule shows its overrides
("max width 500 · rows 14 · columns 9").

## Color system

Monochrome, with each step bound to one job. Magenta stays the only accent and means only
"non-deterministic". The preview overlay blue/red are unchanged.

| Token (primitive) | Hex | Role (semantic token) | Contrast |
|---|---|---|---|
| `--ink-900` | `#161616` | values, titles, body text (`--color-ink`) | 18.1:1 on white, 16.5:1 on field fill |
| `--ink-700` | `#3d3d3d` | primary button hover (`--color-primary-hover`) | white on it 11:1 |
| `--ink-600` | `#5c5c5c` | labels, secondary readouts, icon buttons, control edge on hover (`--color-label`, `--color-rule-hover`, `--color-primary-pressed`) | 6.7:1 on white, 6.1:1 on field fill |
| `--ink-500` | `#6b6b6b` | units, placeholders, empty states (`--color-placeholder`) | 5.3:1 on white, 4.9:1 on field fill |
| `--grey-400` | `#8a8a8a` | control edges: field, segmented, button, slider track (`--color-rule`) | 3.5:1 on white, 3.1:1 on field fill (non-text ≥ 3:1) |
| `--grey-300` | `#c4c4c4` | disabled text, icons and edges (`--color-disabled`) | 1.7:1 — deliberately below the floor; disabled is exempt and must look off |
| `--grey-250` | `#dcdcdc` | pressed fill (`--color-pressed`) | — |
| `--grey-200` | `#e6e6e6` | dividers between sections, rows, tabs (`--color-divider`) | structure only, never the sole affordance |
| `--grey-150` | `#ececec` | hover fill (`--color-hover`) | — |
| `--grey-100` | `#f4f4f4` | inside an editable box (`--color-field`) | — |
| `--white` | `#ffffff` | panels, paper (`--color-paper`, `--color-surface`) | — |
| `--black` | `#000000` | selected / active / primary (`--color-selected`, `--color-primary`) | white on it 21:1 |
| `--magenta` | `#ff00c3` | seed only (`--color-seed`): re-seed, reroll, fresh load | 3.5:1 on white (icons only, never text) |
| `--blue-500` / `--red-600` | `#3182ce` / `#c53030` | preview overlays (selection / erase), unchanged | — |

The previous aqua surfaces are gone (problem 2): a third palette that carried little meaning.
There is one theme; the inverted footer theme is no longer needed because the footer is white.

## Typography

Two sizes and sentence case everywhere (problem 3):

| Class | Spec | Used for |
|---|---|---|
| `.t-section` | 13 / semibold | section titles, the options header in an operation, popup and notice titles |
| `.t-body` | 13 / regular | values in prose, questions, group titles (with medium weight), popups |
| `.t-label` | 12 / regular | field labels, summaries, empty states |
| `.t-xs` | 12 / medium | buttons, segments, tab names |
| `.t-console` | Roboto Mono 12 / medium | every number and id: field values, %, widths, tab answers |

Titles and labels are told apart by **weight and colour** (semibold 900 vs regular 600), not by
size or capitals, so nothing shouts and the value is always the darkest thing in a row. Numbers
are in mono so they line up down a column (field values, %, the preset widths), which is what makes
a dense panel scannable. 12px is the floor; nothing is smaller.

## Spacing and density

- 2px base scale (`--space-1…6` = 2–12, plus `--space-8` = 16).
- **Side gutter 16px**; a section's triangle hangs in the gutter so titles and fields share one
  left edge.
- **One indent = 24px**, the disclosure triangle's column: a nested title and its body start at
  the same x.
- **28px** is the universal control height (fields, segmented controls, buttons, preset widths,
  swatch); section rows are 32px; nested rows 28px; tile variant rows 28px with 2px between.
- Fields sit 4px apart in a 2-column grid; a section closes with 12px before its divider.
- Sidebar `clamp(360px, 27vw, 440px)`: narrower than before (389px at 1440 vs 432px), because a
  2-column grid uses the width better, and the preview gets the difference.

Measured at 1440×900 with the readme demo and every section open: the sidebar's scrolling content
is **1629px tall vs 2196px** before (−26%) in a narrower column, and the fixed footer is **158px vs
226px**. Grid & Size, Breakpoints and the whole first tile group are visible without scrolling.

## Component styling

**Inputs.** `NumericInput` is a 28px box: field fill, 1px `--color-rule` edge (3.5:1, because the
edge is what says "editable"), radius 3, the label as a prefix inside in ink-600, the value
right-aligned in mono ink-900, an optional unit in ink-500 ("px"). The label is a real `<label>`,
so clicking anywhere on the text focuses the value. Hover turns the fill white and the edge ink-600;
focus makes the edge ink and doubles it (drawn inside, nothing moves). The seed field, the
palette's tile select and the rule "+ Field" select use the same box.

**Segmented controls.** `Toggle` (Alignment, Assets on load, Steps, enum params), `WidthChoices`
(presets, breakpoints), `TabBar` (operation steps) and the palette bar are all the same object: one
28px box with the control edge, segments separated by 1px, the chosen one black with white text,
others ink-600 that go grey-150 on hover and grey-250 when pressed.

**Buttons.** Secondary (default): paper, control edge, 12 medium ink-900; hover grey fill and darker
edge; pressed darker fill. Primary (`variant="primary"`): black fill, white text; one per area —
Download in the footer, Save/Add in an operation, "Change it" in the resize notice. Icon buttons
are 24px (re-seed 28px) with no frame at rest, a grey square on hover and a darker one when
pressed. "Add inside a list" (add variants, + Field) is a dashed edge: a place where something can
go.

**Headers.** `Collapsible` draws both levels: section (32px, sticky, semibold) and group (28px,
medium). The triangle points right when closed, down when open. Header rows have no fill; hover
tints only the part that toggles. A closed header shows its `summary` right-aligned in ink-600.
`Section` takes an `actions` snippet, which receives `reveal()` so "+" on a closed section opens it
to show what it added.

**Collapsible sections and nested groups.** No frames: a body is just indented content. Rules show
their fields two to a row with an "inherit again" × beside each. Tile groups list their variants
as one line each: 24px thumbnail · slider · % in mono · a delete × that appears on row hover or
focus (its column is always reserved). Operations are rows of index · four two-line step tabs
(name over the answer in mono) · a 2×2 block of re-seed, delete, up, down; an open operation's
body sits under its tabs with the question, the glyph grid and the chosen option's fields under a
13-semibold header with a divider, then Discard / Next / Save (primary) above a divider.

**Others.** Glyph cells: divider-grey edge, mono label; hover grey fill and darker edge; chosen a
2px ink frame on field fill (never inverted, so ink artwork stays visible). Slider: 2px track in the
control grey, 8×16 ink block thumb inside a 24px input (the mapping's two thumbs get a transparent
border so each is a 24px target). Popups and the pinned preview notices are the only floating
objects and the only things with a shadow; their header is a section row. Hints are a small ink
bubble with 12px text. The scroll handle is translucent black so it reads on any backdrop.

**Preview top bar.** The same toolbar vocabulary (problem 7): 44px, white, divider below; "Width"
label + mono readout, "Breakpoints" + a segmented mono control; at the right the Grid toggle (black
when on), the presets as one segmented control with Fill, and the colour swatch as a 28px square.

**Footer.** A compact toolbar (problem 6) on white, divided from the sections: the seed as a boxed
field with its magenta re-seed; "Assets" and "Fresh load" as labelled magenta icons; Assets on
load as a segmented control; then, under a divider, Undo · Import · New as secondary buttons and
Download as the one black primary filling the rest of the row.

## Usability improvements

| Problem (plan analysis) | What this direction does |
|---|---|
| 1. Black bars flatten hierarchy | No black bars. Levels are told by row height, weight and indent; black is reserved for "selected" and "primary", so it now carries meaning. |
| 2. Aqua is a third palette | Removed. One white panel, a monochrome role map, magenta only for seed. |
| 3. Everything shouts | Sentence case, two sizes (13/12). Labels are 12 regular ink-600, values mono ink-900: the value is the loudest thing in a row. |
| 4. Lines on lines | One kind of line per job: a 3:1 edge only around things you can edit, a light divider only between structural blocks. Nested groups lose their frames (indent instead). Per-field trash icons became a quieter × beside rule fields; variant delete appears on demand. |
| 5. Long eye travel | Labels are inside the box, next to their value, so label→value is ~100px, not ~400px. Two columns halve the vertical travel. |
| 6. Footer slab | White compact toolbar, 158px instead of 226px. Download is the one primary; Undo/Import/New are visibly secondary. |
| 7. Two idioms | The preview top bar uses the same 28px segmented controls, mono numbers and label greys as the sidebar. |
| 8. Collapsed sections say nothing | Every closed section and rule shows a one-line summary of its existing values in its header. |

Also: actions moved into header rows mean an add button is always at the top of its list, even
when the list is long or the section closed; sticky section headers keep the reader oriented in a
long Tiles list; on a narrow column (phone, 200% zoom) operation tabs go two by two so each answer
keeps half the width.

## Trade-offs

- **Least like the Figma identity.** The black-on-aqua slabs that gave the current editor its
  character are gone; this looks like a tool, not a branded object. If the identity matters more
  than density, directions 1 or 2 keep more of it.
- **Busy if spacing slips.** Density only reads calm because every row repeats one structure; a
  future control that ignores the 28px box / label-inside rule will stand out immediately.
- **Small text.** 12/13px is at the floor Pol set. It passes WCAG, but people who found the old
  16px labels comfortable may find this tight; the tokens make 13/14 a two-line change.
- **Truncated step answers.** Four tabs share ~280px, so long answers ("Tile [Beige 50%, Blue
  50%]") end in an ellipsis. They scroll on hover and the tab's accessible name carries the whole
  answer, but at rest you see less than the old full-width console strip.
- **Hidden-until-hover delete** on tile variants is kept from Block D; it is focusable and its space
  is reserved, but it is still discoverable only by hovering or tabbing.
- **Header "+" is small.** Adding a rule, group or operation is a 24px icon in the header rather
  than a full-width bar. It is labelled for screen readers and has a hover fill, and empty sections
  say "add … with +", but it is a smaller target than before.
- **Black segments are strong.** A chosen segment (Column, Reseed, Fill) is solid black, which is
  consistent with "black = selected" but heavier than a light pill would be.
