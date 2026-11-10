# Batch 03

## Summary

| ID   | Backlog | Task                                              | Tier         | Areas                              | Session | Depends on |
| ---- | ------- | ------------------------------------------------- | ------------ | ---------------------------------- | ------- | ---------- |
| T-01 | B-032   | Collage: remove the operation that does nothing   | contained ⚖️ | editor-shell, docs-demo            | A       | –          |
| T-02 | B-031   | More gallery tiles and a second template          | contained ⚖️ | editor-io, docs-demo               | A       | T-01       |
| T-03 | B-025   | (i) explainer for Tiles                           | contained    | editor-shell                       | C       | –          |
| T-04 | B-026   | Randomness footer distinguishable from sections   | contained    | editor-shell, ui-kit               | C       | T-03       |
| T-05 | B-028   | Closing a section scrolls as smoothly as opening  | contained ⚖️ | ui-kit                             | B       | –          |
| T-06 | B-027   | Opening an operation scrolls it into view         | contained    | operations-ui, ui-kit              | B       | T-05       |
| T-07 | B-029   | "Reseed on load" as a checkbox in a fixed place   | contained    | operations-ui, ui-kit              | B       | T-06       |
| T-08 | B-030   | After Export: what to do with the file            | contained    | editor-shell, docs-demo            | C       | T-04       |
| T-09 | B-024   | Switching "Reseed on load" keeps the picture      | big ⚖️       | engine (contract), editor-state    | –       | –          |

**Not in this batch:** B-005 to B-010 (batch 02's big tasks, still unscheduled) and B-013 (needs
the file or state it happened in). Unchanged since batch 02.

**Areas, as used here.** `tour.ts`, `first-visit.ts` and `lib/sections/*` are editor-shell;
`starters.ts` and `apps/editor/public/` (templates, gallery) are editor-io; `lib/operations/*` is
operations-ui; `lib/ui/*` and `styles/` are ui-kit. **No task edits `App.svelte`.** Session C
touches ui-kit only by appending to `tokens.css` and `DESIGN_SYSTEM.md`. Session A edits two
existing tour lines in `DESIGN_SYSTEM.md` (443, 459); B and C only append. A and C both touch
`apps/docs`, on different pages.

**Tier notes (⚖️):**

- T-01: one operation deleted from a JSON file looks trivial, but the tour finds its step by the
  operation's position and its copy counts operations, so the tour, its test and four docs pages
  change with it.
- T-02: content work, but which pictures and which template are Pol's choice (D-04, D-05).
- T-05: contained because the cause (scroll clamped while the body collapses) is inferred from the
  code, not yet watched; confirming it is part of the work.
- T-09: big because every option that does what B-024 asks either changes generated output (an
  engine rule, `02` §6.7) or makes the editor's picture differ from a website's. Option C below
  would make it a contained explanation instead.

## Decisions needed

### D-01 (T-03) Is this the Tiles explainer's text?

Context: The (i) opens the same panel as "How operations work". Draft, in its fields
(`ExplainerContent`):

- **Title:** How tiles work
- **Intro:** Tiles are the pictures the tileset is drawn with. They come in tile groups:
  operations choose a group, and each cell then shows one of that group's pictures.
- **Adding tiles:** Press + to open the tile gallery and pick from My tiles or the editor's
  collection; Upload… adds your own pictures. You can also drop image files here: on the section
  to make a new group, on a group to add to it.
- **Tile groups:** A group is one tile with one or more variants. Operations choose the group,
  never one picture, so changing a group's variants changes every cell that uses it. A group an
  operation still uses can't be deleted.
- **Weights:** A variant's weight sets how often it shows within its group; the percentage beside
  it is its share. Weight 0 never shows it. Reset weights makes them equal again.
- **Advice:** Reroll assets, in Randomness, only swaps pictures within each tile group; it never
  changes which group a cell has.

- **A)** As drafted.
- **B)** With your edits (write them in the answer).

Recommendation: **A**. It covers the three things B-025 asks for, and its last line uses the same
words as the randomness explainer and the tour.

Answer:

### D-02 (T-04) How should the Randomness footer stand apart?

Context: The footer never scrolls; the sections scroll above it. Both are white cards today, so
when a section's end meets the footer they read as one.

- **A)** Inverted: a black card with white text; its seed field, buttons and switch take an ink
  version of their colours. The strongest difference, and the only large black surface in the
  editor: the design rule "ink only for primary or selected" gets one written exception.
- **B)** A light grey card (white fields inside). Stays within the rules, but grey is also the
  sidebar's ground, so it can read as "no card".
- **C)** White card, with a black rule across its top and a soft shadow cast up onto the
  scrolling sections. The smallest change; it marks the edge, not the whole footer.

Recommendation: **A**, as B-026 suggests. It is the only one that tells the two apart at a glance
wherever the sections are scrolled, and the footer is the one card that is always on screen.

Answer:

### D-03 (T-07) Where does the "Reseed on load" checkbox sit on a closed operation?

Context: Today it is a chip after the Selection, Pattern and Blend chips, so it lands in a
different place on each card, or on a second row. It only appears on operations with a random
pattern, and that stays.

- **A)** On a row of its own below the chips, at the card's left edge: `☐ Reseed on load`. Same
  place on every card; the card is one line taller.
- **B)** In the card's header, on the right next to the hide and re-seed buttons. No extra row,
  but at the narrowest sidebar (400 px) the header wraps and the label may be cut to the box.

Recommendation: **A**. It is always in the same place and always has room for its label.

Answer:

### D-04 (T-02) Which tiles join the gallery?

Context: The gallery has the 21 Collage pictures. Material on disk:
`../tiles/` (54 SVGs: circle, quarter, filled quarter, split, solid and stripes shapes, in
Atlas A/B/C, Beige, Blue, Pink and Purple colourways), and `apps/demo/public/atlas` and `kelp`
(complete tilesets).

- **A)** The `../tiles/` shapes, grouped by colourway (Beige, Blue, Pink, Atlas…), so a group's
  variants are shapes in one palette.
- **B)** The `../tiles/` shapes, grouped by shape (all circles, all quarters…), so a group's
  variants are one shape in several colours.
- **C)** The Atlas and Kelp tilesets' pictures, as their own groups.

Recommendation: **A**. These are the most varied pictures available, and colourway groups make a
coherent tileset straight from the gallery. Doubled names such as `ce-circle-C.svg.svg` are
cleaned on the way in.

Answer:

### D-05 (T-02) What is the second template?

Context: A template opens as a whole tileset from New tileset. Collage stays the one the first
visit opens.

- **A)** Atlas, from `apps/demo/public/atlas`: already a complete tileset in the export layout,
  upgraded to the current file version.
- **B)** A new geometric template built in the session from the D-04 tiles (Pol approves a
  screenshot before the commit).
- **C)** Both Atlas and Kelp.

Recommendation: **A**. It exists, it has been looked at in the demo, and its pictures overlap the
D-04 colourways, so its tiles and the gallery's agree.

Answer:

### D-06 (T-08) Does the "what next" window show on every export?

Context: It opens after Export → Tileset (.zip) and says what to do with the file.

- **A)** Every time.
- **B)** Every time until the user presses "Don't show again" (remembered in this browser).
- **C)** Only the first export in this browser.

Recommendation: **B**. Someone exporting repeatedly while iterating shouldn't dismiss it each
time, but it shouldn't disappear before they've chosen to stop it.

Answer:

## Contained tasks

### T-01 Collage: remove the operation that does nothing (session A)

Goal: The Collage template has no operation without a visible effect.
Approach: Delete `op1` (constant tile t4 on all cells) from
`apps/editor/public/templates/collage/tileset.json`. `op6`'s rectangle and `op7`'s cell list cover
all 160 cells with blend `set`, so the picture is unchanged and `thumb.webp` stays; confirm by
generating the file before and after (same grid). Operation ids stay as they are (`op2`…`op8`).
Update everything that counts or positions operations:
- `starters.json` summary → "6 tile groups · 5 operations" (`starters.test.ts` checks it).
- `tour.ts:302`: the Rect step finds `op6` at `operations[2]`; keep checking id and Selection type
  as now. Step copy "This is operation 4." → "operation 3", "operations 2 and 3" → "operations 1
  and 2" (`tour.ts:132,136`), and the comments at `tour.ts:24,63,139,295-300`, `first-visit.ts:32`.
- `tour.test.ts:155-164`: the Collage stand-in drops `op1`.
- `DESIGN_SYSTEM.md:443,459`; docs pages `editor/tour.md`, `editor/tour-dialog.md`,
  `editor/tour-layout.md`, `editor/starters.md:42,52`.
Areas: editor-shell, docs-demo (plus the template file)
Decisions: none
Acceptance criteria:
- The template opens with 5 operations and draws the same picture as before.
- The tour's step 6 cuts out operation 3 (`op6`) and its text names the right numbers.
- `pnpm test` green, including `starters.test.ts` and `tour.test.ts`.
Risks: the historical `docs/changes/starters-onboarding/B-016.md` says "6 operations"; it is a
record, leave it.

### T-02 More gallery tiles and a second template (session A, after T-01)

Goal: The gallery offers more pictures, and New tileset offers a second template.
Approach: Per D-04, copy the chosen pictures into `apps/editor/public/` beside Collage's (a new
folder per source, e.g. `gallery/shapes/<group>/`), make their thumbnails with the procedure in
`apps/docs/.../editor/starters.md` (104×104 WebP), and add `gallery` entries to `starters.json`
under group names per D-04. Per D-05, add the template folder (`tileset.json` at the current
`SCHEMA_VERSION`, its `tiles/`, a 192×120 `thumb.webp`) and a `templates` entry with an honest
summary. No code change is expected: `starters.ts` already says new entries "simply point
somewhere else". The template rules in `starters.test.ts` (validates, opens with no upgrades,
every picture and thumbnail exists, summary matches counts) cover the new content.
Areas: editor-io, docs-demo
Decisions: D-04, D-05
Acceptance criteria:
- The gallery shows the new groups with thumbnails; picking one adds working tiles.
- New tileset lists the new template; opening it draws with no warnings and no upgrade notice.
- First visit still opens Collage.
- `starters.md` lists the new content.
Risks: download size; keep each picture as small as the Collage re-encode did and note the total
added in the change entry.

### T-03 (i) explainer for Tiles (session C)

Goal: The Tiles section has an (i) that explains adding tiles, groups and weights.
Approach: Copy the Operations pattern exactly. New `lib/sections/tiles-explainer.ts` exporting
`TILES_EXPLAINER: ExplainerContent` with D-01's text (`params` = the three named entries,
`shares: []`), tested like `operations-explainer.test.ts`, with a docs page
`apps/docs/.../editor/tiles-explainer.md` modelled on `operations-explainer.md`. In
`TilesSection.svelte`, an `info` snippet (`IconButton icon="info" label="How tiles work"`) passed
as the `Section`'s `actions`, and an `Explainer` block with the same open/close/refocus handling as
`OperationsSection.svelte:129-141,206-216`. Update `tiles-section.md`.
Areas: editor-shell
Decisions: D-01
Acceptance criteria:
- The (i) sits before the + in the Tiles header and opens beside the sidebar like the others.
- Esc, ✕ and press-outside close it; focus returns to the (i).
- `tiles-explainer.test.ts` checks the three entries and that the advice names Reroll assets.
Risks: none known.

### T-04 Randomness footer distinguishable from sections (session C, after T-03)

Goal: The fixed Randomness footer never reads as part of the section above it.
Approach: Per D-02 A: append a `.theme-ink` scope to `tokens.css` that redefines the semantic
tokens its children read (`--color-card`, `--color-ink`, `--color-field`, `--color-field-hover`,
`--color-edge`, `--color-muted`, `--color-hover`, `--color-secondary*`, `--color-selected`,
`--color-on-selected`, focus ring), the way `.theme-default` scopes them; `SidebarFooter`'s card
takes it. Components are not edited: if one hard-codes a colour the scope can't reach, fix that
by using its token, and say so in the change entry. Every pair checked at WCAG 2.2 AA (text 4.5:1,
controls and focus ring 3:1), including the pink accent on black. The explainer and tour popups
keep `.theme-default`. Per B: a grey `--color-card` on the footer only. Per C: a top rule and an
upward shadow on the footer. Record the result in `DESIGN_SYSTEM.md` (append; per A, also the
exception to principle 2) and update `sidebar-footer.md`.
Areas: editor-shell, ui-kit (append only)
Decisions: D-02
Acceptance criteria:
- With any section scrolled to its end against the footer, the two are told apart at a glance.
- Seed field, Reroll buttons, (i) and Fresh load stay readable, with hover, press and focus
  visible, at AA contrast.
- The tour's footer step still cuts out the whole footer.
Risks: Toggle/Button/IconButton may assume a light ground in a state the token list misses; the
reviewer drives each control's hover, press and focus inside the footer.

### T-05 Closing a section scrolls as smoothly as opening (session B)

Goal: Closing a section moves the sidebar as smoothly as opening it, a little faster.
Approach: First reproduce and record the cause in `status-B.md`: expected to be the browser
clamping `scrollTop` while the body collapses in 120 ms. Then in `ui/reveal.ts`: a tested
`tweenScroll(scroller, delta, duration)` (requestAnimationFrame, `--ease` curve, instant under
reduced motion) replacing native `smooth`, whose duration can't be set. Opening uses it at
`--dur-slow` (300 ms). Closing (`Collapsible.svelte`): before the body goes, compute how far the
scroll will have to drop (`max(0, scrollTop + clientHeight − (scrollHeight − bodyHeight))`) and
tween it by that amount over 220 ms while the fold also runs 220 ms with the same easing, so the
scroll always leads the collapse and no frame clamps. A pure helper computes the drop (tested).
Record the two durations in `DESIGN_SYSTEM.md` (append) and update `ui-reveal-ts.md` and
`ui-collapsible.mdx`.
Areas: ui-kit
Decisions: none (durations decided here: 300 ms open, 220 ms close)
Acceptance criteria:
- Closing a section scrolled near the bottom moves smoothly, visibly a little faster than opening.
- Opening behaves as today apart from the fixed duration.
- Reduced motion: both instant, no slide.
- `reveal.test.ts` covers the drop calculation and the tween's start/end values.
Risks: replacing native smooth also changes how opening feels; compare side by side with `dev`.

### T-06 Opening an operation scrolls it into view (session B, after T-05)

Goal: Opening an operation whose editor doesn't fit scrolls it into view, as sections do.
Approach: Move `stuckAbove()` from `Collapsible.svelte` into `reveal.ts` as
`revealOpened(element)` (finds the nearest stuck section heading for the top inset, then
`revealInScroller`), used by both `Collapsible` and `OperationCard`. Reveal only when the card was
opened by the user from its own title or chips, after the body is laid out (`tick()`); opens from
outside (`opening.revealed`, the orphan notice) keep their existing `scrollIntoView`, because two
scrolls would fight (the reason `Collapsible.svelte:96-106` gives). If the open waits behind the
"Discard your changes?" dialog, reveal after it opens, not on the click. Update
`operation-card.md` and `ui-reveal-ts.md`.
Areas: operations-ui, ui-kit
Decisions: none
Acceptance criteria:
- Opening the last operation near the bottom scrolls until its editor's end is visible, without
  pushing its top under the Operations header.
- Opening from a notice scrolls once.
- Reduced motion: instant.
Risks: closing a card still collapses instantly; out of scope here (B-028 is about sections).

### T-07 "Reseed on load" as a checkbox in a fixed place (session B, after T-06)

Goal: "Reseed on load" is a labelled checkbox that sits in the same place on every operation.
Approach: New `lib/ui/Checkbox.svelte` (a native `<input type="checkbox">` with a visible label,
24×24 px minimum target, hover/press/focus per `DESIGN_SYSTEM.md`), with a docs page and a
`DESIGN_SYSTEM.md` row (append). In `OperationCard.svelte`, the reseed chip leaves `ul.chips` and
becomes the checkbox per D-03. The open card's Pattern step replaces its Off/On `Toggle` with the
same checkbox, so one setting has one control. Writes are unchanged (`withReseedOnLoad` +
`replaceOperation`, and `draft.reseedOnLoad`). Non-random operations show no checkbox, as today.
Update `operation-card.md`, `operation-body` page and the chip row line in `DESIGN_SYSTEM.md:134`.
Areas: operations-ui, ui-kit
Decisions: D-03
Acceptance criteria:
- On every random operation the checkbox is in the same place; its label is always visible.
- Space toggles it; one undo entry per toggle, as today.
- At 400 px the card doesn't overflow.
Risks: toggling still changes the picture until T-09 is decided; this task changes only the
control.

### T-08 After Export: what to do with the file (session C, after T-04)

Goal: After exporting the tileset, the user is told in general terms how to use it on a website.
Approach: In `SidebarTopBar.svelte`'s `runExport`, after `exportZip` succeeds, open a `Popup`
(informational; `Dialog` needs an action) titled "Your tileset is downloading":
- tileset.zip holds `tileset.json` and a `tiles/` folder.
- 1\. Install the package: `npm install @vit-foundation/gen-tilesets`, with a copy button.
- 2\. Put `tiles/` and `tileset.json` in your site's public files.
- 3\. Load the file and draw it; the guide shows how for plain JavaScript and Svelte.
- A link, "Read the getting-started guide", to
  `https://github.com/fndvit/gen-tilesets/blob/main/apps/docs/src/content/docs/guides/getting-started.md`
  (no docs site is deployed; the README links the same way). Kept in one constant so it changes in
  one place.
- Per D-06: B adds a "Don't show again" button beside Close, remembered the way `first-visit.ts`
  remembers (new pure `export-next.ts`, tested, with a docs page).
Also fix `getting-started.md:21`, which still says "Download tileset.zip below the sidebar's
sections" (now Export in the top bar).
Areas: editor-shell, docs-demo
Decisions: D-06
Acceptance criteria:
- Exporting a tileset opens the window; Export image doesn't.
- The command copies; the link opens in a new tab; Esc and Close close it, focus returns to Export.
- Per D-06, "Don't show again" survives a reload.
Risks: the package is not on npm yet (404), so the command fails until the first publish; ship it
anyway, the release is pending.

## Big tasks

Not planned here; runs in its own interactive session with Pol. Nothing in this batch depends on
it.

- **T-09 (B-024) Switching "Reseed on load" keeps the picture.** Why it changes now: a flagged
  operation hashes against a different seed, `mixLoad(seed, loadSalt)`, and by design
  (`02` §6.7, `hash.ts`) salt 0 is "an ordinary value, not an identity", so the switch alone moves
  it to new random values. Question:
  **(a)** Make salt 0 the identity in the engine: with no load salt, a flagged operation draws
  exactly like an unflagged one, everywhere (editor and websites). Changes the output of every
  file with a flagged operation, so a version bump and a changelog line, and it reverses a spec
  decision on purpose. **(b)** The editor alone previews with a "neutral" salt that cancels the
  mix for the current seed. No engine change, but the editor's picture of a flagged operation
  stops matching what a website shows with no salt. **(c)** Keep it; say in the checkbox's hint
  that switching it changes the picture now (contained). In every option, after Fresh load the
  switch still changes the picture: that is what a flagged operation is for.
  Recommendation: (a). It does what B-024 asks with no editor/website mismatch, and the reason the
  spec gave against it ("an equivalence nothing needs") no longer holds.

## Execution order

- No big task blocks this batch.
- Sessions run in parallel:
  - **A** (editor-io, tour, starters docs): T-01 → T-02. Sequential: both edit `starters.json`.
  - **B** (ui-kit scroll and controls, operations-ui): T-05 → T-06 → T-07. T-05 and T-06 both
    edit `reveal.ts` and `Collapsible`; T-06 and T-07 both edit `OperationCard`.
  - **C** (editor-shell sections and top bar; appends to tokens): T-03 → T-04 → T-08.
- B and C both append to `DESIGN_SYSTEM.md` and C to `tokens.css`; A edits two existing tour
  lines in `DESIGN_SYSTEM.md`. The review reports any conflict.
