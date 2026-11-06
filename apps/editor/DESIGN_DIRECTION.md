# Design direction 4 — Ink on paper (iteration 2)

**Adopted** on `editor-redesign` on 2026-11-06, merged as `37a2726` from
`exploration/design-direction-3`. That branch reused the worktree of the discarded Inspector
direction, and its iteration 2 work starts from direction 1's tree in `a8b4b45`. This file is the
rationale; the working reference is `DESIGN_SYSTEM.md`.

## The brief, in one line

Keep the usability of 5201 (Tonal layers) and gain the confidence of 5202 (Editorial grid). Do
not use caps, and rethink Operations from the ground up.

## What was kept, taken and redesigned

| From 5201, kept | From 5202, taken (without its problems) | Redesigned |
|---|---|---|
| The filled input boxes with a 1px edge | Ink as structure: a rule under an open section, one hairline under both top bars | Section headers |
| The packed Tiles rows (thumbnail, slider, %) | Large section titles (17px) | Operations (card plus stepper) |
| The grey ground, white panels and grey wells | Mono as the voice of data: values, seed, summaries | Footer (randomness only) |
| Ink = primary or selected | A fixed, typographic hierarchy | A sidebar top bar for the document's actions |
| Sentence case | | Icons (one family) |
| | | Accent colour and its meaning |

5202's caps, numbered sections and underlined text links are not taken. They gave 5202 its
character, but they also caused its usability problems.

## Principles

1. **Paper cards on a grey table.** Every section is a white card, open or closed. A folded
   section is no longer just a line of text on the ground: it stays a card with a large title, so
   the sidebar keeps its shape when everything is folded.
2. **Ink draws structure, sparingly.** There are three ink lines in the whole sidebar:
   - the 2px rule under an open section's header
   - the hairline under the two top bars, one line across the window
   - the outline of the selected glyph

   Ink also fills what is primary or selected, as in 5201.
3. **Two voices of type, and no caps.**
   - Helvetica carries words: titles, labels, buttons.
   - Roboto Mono carries data: what a field holds, the seed, summaries, chips and captions.

   The eye learns that mono is "what you set" and sans is "what it is called". Hierarchy comes
   from size and weight alone:
   - section 17/600
   - group or operation title 14/600
   - label 13/400 muted
   - value mono 13
   - caption mono 12
4. **The square is the motif.** It is the tile the product makes. Examples: the operation index
   square, thumbnails with 3px corners, square icon buttons, the squared chevron of a section. It
   is never decorative: each square is a control or carries data.
5. **One accent, one meaning: "what you are editing now".** Ultramarine `#3340ff` (6.3:1 on
   white, 5.4:1 on the ground) appears in four places:
   - the open operation's edge and index square
   - the active step
   - the focus ring
   - the cells the open operation selects in the preview

   The last one ties the sidebar to the picture: the card in blue and its cells in blue are the
   same thing. Magenta is retired. Its old meaning, "non-deterministic", is now carried by the
   re-seed icon's shape. As a colour, magenta clashed with tile art, such as the demo's pinks.
6. **Icons are one family.**
   - Lucide paths (ISC licence) on one 16px grid, with a 1.5px stroke and round caps.
   - They replace the Figma mix of a filled triangle, an outline trash and a filled re-seed.
   - Each icon names an action and sits beside a word or inside a named control.
   - New icons, each for an action that already existed: undo, import (open folder), export
     (download), new (file-plus), more (⋯), close, check.

## Structure

### The two top bars

The sidebar has a 52px top bar on the same ground as the preview's, in the same grid row. `App`
shares the row with CSS subgrid, so when the preview bar wraps in a narrow window the sidebar bar
grows with it. One ink hairline runs under both.
- Left: **Undo**.
- Right: **New**, **Import**, then **Export** (the primary).

This solves the imbalance Pol saw in 5201, where the sidebar began with an 8px gap and a rounded
panel while the preview began with a flat bar. Now both columns start the same way, and the
content starts under one line.

Export is today's "Download tileset.zip", renamed: it saves the document out. The current editor
has no export submenu, so none was invented.

### Section headers

A 52px card header:
- the title in 17/600
- under it, while closed, the mono summary ("25 px · 14 rows · 720 wide · column", "5 groups ·
  16 variants")
- a "+" for sections that hold a list (Breakpoints, Tiles, Operations). It adds an item and opens
  the section, so adding never needs a scroll to the end of a long list.
- the chevron in a grey 28px square

Open, the ink rule under the header separates the title from the body. Nested groups (rules, tile
groups) keep 5201's grey wells. The section selectors are scoped to the section's own heading, so
the rule never leaks into them.

### Operations

The problem: a collapsed stack showed `Selection Attribute Source Blend` four times, and squeezed
the real answers into clipped mono captions. You could not tell what an operation did without
opening it.

**Collapsed: a card that reads as what it does.**

```
[2]  Tile ■ Pink                                  ⤮  ⋯
     Selection Random   Source Constant   Blend Set
```

- **Index square.** The stack order, ink (accent while open). Stack order matters because later
  operations blend onto earlier ones.
- **Title: what it writes.** This is the single most informative fact about an operation, so it
  leads, in the group-title style.
  - A tile mapping adds up to four palette thumbnails and the tile names.
  - A numeric mapping adds its range in mono, for example `0 – 270 · 4 steps`.
  - Clicking the title opens the Attribute step.
- **Chips: where and how.** Selection, Source and Blend each show a muted step name, then the
  answer in mono. Each chip opens its step. Chips wrap rather than clip, so long answers and
  narrow widths degrade gracefully.
- **Actions.** Re-seed stays visible because it is the everyday action. A ⋯ menu holds Move
  earlier, Move later and Delete:
  - It is keyboard navigable, Escape closes it, and focus returns to the button after a move.
  - Reorder is still arrows (D44), and each move is one undo entry.
  - The row says what the operation *is* rather than listing what can be *done* to it.

**Open: a vertical stepper inside the card.** The card lifts to white with a 3px accent edge.
Below its head are four numbered rows joined by a line (`1 Selection — Random`, `2 Attribute —
Tile · Pink`, …):
- A number is hollow while its step is unanswered and ink once answered. The open step's number
  and row are in the accent.
- The open step unfolds in place: the question, the glyph grid, and the chosen option's fields in
  a grey well.
- Every other step's answer stays visible while you edit one, so the relationship between the
  four steps is always on screen.
- Discard, Next and Save/Add close the card under a hairline.

The data flow is unchanged:
- `drafting`, the unsaved-changes guard, `selectStep`, `reseed` and `create` are as before.
- `OperationHeader` and `TabBar` are removed.
- `OperationCard` and `Menu` are new.
- `OperationBody` is restructured.
- `writesOf` and `writesText` were added to `labels.ts`, with tests.

### Footer: "Randomness"

The footer used to mix the seed with the document's actions; now it holds only what decides
randomness:
- the seed field (mono) with its re-seed button
- Assets on load (Fixed / Reseed)
- two labelled actions, **Reroll assets** and **Preview a fresh load**, each wearing the re-seed
  icon

The hints, the disabled logic and the inert-flags advisory are unchanged. Export no longer sits
beside the seed, competing with it.

## Color tokens (changes from 5201)

| Token | Value | Role |
|---|---|---|
| `--color-accent` | `#3340ff` | Editing now: open operation, active step, focus ring |
| `--color-accent-wash` | 10% accent | The active step's row |
| `--color-selection` | = accent | The preview's selected and painted cells |
| `--color-card` | white | A section, open or closed; the footer |
| `--color-bar-rule` | ink | The hairline under both top bars |
| `--color-seed` | removed | Magenta retired |

Everything else is 5201's neutral ramp. Muted text is `#5e5e5e` (6.5:1 on white).

## Verification

- `pnpm -r typecheck` reports 0 errors. Tests: 655 engine and 330 editor, including the new
  `writesOf` and icon-grid tests. Docs coverage reaches all 110 files.
- A Playwright smoke test on 5203 passes:
  - import the demo, then fold and unfold the sections
  - in the ⋯ menu, Move earlier and Move later reorder and undo restores; Escape closes; Delete
    removes and undo restores; focus returns after a move
  - re-seed changes the picture
  - the chips open their steps, and the stepper switches between them
  - a live answer on a step row
  - the unsaved-changes popup appears, and Save updates the chips
  - an operation added end to end from the header "+"
  - new seed, reroll assets, Export downloads `tileset.zip`, and no page errors
- Probes at 1440, 1024, 600 and 320 find:
  - no sideways scroll
  - no `text-transform: uppercase`
  - no text under 12px
  - every enabled control at least 24×24

## Trade-offs and known weaknesses

- **Vertical room.** Taller section headers and two-line operation cards make the fully open
  sidebar 2444px long, against 2266px for 5201. The new top bar also takes 53px, so 680px of
  sidebar shows without scrolling, against 724px. The fixed chrome (top bar plus footer) totals
  213px.
- **Reorder is one click deeper.** Move earlier and Move later now sit in a menu. That is right
  for an occasional action, but slower for someone reordering a lot.
- **The accent's meaning is new.** It no longer means "random". The re-seed icon has to carry
  that meaning, which is weaker than a colour at a glance.
- **Mono everywhere for data** is a strong stylistic choice. Long tile names in mono take more
  width than in sans.
- **Inherited from 5201:** PaletteBar's controls, and the glyph labels that wrap ("Translate X").
- **Not done:** the docs site still shows older looks for most components (only the changed
  components' pages were rewritten). The resize confirmation notice is restyled by tokens only
  and was not triggered.
