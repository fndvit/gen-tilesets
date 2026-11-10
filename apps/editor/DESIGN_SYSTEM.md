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
| Colour, surfaces | `--color-ground` (grey-100) · `--color-card` and `--color-panel` (white) · `--color-well` (grey-50) · `--color-field` / `--color-field-hover` · `--color-edge` (grey-500, a field's bottom edge) | A container can reset `--color-field` (white fields in a grey well). `--color-scrim`, 40% ink: the tour's backdrop (*Onboarding*); the Popup's backdrop stays 24% |
| Colour, text | `--color-ink` · `--color-muted` (grey-600, 6.5:1 on white) · `--color-disabled` (grey-450) · `--color-paper` | |
| Colour, actions | `--color-primary` / `-hover` / `--color-on-primary` · `--color-secondary` / `-hover` / `-pressed` · `--color-hover` / `--color-pressed` (washes for tertiary, icons and headers) · `--color-selected` / `--color-on-selected` (ink) | |
| Colour, accent | `--color-accent` · `--color-accent-wash` (the active step's row) · `--color-selection` (`--berry` #8e294c, kin to the accent): the preview's selected and painted cells (N3) · `--color-erase` | |
| Colour, lines | `--color-bar-rule` (ink, under both top bars) · `--color-track` (slider tracks, the stepper line, hairlines) · `--color-grid` · `--color-scrollbar` | |
| Status | `--color-danger` (= `--red-600`) | Only the alert icon of a failure notice or of a **Field error**. There is no warning colour: an advisory is ink |
| Font | `--font-ui` (Helvetica, standing in for Neue Haas Grotesk) · `--font-mono` (Roboto Mono 400 and 500, self-hosted via `@fontsource`) | |
| Space | `--space-1…7` = 2 / 4 / 6 / 8 / 10 / 12 / 16 px | 2px base |
| Size | `--control-h` 30 · `--header-h` 52 (a section header) · `--preview-bar-h` 52 (both top bars) · `--group-h` 34 · `--add-h` 32 · `--icon` 16 · `--icon-button` 28 · `--op-index` 24 · `--step-dot` 20 · `--menu-w` 200 · `--thumb` 32 · `--thumb-sm` 16 · `--thumb-lg` 48 (Constant's one tile) · `--share-measured-w` 48 (a "≈68%") · `--slider-thumb` 16 · `--glyph-w` 72 · `--glyph-slot` 43 · `--badge` 16 · `--field-label-w` 38% (`-compact` 116px in an operation) · `--width-chip-w` 48 · `--swatch-w` 30 · `--sidebar-w` clamp(400, 30vw, 560) · the preview handle sizes · `--tour-bubble-w` 380 (a tour step's bubble) · `--tour-welcome-w` 440 (its Welcome card) · `--tour-pad` 20 (their padding) | |
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

The tour's text is the one exception: Helvetica 15 / 400 at 1.5 leading (`--text-tour-size`,
`--leading-tour`), with its terms at 600. It is prose read once, not text scanned beside the
controls, so it gets a step up (Pol, O3c). See *Onboarding: the tour*, "The step bubble".

## Layout

- **Page:** two columns at full viewport height, sidebar (`--sidebar-w`) and preview. The page
  never scrolls; each column scrolls its own content (`ScrollArea`).
- **Top row:** both columns start with a top bar on the grey ground, in **one grid row** (CSS
  subgrid on `main`). They are always the same height, even when the preview bar wraps, and one
  ink hairline (`--color-bar-rule`) runs under both.
  - The sidebar bar (`SidebarTopBar`) holds the document: New (which opens **New tileset**), Import and Export (the primary,
    a **Split button**) on the left; Undo and **"?"** (Show the tour, *Onboarding*) on the right.
    Below 40rem Undo is an Icon button, so "?" fits. The document's actions come first, and
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
| **Section** (`Section` + `Collapsible variant="section"`) | A white card. Its 52px header has the title in `.t-section`, and under it, while closed, a one-line `.t-console` summary. On the right sit an optional "+" (`onAdd`, which also opens the section) and the chevron in a grey 28px square. Open, a 2px ink rule runs under the header. The whole header washes on hover. Section selectors are scoped to the section's own heading, so they never leak into nested groups | Grid & size, Tiles, Operations, Breakpoints |
| **Group** (`Collapsible variant="group"`) | A grey well. A 34px header with the title in `.t-title`, the summary on the same line, actions, then the chevron | Breakpoint rule, tile group |
| **Field row** | A muted `.t-label` in a fixed label column (`--field-label-w`), then the control. An explanation is a hint on the label, never text in the row. A param with no fixed name is labelled from its name in sentence case (`labelFor`: `cellsPerFeature` → "Cells per feature") | Numeric and boolean inputs, operation params, the seed |
| **Input** | A filled box (`--color-field`), radius 6, with a 1px `--color-edge` bottom edge. The value is in `.t-value` (mono). Hover darkens the fill a step | Numeric inputs, the seed |
| **Input, waiting** (`NumericInput commit="blur"`) | A field holding a changed value that is not applied yet: "↵ Enter to apply" in muted mono at its right edge, also in the field's `aria-describedby`. The field keeps room for it, so the digits never run under it. It is not shown for the same value, for an invalid one, or after Esc or Enter | Fields that shape the grid: Grid & size's cell size, rows and design width; a breakpoint's rows, columns and cell size |
| **Segmented control** (`Toggle`) | A grey track with equal segments. The chosen one is ink with white text | Alignment, Assets on load, enum params, the preview's sizes |
| **Button** | `primary` (ink, one per area), `secondary` (grey fill), `tertiary` (text, a wash on hover). 30px tall, radius 6, `.t-xs`. An optional leading `icon` | Export, Save/Add, Undo, New, Import, Reroll assets, Discard |
| **Split button** | One primary (ink) control in two parts. The main part is a Button that runs the default action. At its right, a 28px chevron segment (the `fold` icon, the disclosure chevron; `down` is an arrow and would read as a download) is split off by a white hairline at 32% (`box-shadow: inset 1px 0 0 rgb(255 255 255 / .32)`); only the control's outer corners are rounded. The parts are two `<button>`s with their own accessible names: the main part says what it does ("Export"), the chevron has `aria-haspopup="menu"` and says what it opens ("More export options"). Enter or Space on the main part runs the default action; on the chevron it opens the **Menu** on its first item. The menu then works as every Menu does, and Esc returns focus to the chevron. The chevron is 28×30 (2.5.8). The default action must also be in the menu, so the menu is a complete list on its own | Export: the main part downloads the zip in one click (**E14**); the menu adds the image |
| **Icon button** | A 28px square, with a 16px icon muted at rest. It turns ink on a wash under the pointer. `strong` keeps it ink at rest (re-seed) | Re-seed, trash, close, reorder |
| **Menu** | An icon button (`more`) that opens a floating list (`--shadow-float`) of icon plus label items. It follows the WAI-ARIA menu button pattern. Focus returns to the button after an action. A label ending in "…" opens a dialog rather than acting at once.<br>**Alignment:** the list is anchored under its trigger and aligns with the trigger's edge nearest the bar's edge: the ⋯ menus sit at a row's right and right-align; a **Split button**'s menu opens under the whole control and left-aligns with it, because Export sits at the bar's left. Either way the list is kept 8px inside the window (a narrow screen). In code: `Menu`'s `align`, `anchor` (the element it is placed against) and `trigger` (a snippet for the caller's own button; Esc and refocus go to it) | An operation's Move earlier, Move later and Delete; a palette entry's Change tile, Move earlier, Move later (only under Noise and Gradient) and Remove; Export's Tileset (.zip) (`archive`) and Image (.png)… (`image`) |
| **Add row** | `+` and a label, tertiary. The square variant is a 32px grey "+" | Add breakpoint, tile group, operation; add a tile. In Tiles, "Add tile group" and "Add variants to …" open the **Tile gallery** instead of acting at once, and say so (`aria-haspopup="dialog"`) |
| **Tile group / tile asset** | A well with up to four 16px thumbnails in the header. Each row is a 32px thumbnail, a slider (4px track, 16px round ink thumb) and the % in mono. "+" and Reset weights at the foot | Tiles |
| **Palette** (`PaletteList`) | Its shape follows the operation's **Pattern** (Tile and pattern, T0–T1).<br>**Shared:** a `.t-label` "Palette" with a muted mono label at the right ("chance" or "≈ painted"). Under it is a 12px **proportion strip**, read-only and hidden from assistive tech: one segment per entry, filled with the tile's picture (clear is the slashed square, a missing picture is field grey; a zero weight is a 2px ink tick). Then the **entry rows**, each 32px: the thumbnail (a button that opens the tile picker), the name, the tile group's slider (0 to the larger of 2 and the largest weight), the % in mono, and a Menu. Hovering or focusing a row rings its segment in the accent. Under the rows is a muted `.t-body` caption, then "+ Entry" (Add row), which opens the picker and adds the chosen tile at the end with weight 1.<br>**Random:** order means nothing, so there is no number, no grip and no threshold, and the Menu has no Move items. The strip segments are as wide as the weights, and the % is each entry's **chance**. Caption: "Each cell picks a tile at random. The % is each tile's chance."<br>**Noise, Gradient:** an ordered list. Each row adds a grip (pointer only) and a mono number before the thumbnail. The % is the **measured coverage**, written "≈68%": the share of the selected cells the entry actually paints with the current seed (`coverage`, `controls/palette.ts`). The strip draws the same measured shares, so the two always agree; there are no threshold labels. The caption says that neighbours in the list meet on the canvas. Under Noise it adds why the middle entries cover more and what to do: "Middle entries cover more because noise rarely reaches its ends. Give the first and last entries more weight to even it out." There is no "Even out" action (Pol, N0): the right weights depend on the seed. Under Gradient it adds that the bands follow the list. Dragging the grip reorders live, and the Menu's Move earlier / Move later is the keyboard path (WCAG 2.5.7).<br>**Constant:** one tile, not a palette. The label is "Tile", then a 48px thumbnail button (opens the picker), the name, and "every selected cell" in muted mono. A muted `info` line, "… are kept until you save, in case you switch back to a pattern that uses a palette.", shows only while the draft holds other entries. Save writes only the shown entry.<br>At the narrowest widths (a container under 250px), the rows' gaps tighten to `--space-2` and the right-hand label is hidden | An open operation that writes Tile |
| **Tile picker** (`TilePicker`) | A non-modal popover (white, radius 12, `--shadow-float`) under its trigger: a muted "Choose a tile", then a grid of 64px cells, each a 36px thumbnail over a mono name. Clear is always the first cell. The current tile has the glyph grid's 2px ink ring; hover washes. Arrow keys move between cells, Enter or a click picks, Esc or a click outside closes, and focus returns to the trigger | A palette entry's tile, "+ Entry", the single tile under Constant |
| **Operation card** (`OperationCard`) | A grey well, collapsed:<br>1. a 24px ink index square;<br>2. the title, which is what it writes: the attribute in `.t-title`, then palette thumbnails and names, or the range in mono;<br>3. re-seed and a menu;<br>4. a row of step chips (Selection, Pattern, Blend), in step order, each a muted step name and a mono answer, on white, wrapping. Each chip opens its step; the title opens Attribute.<br>Open, the card is white with a 3px accent edge and an accent index, and holds the stepper | Operations |
| **Operation stepper** (`OperationBody`) | Four rows joined by a vertical line, in this order: **Selection → Pattern → Attribute → Blend**. Pattern comes before Attribute because it decides what the attribute's values mean (a palette weight is a chance only under Random). The steps stay navigable in any order; only the default walk and "Next" follow it. Pattern's question is "How should the tiles spread?" ("How should the values spread?" for a numeric attribute), and its options keep their names: Random, Noise, Gradient, Constant. Each row is a 20px number, the step name in `.t-title`, and the answer in mono. The number is hollow when unanswered, ink when answered, and accent while active (the active row also gets the accent wash). The active step unfolds under its row: the question, a glyph grid, then the chosen option's fields in a grey well under a muted caption. The card ends, under a hairline, with Discard, **Next: <step>** and Save/Add.<br>**The Pattern well** (item 12): first a **field preview**, then the option's fields. The preview is the whole grid of the active breakpoint at full well width, one square per cell, keeping the grid's ratio (a grid so tall it would push the fields out of view is capped at `--field-preview-max-h`, 240px, and drawn narrower, centred): selected cells in greys from paper (0) to ink (1), the pattern's value there with the current seed; unselected cells in `--grey-200`. Under it, a 6px 0–1 scale (paper to ink) between a mono "0" and "1". It changes live with every field. It is hidden from assistive tech (the fields carry the values) and shown for Random, Noise and Gradient; Constant has none, because its field is one flat value. The field labels have hints that say what each param does. **Noise** also puts a tertiary "ⓘ How noise works" button at the right of the options bar, which opens the **Explainer popover** | Operations, open |
| **Glyph grid** | Cells at `--glyph-w` or wider (`auto-fill`): a mono label over a 43px artwork slot. Hover washes; selected is a white tile with a 2px ink ring | Operation step options |
| **Popup** | A white panel, radius 12, `--shadow-float`, with no frame or black title bar | Reports after an action where nothing happened: an import refused, an export failed, a Tiles refusal (a taken name, a tile in use, the last variant, the last non-zero weight), a palette refusal (the last entry, the last non-zero weight) |
| **Explainer popover** | A non-modal popover like the Tile picker's (white, radius 12, `--shadow-float`, `--space-6` padding, placed as in *Explainer placement*, at most 340px wide): a `.t-title` heading with a ✕, then `.t-body` running text, each param as a `.t-title` name over a muted explanation, small ink-and-grey bars for measured figures, and a muted note under a hairline. Esc, ✕ or a click outside closes it, and focus returns to the trigger. It explains; it never holds a control. It is the one exception to "explanations are hints": an explanation too long for a hint and needed without a mouse goes here | "How noise works" (the Pattern step under Noise): patches, Cells per feature (patch size, not shares), Octaves (the middle bias, measured: equal entries paint about 23/52/26, 15/68/17, 12/75/14 for 1, 2, 3), the ends advice (about 3× under 2 octaves), and that the ≈% belongs to the position in the list |
| **Explainer placement** (batch 02, T-03) | Placed from the panel's measured size, never a guess. In the sidebar it opens **beside the sidebar**, over the preview, `--space-4` from the sidebar's edge, level with its trigger's top, moved up just enough to stay `--space-4` inside the window; a panel taller than the window sits at the top margin and scrolls. It covers only its own width of the preview, never the whole picture (Pol, D-04). Where it does not fit beside the sidebar (the stacked layout below 40rem, or a preview column narrower than the panel), it hangs below its trigger, or above when it does not fit below and above has more room, right edge to the trigger's right edge; it scrolls when taller than that side. The heading names what it explains, because beside the sidebar it no longer touches its button | "How operations work", "How randomness works", "How noise works" |
| **Tour** (`Tour`, `tour.ts`) | A native modal `<dialog>` over the whole window: a 40% ink scrim with the target cut out and ringed in ink (two targets on step 6), and a step bubble (an Explainer-like panel: the step's name and "3 of 9", the text, then Skip tour, Back and Next). Step 1 is a centred Welcome card. See *Onboarding: the tour* | First visit, and "?" in the top bar |
| **Notice** (`Notice`, `NoticeStack`, `notices` store, `advisories.ts`) | A 360px white card, radius 8, `--shadow-float`, never blocking. It holds a 16px icon, then the title in `.t-title`, data (file names, numbers) in ink `.t-console`, a muted `.t-body` explanation, optional tertiary actions, and a 28px ✕. An advisory has the `info` icon in ink. A failure has the `alert` icon in `--color-danger`, which is its only colour: no edge, no fill. ✕ dismisses it until its condition changes. A notice goes away by itself when its condition does | Asset load failures (one notice for all), files that did not attach in Tiles (one notice per drop), advisories 1, 2, 3, 4, 5 and 7, an import's upgrade and unreadable pictures |
| **Inline advisory** (`Advisory`) | A muted `info` icon and a muted `.t-body` line under the control it is about. No box, no colour, no ✕. It shows only while its condition holds. Constant's kept-entries line in the palette uses it too | Advisories about one control: duplicate tile names (6) and rotation ends (9). Advisory 8 (palette reordered under random) is retired: under Random the palette has no order to change |
| **Dialog** (`Dialog`) | The Popup panel asking one question. The title is the question ("Change columns to 8?"), and the body says what changes and how to undo it, with any affected operations listed in a well. Buttons: Cancel (secondary), then the verb that names the action (primary, at the far right: "Change columns", not "OK"). Danger is in the words, never in red. Focus starts on Cancel, Esc cancels, and focus returns to the trigger | Destructive resize (E12), unsaved changes. New is now the **New tileset** Form popup |
| **Form popup** | The Popup panel holding a few choices before an action. Unlike a Dialog it asks no question: it is a `role="dialog"` (not alertdialog) with a noun title ("Export image") and a ✕. The body is fieldsets, each with a `.t-label` legend, then an optional Inline advisory and a summary line, then Cancel (secondary) and the verb that names the action (primary, at the far right: "Download PNG"). Focus starts on the first field, Esc or Cancel closes it, and focus returns to the trigger | Export image, **New tileset**, **Tile gallery** |
| **Radio list** | One choice from a short list whose options need more than a word. A field-grey well (`--color-field`, radius 6) of 30px rows, each a 12px ring dot, the label, and a mono value at the right. The chosen row is ink with white text and a filled white dot. Hover darkens a row one step. It is a `radiogroup` of native radios: Tab enters on the chosen row, the arrow keys move and choose | Export image's size |
| **Export image** (a Form popup) | **Size** (a Radio list): first `Design width · 1000 px` (the saved file's design width, `layout.referenceWidth`, the Grid & size field; not the preview's width, so the handles never change the image. Pol, X3b), then one row per breakpoint bound (`boundsOf(rules)`, ascending), named by the rule that sets it, using the sidebar's "Rule N" number: `Breakpoint 2 · 768 px`. A rule with both a min and a max width names two bounds; both rows carry its number and the px tells them apart. A bound that two rules name lists both: `Breakpoint 2 + 3 · 1024 px`. There is no "base" or "rule N" label at the right. A bound equal to the design width keeps its own breakpoint row, because the rule number is what the author looks for. With no breakpoints, Design width is the one row, still shown. It opens on the size used last in the session, else Design width.<br>**Background** (Preview colour / Transparent) and **Density** (1× / 2×, 2× by default): two segmented controls side by side. The Preview colour segment carries a small swatch of `preview.background`, which keeps its own colour on the chosen ink segment.<br>While the preview draws a draft, an Inline advisory: "Draft not included: this is the saved tileset".<br>A **File** line: `.t-label` "File", then in mono the name and pixel size, for example `tileset-1000px@2x.png · 2000 × 1194 px`.<br>Buttons: Cancel, Download PNG. The rules for the image itself are under **Export** below | Export's Image (.png)… |
| **Width choices, swatch** | Segments on a white track in the preview bar; the chosen one is ink. The swatch is a 30px rounded square with an edge | Preview top bar |
| **Footer: Randomness** | A white card with a `.t-title` heading. It holds the seed field and a strong re-seed button; Assets on load; then Reroll assets and Preview a fresh load as two secondary buttons with the re-seed icon | Sidebar foot |

### Icons (`src/lib/ui/icons.ts`)

There is one outline family, made of Lucide paths (ISC licence). They are drawn on a 24-unit
grid, rendered at 16px with a 1.5px stroke and round caps and joins, in `currentColor`.
- The set: `fold`, `up`, `down`, `plus`, `close`, `trash`, `reseed`, `undo`, `import`, `export`,
  `new`, `more`, `check`, `info` (an advisory), `alert` (a failure; also a **Field error**), `upload` (the Tile gallery's Upload…, Lucide upload; added with S3c), `grip` (drag to reorder, Lucide grip-vertical), `swap` (change a palette entry's tile, Lucide arrow-right-left), `archive` (the zip, Lucide archive), `image` (a PNG, Lucide image), `help` (Show the tour, Lucide circle-help). A Split button's chevron reuses `fold`.
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
| Opening near the bottom | A section or group the user opens scrolls into view once it has slid open: until its bottom shows, never past its own header, never under a stuck section header. Already visible: no scroll. Smooth, instant under `prefers-reduced-motion` (`ui/reveal.ts`) |

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
| The gallery's cells are toggle buttons (`aria-pressed`). A picked cell shows a check badge as well as the ring, so the state is a shape, not only a line | 4.1.2, 1.4.1, 1.4.11 | The ring and the badge are ink on white, 18.9:1 |
| Template cells are named by their visible label ("Collage"). Gallery cells have no visible label (Pol, 2026-11-09), so the cell's `aria-label` names it ("Blue 1"). In both, the thumbnail's `alt` is empty | 2.5.3, 1.1.1, 4.1.2 | The name already says what the picture is, so describing it again would be noise. 2.5.3 does not apply to a gallery cell, because it has no visible text |
| Each gallery grid (My tiles, Collection) is one Tab stop with arrow-key movement (roving `tabindex`), like the Tile picker. Space or Enter toggles | 2.1.1, 2.4.3 | 21 cells, and later more, would otherwise be 21 Tab stops |
| The gallery's "N picked" line is a polite live region | 4.1.3 | It says what a toggle did without moving focus |
| A Field error names the problem in words, is tied to the field (`aria-invalid`, `aria-describedby`), and takes focus to the field | 3.3.1, 3.3.2, 4.1.2 | Shown on Add, never while typing |
| The tour is a modal `<dialog>`: the editor behind it is inert, Tab stays in the bubble, Esc skips, and focus returns to "?" after a replay. Each step is announced by a polite live region, because focus lands on the same Next button every time | 2.1.2, 2.4.3, 4.1.3 | Skip tour is on every step but the last, where Done ends it the same way |
| The tour's ring is ink with a white halo on a 40% ink scrim, and the bubble's text is on white, so its contrast is the editor's own (ink 18.9:1, muted 6.5:1) | 1.4.3, 1.4.11 | The ring is not the accent, so it is never mistaken for the focus ring on Next |
| Notices are announced without taking focus: advisories in a polite live region, failures in an assertive one. A failure is told apart by its icon's shape and its words, not by colour alone | 4.1.3, 1.4.1 | Dialogs are modal `<dialog>`s with `role="alertdialog"` |

## Naming

Components are PascalCase nouns (`Section`, `TileGroup`, `TileAsset`, `OperationCard`,
`OperationBody`, `OperationGlyph`, `GlyphGrid`).
- Generic primitives live in `src/lib/ui/`: `Icon`, `IconButton`, `AddBar`, `Collapsible`,
  `FieldRow`, `Hint`, `InlineEdit`, `Toggle`, `Button`, `SplitButton`, `Menu`, `RadioList`, `Popup`, `Dialog`, `Notice`, `Advisory`, `Slider`, `Marquee`,
  `OperationGlyph`, `GlyphGrid`, `ScrollArea`. Alongside them: `icons.ts`, `keys.ts` and
  `motion.ts`.
  Also `reveal.ts`.
- Sidebar sections, the top bar and the footer live in `src/lib/sections/`.
- The tour is `src/lib/Tour.svelte`, with its step model and seen flag in `src/tour.ts`.
- Tile rows live in `src/lib/tiles/`.
- The operation card, body and labels live in `src/lib/operations/`.

Every new `.ts` or `.svelte` file under `src/` needs a page in
`apps/docs/src/content/docs/editor/`, or the docs coverage check fails.

## Preview gestures and hidden operations (batch 02, session A)

- **Rectangle drag** (T-01). While an operation's Selection is a rectangle, the preview takes a
  crosshair and a drag draws a dashed `--color-selection` outline, unfilled; the fill is the
  selection overlay's. The outline follows the pointer past the grid; the overlay, and the values,
  stop at the edge (D-01). A one-cell hover outline shows where a drag would start. The readout
  under the picture, as the brush's, reads `rectangle · x, y · w × h` in mono.
- **Hidden operation** (T-02). An `eye` icon button (28px, `aria-pressed`, one label "Hide
  operation N") leads the card's actions; pressed, it shows `eye-off` in ink. A hidden card says
  **Hidden** in console type, muted, before its actions; its index square goes hollow (ink ring
  on the well) and the attribute name takes `--color-muted` (6.5:1 on white, 5.5:1 on the
  ground). Thumbnails fade to 50%; they are pictures, not text. No opacity on text, so contrast
  holds (1.4.3), and the state is in words and shape, not colour alone (1.4.1).

## Starters: templates and the tile gallery (B-016, S2)

Picked by Pol at S1 (`docs/plans/starters-onboarding.md`, "S1 picks"). The sizes here are Claude's,
judged by WCAG 2.2 AA. Every token named here is in `tokens.css` (the last ones came with S3c).

### New tileset (a Form popup)

New no longer asks the "Start a new tileset?" Dialog. It opens **New tileset**, which holds the
choice and the warning, so it is one step, not a menu and then a Dialog.

- **Title** "New tileset" and a ✕. It is a Form popup: `role="dialog"`, Esc or Cancel closes, and
  focus returns to New.
- **Start** (fieldset, legend hidden from sight but not from assistive tech): a **Radio list,
  described**, with two rows, **Empty** ("A blank grid. Add your own tiles.") and **From
  template** ("A finished tileset to change and learn from."). It opens on Empty, which is what
  New did before.
- **Template** (fieldset, `.t-label` legend "Template"): shown only while From template is
  chosen, directly under the Start well. It is a **Template list**, which shows even when there is
  one template, so a second template changes nothing to learn (Pol, S1). Its first template is
  chosen when it appears.
  - In the S1 mock the list sat inside the chosen ink row. It is moved out, under the well, so
    each group of radios stays its own `radiogroup` with its own name.
  - In the mock the chosen template had an accent ring. That is replaced by the ink ring:
    the accent means "what you are editing now" and nothing else.
- **The warning**, the **Loss warning** line (`lib/LossWarning.svelte`, Pol, 2026-11-09): an
  alert icon in `--color-danger`, then "**Everything in the current tileset is lost, and it can't
  be undone.** Export it first to keep it." in `.t-body`, the first sentence semibold. It fits on
  one line, so the popup is `wide` (592px, in place of Popup's 480px). Import's question
  ("Replace the current tileset?", a `wide` Dialog with Cancel and **Import**) shows the same
  line; it is asked only after the file validates, and skipped when the current tileset has no
  tile groups, operations or breakpoints. The red is on the icon only; the words carry the danger.
- **Buttons:** Cancel (secondary), then the verb, which follows the choice: **Start new** for
  Empty, **Open <template name>** ("Open Collage") for a template.
- **While a template loads**, the verb reads "Opening…" and is disabled, and the popup stays open.
  On success it closes and the document is replaced through the same sequence as Import. If it
  fails, nothing is replaced: the popup closes and the existing "Import refused" Popup reports it,
  with the template's name in place of the file's ("Collage was not opened. …"). Closing the popup
  during the load (Esc) abandons it, and nothing is replaced.
- **While the template list loads** (the first time From template is chosen; the list is then kept
  for the session), the Template fieldset holds a muted "Loading templates…". If it cannot load,
  the fieldset holds a Field error ("Couldn't load the templates: <reason>") and the verb stays
  disabled. Choosing From template again retries. Both lines are `role="status"`.
- **The summary** ("6 tile groups · 6 operations") wraps between its parts, never beside the "·".
- **Hover** on a template card that is not chosen draws a 1px ink ring, one step under the chosen
  2px ring.

**Radio list, described** is a variant of the Radio list. Each row is at least 52px
(`--radio-described-h`): the 12px ring
dot, the label in `.t-xs`, and under the label a muted `.t-body` line. The padding is `--space-5`
above and below and `--space-4` at the sides. The chosen row is ink with white text, and its
description is white at 75% (≈ 13:1 on ink). Everything else about the Radio list applies,
including native radios, the arrow keys and hover.

**Template list** is a Radio list of cards on the same field-grey well. Each row has a 96 × 60
thumbnail (`--template-thumb-w`, 16:10, `object-fit: cover`, `--radius-xs`), then the name
in `.t-title` and, under it, a muted mono summary ("6 tile groups · 12 operations"). Rows are white
on the well. The chosen row has the glyph grid's 2px ink ring. The thumbnail is a PNG committed
with the template, rendered once from it. It is never drawn live, because that would fetch the
whole template to show a picture.

### Opening the gallery (Tiles)

Pol, S3c, replacing the two-item Add menu S2 planned: every Add in Tiles opens the **Tile
gallery** at once.
- The Tiles section's header "+" and the "Add tile group" Add row open it to make a new group.
- A group's "Add variants to …" Add row opens it to add variants to that group.

Each trigger has `aria-haspopup="dialog"`. The header "+" still unfolds the section first.
Pictures from the computer come in through the gallery's **Upload…**, so there is no separate
"From your computer" path. Dropping files on the library or on a group is unchanged and adds at
once, because a drop has already chosen.

### Tile gallery (a Form popup)

A Form popup that adds pictures from the editor's own collection, or from the author's uploads.
What it adds depends on where it was opened:

| Opened from | Title | Hint under the title | Name field | Verb |
|---|---|---|---|---|
| Add tile group | "Tile gallery" | "Pick one or more. They become one new tile group." | yes | "Add N tiles" |
| Add variants to *Blue* | "Add to Blue" | "Pick one or more to add as variants." | no | "Add N variants" |

The hint shows only in the matching mode (Pol, S1). From the top, the popup holds:

1. **Name** (only for a new group): a `.t-label` "Name" over an Input in `.t-body` (a name is
   text, not a value), full width, as tall as `--control-h`. It starts **empty**, with no
   placeholder text. The user types the group's name (Pol, S1: the gallery will grow and get tabs,
   so a name can't be derived from where the pictures came from). Focus starts here. In variants
   mode, focus starts on the first cell.
2. **The grids**, in one scroller of their own, so the name and the footer stay put while it
   scrolls (`max-height`, leaving room for the bar, name and footer on a short window):
   - **My tiles** (Pol, S3c): the pictures the author uploaded, newest first. Its `.t-label`
     heading has **Remove picked…** (tertiary) at its right, enabled when a My tiles cell is
     picked. It opens a Dialog, "Remove N pictures from My tiles?", because the removal can't be
     undone; it never touches a tileset. Empty, the heading sits over a muted line: "Pictures you
     upload appear here." When the browser won't keep them (storage blocked), a muted line says
     "Your uploads can't be saved in this browser and will be gone when you reload."
   - **Collection**: the editor's own pictures, one flat list in the manifest's order (G1).

   Both grids use the same cells. Cells are 64px wide (`--gallery-cell`, `auto-fill` columns,
   `--space-3` apart). Each cell is a 64px square holding only its 52px thumbnail
   (`--gallery-thumb`, `--radius-xs`, the hairline ring the Tile picker's thumbnails have, field
   grey until it loads). There is **no visible label** under the thumbnail (Pol, 2026-11-09): the
   cell is named through `aria-label` only, "<group> <n>" ("Blue 1") in the collection and the
   file's name without its extension in My tiles. Hover washes the cell. A picked cell has the
   2px ink ring, and an 18px ink badge (`--gallery-badge`) with a white `check` sits at the
   cell's top-right, 4px in.
3. **Footer**, under a hairline (`--color-track`; Popup's `divided`). On the left, **Upload…**
   (secondary, `upload`) and the count in muted mono: "None picked", then "N picked". On the
   right, Cancel and the verb. The verb is disabled at 0 and reads "Add tiles" while disabled.
   When it doesn't fit (below about 400px), the footer wraps, with Cancel and the verb on their
   own line at the right.

**Upload…** (Pol, S3c) opens the system file picker. The chosen pictures join **My tiles**,
**already picked**, at the end of the pick order. They are **kept across reloads** in the
browser (IndexedDB, `my-tiles.ts`), so a picture uploaded once can go into any later tileset. A
picture already in My tiles is not stored twice; uploading it again only picks it. Each file is
measured as an attach would measure it first, so a file that would fail on Add never reaches My
tiles. A refused file is named in a status line under the grids (`alert` icon, then the file and
the reason).

**One Add adds every pick, from either grid, in the order picked**, which becomes the variant
order (`a1, a2…`).

**The name is checked on Add, not while typing** (the editor's commit rule):
- An empty name (after trimming) gives "Give the new group a name."
- A taken name, ignoring case and spaces as a rename does (`tileNameTaken`), gives `Another group
  is already called "<name>". Choose a different name.`
- Either one shows as a **Field error** under the field, and focus goes back to the field.
  Nothing is fetched or added. The error clears as soon as the field changes.

**On Add,** the verb reads "Adding…" and is disabled. The picked collection pictures are fetched
in full only now; the grid has shown thumbnails until this point. My tiles' pictures are read
from the browser. They then go through the same path as dropped files, so the group or its
variants are exactly what a drop would have made, and the popup closes. If the name was taken
meanwhile, the group becomes "Mix 2" rather than being refused after the work is done.
- If **every** picture fails to load, nothing is added. The popup closes and a Popup reports it,
  because nothing happened.
- If **some** fail, the rest are added and the existing attach-failure notice names the missing
  ones.

**Field error** (new): under an Input, a 16px `alert` icon in `--color-danger`, then the message
in ink `.t-body`. The field gets `aria-invalid="true"` and is described by the message. It is
the second use of the danger colour, and like the first, the colour is only on the icon, so the
words and the shape carry the meaning. It differs from a refusal Popup, because the action has
not happened yet and the user is still in the form to fix it.

## Onboarding: the tour (B-017, O2)

Picked by Pol at O0 and O1, and the text revised by Pol after O2 (`docs/plans/starters-onboarding.md`,
"O0 answers", "O1 picks" and "Tour text, revised"). Built in O3.

### When it shows

- **First visit:** no kept tileset and no seen flag. Collage opens (through the same path as New →
  From template), then the tour starts on Welcome. If Collage fails, the editor opens empty, the
  failure goes to the usual notice, and the tour still runs.
- **Seen flag:** in `localStorage`, read and written through a try/catch wrapper. Finishing
  (Done) or skipping (Skip tour, Esc) sets it. Blocked storage means the tour can show again on
  the next visit; it never breaks the editor.
- **Replay:** the top bar's **"?"** starts it again over whatever is open. It never replaces the
  user's tileset.

### Steps

The first visit has nine steps. A replay has eight: step 6 describes Collage, so it is in the
first-visit tour only.

Each step's text is a lead sentence, then short paragraphs, then, on some steps, a closing line in
the muted colour (*aside*). **Bold** marks the name of a control or a term the paragraph is about
(Pol, O3c: run-in bold rather than subheaders, which made the bubble taller). Paragraphs are
separated by " / " below.

| # | Step | Target (the cut-out) | Text |
|---|---|---|---|
| 1 | Welcome | none: a centred card | "This is the generative tileset editor. A tileset is a grid of pictures, laid out by operations that each change part of the grid, one on top of another." / "Use the gallery's pictures or upload your own, then export the tileset for a website or as an image." Aside, on the first visit: "This is Collage, an example tileset. The next eight steps show how it is made. You can skip the tour at any time." On a replay: "The next seven steps show how a tileset is made. You can skip the tour at any time." |
| 2 | Grid & size | the whole Grid & size section | "Set the cell size and the number of rows." / "**Design width** is the page width you design for: the grid gets just enough columns to cover it, and the whole tileset scales with the page at other widths." |
| 3 | Tiles | the Tiles section header's "+" (Add tile group) | "Add tile groups. Pick pictures from the gallery, or upload your own." |
| 4 | Tile group | the first tile group (Blue in Collage) | "A tile group is one tile with one or more pictures, its **variants**." / "Operations decide where the tile goes, and each of those cells draws one of its pictures." / "The **sliders** set how often each picture is drawn." |
| 5 | Operations | the Operations section header's "+" (Add operation) | "Operations fill the grid. Each one changes some cells: their tile, or its rotation, scale, offset or opacity." / "They run **from top to bottom**, and a later one paints over an earlier one." |
| 6 | An operation (first visit only) | Collage's operation 4, opened, **and** the preview's picture | "This is operation 4." / "Its **Selection** is a rectangle in the middle of the grid, outlined on the picture." / "Its **Pattern**, Random, gives each of those cells a tile: mostly Yellow, sometimes Blue, Pink or Grey." Aside: "The new tiles keep the rotation and opacity that operations 2 and 3 gave every cell." |
| 7 | Breakpoints | the Breakpoints section header | "Change how the tileset looks at different screen sizes." Aside: "Only useful if you export it for a website." |
| 8 | Randomness | the whole Randomness footer | "Everything random follows from the seed: the same seed always gives the same picture." / "**New seed** redraws every operation." / "**Re-seed**, on an operation's card, redraws only that one." / "**Reroll assets** only swaps pictures within each tile group." Aside: "ⓘ How randomness works has the rest." |
| 9 | Your own tileset | the top bar's **New** button | On the first visit: "Start building your own tileset with **New**, or close this and keep exploring Collage." On a replay: "Start building your own tileset with **New**, or close this and keep working on this one." (Pol, after O3a) |

The count is for the run in progress, "<n> of <total>". So Breakpoints is 7 of 9 on the first
visit and 6 of 8 on a replay, where the steps after step 5 move up one.

- Tiles and Operations point at the header's "+", not the Add row at the end of the section: the
  "+" is always on screen, open or closed.
- Grid & size and Randomness cut out the whole card, because their text is about the fields in it.
  A closed Grid & size section is its header.
- Text names things as the editor labels them: "rotation" and "opacity" are attributes, never
  "turn" or "fade" (Pol).
- A target that is missing points at its section's header instead (O0). With no tile groups,
  step 4 points at the Tiles header.
- **Step 6** opens operation 4's card, as pressing its title does, so the stepper shows and the
  preview draws the selection overlay (the rectangle, in `--color-selection`). Leaving the step
  by any way (Next, Back, Skip tour, Esc) closes the card again without saving: the tour never
  edits the file and never leaves a draft open.
- **If Collage fails to load** on the first visit, the tour runs as a replay does: the replay's
  Welcome and last-step text and no step 6, eight steps in all, because there is no Collage to describe.
- A target out of view is scrolled into view in its own scroller first (`ui/reveal.ts`), then in
  the page (stacked), leaving room inside the window for the cut-out and its ring. Then the
  cut-out and bubble are placed. They follow a resize or a reflow.
- The tour only points. Next always works, and the user doesn't have to do the step.

### The scrim and the cut-out

- **Scrim:** the whole window in `--color-scrim`, 40% ink
  (`color-mix(in srgb, var(--color-ink) 40%, transparent)`). It is darker than the Popup's 24%
  backdrop, because here it has to say "only the cut-out is live". The bubble is white on top of
  it, so its text contrast does not depend on it. A press on the scrim does nothing: it does not
  skip, so a stray click doesn't end the tour.
- **Cut-out:** the target's box plus `--space-2` (4px) on every side, radius `--radius` (8px).
  Nothing in it is dimmed. A step has one cut-out, except step 6, which has two: the opened card
  and the preview's picture. **Stacked**, where the open card fills the window and the picture is
  a window's height below it, step 6 cuts out the picture alone: it shows the rectangle the text
  is about, and the card, still open, is what draws it (Pol, O4). Whether the two fit one window
  is measured, as two columns is.
- **Ring:** 2px ink (`--rule-strong`, `--color-ink`) on each cut-out's edge, with a 2px white halo
  outside it so it reads on the scrim. It is ink, not the accent: the accent means focus and
  "editing now", and Next has the focus ring while the target's ring shows (Pol, O1).
- The target is **seen, not used**: the whole editor behind the tour, the cut-out included, is
  inert until the tour ends.

### The step bubble

An Explainer-like panel: white, `--radius-lg`, `--shadow-float`, `--tour-pad` (20px) padding,
`--space-7` between its rows, `--tour-bubble-w` (380px) wide, and no arrow. It is roomier than an
Explainer, and its text a step larger, because it is read once as prose rather than scanned beside
the controls (Pol, O3c: the 13px text read flat).

1. **Header:** the step's name in `.t-section` at the left, and the count in muted `.t-console` at
   the right: "3 of 9" (Pol, O1). The count includes Welcome, so the pointing steps are 2 to 9
   (2 to 8 on a replay).
2. **Text:** `--text-tour-size` (15px), ink, `--leading-tour` (1.5), `--space-6` between
   paragraphs. Bold terms are `--weight-semibold`. The aside, last, is the same size in
   `--color-muted`.
3. **Footer:** **Skip tour** (tertiary) at the left; **Back** (secondary) and **Next** (primary) at
   the right.
   - On Grid & size (step 2), Back is shown and goes back to Welcome, so every pointing step has
     the same footer (Pol, O1).
   - On the last step (Your own tileset), Next reads **Done** and Skip tour is not shown: Done and Skip
     would end the tour the same way.

### The Welcome card

The same panel, 440px wide (`--tour-welcome-w`), centred in the window: a `.t-section`
"Welcome", the text as in a step bubble (two paragraphs and the aside), then **Skip tour** (secondary) and
**Start tour** (primary) at the right. It has no count (it is the cover) and nothing is cut out.
Below 40rem it is the window's width less 16px on each side.

### Placement

The bubble is placed from its measured size, as the **Explainer placement** places an Explainer:
- **Two columns:** beside the sidebar, over the preview, `--space-4` from the sidebar's edge, level
  with the cut-out's top, and moved up just enough to stay `--space-4` inside the window.
- **Stacked (below 40rem), or where it doesn't fit beside:** below the cut-out, `--space-4` under
  it; above it when it doesn't fit below. It is the window's width less 16px on each side.
- **Step 6, in two columns:** beside the sidebar would cover the picture it cuts out, so the bubble
  stays in the sidebar column instead: below the opened card, or above it when it doesn't fit
  below, left-aligned with the card.
- **Fitting neither below nor above** (a cut-out taller than the window less the bubble: operation
  4's open card at 1440 × 900), the bubble sits at the window's bottom, `--space-4` inside it. It
  covers the cut-out's end, not its head, which names what the text is about (O3b).
- **A cut-out is the target's visible part** in its scroller, so a card taller than the sidebar
  doesn't ring the footer too (O3b).

### Behaviour

- **Modal.** The tour is a native modal `<dialog>` that covers the window, holding the scrim, the
  ring and the bubble. The top layer puts it over every popover (the Explainer, Menu and Tile
  picker's z-index 20) with no z-index of its own, and `showModal()` makes the editor behind it
  inert. This replaces O0's "a z-index above 20 and `inert` on the editor".
- **Keyboard.** Esc skips. Focus starts on **Start tour** on Welcome and on **Next** on every
  other step, and moves there again on each step. Tab stays inside the bubble.
- **Announcing a step.** The dialog is named by the step's name and count and described by its
  text. A polite live region in the bubble says "<step>, <n> of <total>. <text>" on each step, because
  focus moving to the same Next button would not announce the change.
- **When it ends** (Done, Skip tour, Esc), the dialog closes. After a replay, focus returns to
  "?". After a first-visit tour, it goes to the sidebar's first section header.
- **Motion:** the cut-out and the bubble move to the next step over `--dur-fast` with `--ease`;
  under `prefers-reduced-motion` they jump.

### "?" (Show the tour)

An **Icon button** at the right of the top bar, after Undo, with the `help` icon (Lucide
circle-help) and the label "Show the tour" (`aria-haspopup="dialog"`). It is not a document action,
so it sits with Undo, not with New, Import and Export.
- Below 40rem the top bar has no room for it beside a labelled Undo (it overflows by 24px at
  375px), so **Undo becomes an Icon button** there, labelled "Undo". Above 40rem Undo keeps its
  word.

## Sidebar motion and controls (batch 03, session B)

### Opening and closing scroll (B-028, T-05)

| What | Duration | Curve |
|---|---|---|
| A section or group's body slides open | `--dur-fast` (120ms) | `slide`'s own |
| Then the sidebar scrolls until the opened part shows (`reveal.ts`) | `--dur-slow` (300ms) | `--ease` |
| A body slides shut, and the sidebar scrolls up with it when it is near its bottom | `--dur-close` (220ms) | `--ease` |

- **Closing is a little faster than opening**, because nothing new appears: it only has to move
  the sidebar back. The scroll that leads the close and the fold share one duration and one curve,
  so the browser never clamps the scroll (that clamp was the jump B-028 reports).
- Both scrolls are driven by `tweenScroll`, not `scrollBy({ behavior: "smooth" })`, whose
  duration the browser picks. A wheel or drag during one stops it.
- Under `prefers-reduced-motion` both are instant, like the slides.
