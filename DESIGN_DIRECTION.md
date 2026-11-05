# Design direction 1 — Tonal layers

Branch `exploration/design-direction-1`. Run it with
`cd apps/editor && pnpm exec vite --port 5201 --strictPort`.

## Design concept

The old sidebar built hierarchy out of black: black section bars, black group bars, black add
bars and a black footer, all at the same weight, next to a white preview. Everything was loud, so
nothing was.

Tonal layers carries hierarchy by **how light a surface is**. There are four surfaces, and each
one means a level:

| Surface | Value | Meaning |
|---|---|---|
| Ground | `#ededed` | The sidebar and the preview top bar: chrome, the table everything sits on |
| Panel | `#ffffff` | An open section (and the footer, and a popup) |
| Well | `#f4f4f4` | A nested group inside a panel: a breakpoint rule, a tile group, an operation |
| Field | one step off its surface | Something you type into or choose from |

A closed section is only its header, lying on the ground. Opening it lifts it into a white panel.
Inside the panel, a group sits back in a faint well, and inside an operation's well, the chosen
option's fields come forward again on a white panel. Depth is read the way one reads paper on a
desk, without a single border.

Black is no longer structure. It is reserved for two meanings: **the primary action of an area**
(Download, Save/Add, Change it) and **the selected state** (the chosen segment, the active step
tab, the edited palette entry, the preview's chosen width). If something is black, it is either
"do this" or "this one". Magenta still means only "non-deterministic".

## Visual hierarchy

1. **Section** — semibold 15px sentence-case title on its header; open = white panel.
2. **Group** — medium 14px title in a grey well inside the panel.
3. **Field** — muted 13px label in a fixed label column, the value in 14px ink in a filled box.
4. **Caption** — muted 12–13px text (collapsed summaries, operation step captions, option names).

Weight and colour make the steps; nothing is uppercase. Labels are quieter than values, so the eye
lands on the numbers first and finds the label beside them when it needs it.

## Color system

All text pairs meet WCAG 2.2 AA (4.5:1); control boundaries that are the only affordance meet 3:1.

| Token (primitive) | Hex | Role | Contrast |
|---|---|---|---|
| `--white` | `#ffffff` | Panel, popup, footer, text on ink | — |
| `--grey-50` | `#f4f4f4` | Well (nested group) | — |
| `--grey-100` | `#ededed` | Ground; field and track fill on a panel | — |
| `--grey-200` | `#e2e2e2` | Secondary button; field hover | — |
| `--grey-300` | `#d4d4d4` | Secondary hover; slider track; palette entry | — |
| `--grey-400` | `#c2c2c2` | Secondary pressed | — |
| `--grey-450` | `#a3a3a3` | Disabled text and icons | intentionally below 4.5 (disabled is exempt) |
| `--grey-500` | `#7a7a7a` | A field's 1px bottom edge; scroll handle | 3.6:1 on ground, 4.3:1 on white |
| `--grey-600` | `#5e5e5e` | Muted text: labels, summaries, chevrons, resting icons | 5.5:1 on ground, 5.9:1 on well, 6.5:1 on white |
| `--grey-800` | `#333333` | Primary button hover | white on it 12.6:1 |
| `--black` | `#111111` | Ink: text, primary, selected | 18.9:1 on white, 16:1 on ground |
| `--black-6` / `--black-12` | 6% / 12% black | Hover and pressed washes for tertiary controls, icons, headers | works on any surface |
| `--magenta` | `#ff00c3` | Seed / re-seed / reroll only | 3.5:1 on white, 3.2:1 on well (non-text) |
| `--blue-500`, `--red-600` | | Preview overlays (selection, erase), unchanged | |

The aqua tints are gone: the scale is one neutral ramp plus black, white and magenta.

## Typography

Helvetica Neue (stand-in for Neue Haas Grotesk) and Roboto Mono, as before. All sentence case.

| Class | Spec | Used for |
|---|---|---|
| `.t-section` | 15 / 600 | Section headers, popup and notice titles |
| `.t-title` | 14 / 500 | Group titles (rule, tile group), operation index |
| `.t-label` | 13 / 400 / muted | Field labels, the readout's label |
| `.t-value` | 14 / 400 / tabular | Field values, % shares, readouts |
| `.t-body` | 13 / 400 | Questions, running text, hints, summaries |
| `.t-xs` | 13 / 500 | Buttons, segments, tabs |
| `.t-console` | Mono 12 / 500 | Operation captions, glyph labels, ids |

Light (300) is no longer used: on a grey ground it read as faded.

## Spacing and density

- Sidebar ground has 8px padding; sections are 4px apart; panel content has 12px side padding,
  so field labels line up with the section title.
- Controls are 30px tall (above the 24px target floor), field rows 6px apart; section headers 40px,
  group headers 34px, operation headers 60px.
- The label column is 38% of the panel (116px in an operation body), and every control fills the
  rest. Values therefore start at one tab stop, right next to their labels.
- The footer's two reroll actions share a row, which keeps it about 40px shorter than a row each.
- At 1440×900 with Breakpoints open, the Tiles header is at ~575px; with Breakpoints closed, the
  first tile group is on screen without scrolling.

## Component styling

**Inputs.** A filled box (`--color-field`, one step darker than the panel), 4px radius, value in
ink, left-aligned. A 1px bottom edge in `--grey-500` is the boundary that meets 1.4.11; the fill
alone would be too faint to carry "type here". Hover darkens the fill a step; focus is the 2px ink
ring drawn tight around the box. The seed field and the palette's tile select use the same box.

**Segmented controls** (Alignment, Assets on load, enum params, Steps, operation step tabs, the
preview's sizes and breakpoints). A grey track with 2px padding holding equal segments. The
chosen segment is ink with white text — chosen over a raised white segment because ink-on-grey is
unmistakable at a glance, and it makes "black = selected" consistent everywhere. Others are text
on the track, washing darker under the pointer and again when pressed.

**Buttons.** `Button` gains `variant`:
- *primary* — ink fill, white text; one per area: Download (footer), Save/Add (operation body),
  Change it (confirmation), Discard (unsaved-changes popup, the action being asked about).
- *secondary* (default) — grey fill: Undo, Import, New, Next, Close, Keep editing, palette edits.
- *tertiary* — text only, wash on hover: Discard in an operation body, Reset weights.

**Headers and collapsible sections.** Title left, chevron right (muted, ink on hover). The whole
header washes a step darker under the pointer and darker again while pressed. A closed section
shows a muted one-line summary of values it already holds ("25 px · 14 rows · 720 wide · column",
"1 rule", "29 columns · 725 × 350 px", "5 groups · 18 variants", "4 operations"); a closed rule
shows its fields ("max width 500 · rows 14 · columns 9"). Header actions (trash, reorder) sit
before the chevron, muted until hovered.

**Add controls.** "+ Add breakpoint / tile group / operation" are now labelled tertiary rows
instead of anonymous black bars with a bare "+". The square "+" in a tile group is a grey
secondary square, the size of a thumbnail.

**Others.**
- *Sliders*: 4px grey track filled in ink up to the value, a 16px round ink thumb with a white
  rim; the thumb grows on hover. The numeric mapping uses the same parts.
- *Icon buttons*: muted at rest, ink on a wash when hovered; the re-seed icon stays magenta.
- *Glyph grid*: cells sit on the operation's well; hover washes; selected is a white tile raised
  with a 2px ink ring (an ink fill would swallow the ink artwork).
- *Operation*: one grey well holding header and body. The step answers are centred mono captions
  over the segmented step tabs; the chosen option's fields sit on a white panel under a muted
  caption naming the option.
- *Palette bar*: entries are grey blocks on a track; the edited one is ink.
- *Footer*: a white panel on the ground, not a black slab.
- *Popups and pinned notices*: white panels with a soft shadow and 10px / 6px radius, no frame and
  no black title bar.
- *Preview top bar*: the same grey as the sidebar ground, so sidebar and top bar read as one L of
  chrome around the white picture area; tracks become white there (one step lighter than the
  ground, mirroring one step darker on a panel). The colour swatch is a 30px rounded square with
  an edge so white still shows.
- *Hints*: the ink bubble, now with a 4px radius and regular weight.

## Usability improvements

Numbered against the analysis in the plan.

1. **Black bars flatten hierarchy** → levels are now separate surface values (ground, panel,
   well, field); no two levels share one.
2. **Aqua is a third palette** → removed; one neutral ramp.
3. **Everything shouts** → sentence case, muted 13px labels, values in ink: labels recede,
   values lead, and only section titles are semibold.
4. **Lines on lines** → no frames anywhere in the sidebar; the only line left is the field's
   bottom edge, kept for 1.4.11. Per-field trash icons are muted until hovered.
5. **Long eye travel** → a shared label column with controls starting right after it; values sit
   ~150px from their label instead of ~400px.
6. **Footer slab** → a light panel; Download is the single ink button, Undo/Import/New are grey
   secondaries; the three re-seed icons stay magenta.
7. **Two idioms** → the top bar uses the same ground, segmented tracks and ink selection as the
   sidebar.
8. **Collapsed sections say nothing** → each shows a one-line summary of existing values.

Also: the "+" bars now say what they add; the step tabs and their answers line up as captions
over a segmented control.

## Trade-offs

- **Lower contrast between levels.** The well (`#f4f4f4`) against white is deliberately faint;
  it reads on a calibrated screen but can vanish on a washed-out projector. Grouping still holds
  there because of spacing and the group headers.
- **Softer identity.** The Figma file's stark black-bar character is gone; the editor now looks
  more like a conventional, calm tool and less like a poster.
- **Wider fields.** Fields fill the row, so short numbers sit in long boxes. That buys a single
  tab stop for every value and lets the sidebar resize without re-layout, but it is less compact
  than fixed-width inputs.
- **The field's bottom edge** is a line in a no-lines direction. It is there because a filled box
  alone is ~1.2:1 against white, below the 3:1 a boundary needs.
- **Tile asset delete badge** keeps its 16px visible circle with a 24px hit area via `::before`,
  as before; a pure bounding-box probe reports it as 16px.
- **Two inks in the top bar** (Grid on, and the chosen size) are both "selected", which is
  consistent but makes the bar slightly heavier than the sidebar.
