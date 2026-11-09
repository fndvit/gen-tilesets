# Starters and onboarding (B-016, B-017)

Progress record for the big-task session. The plan below was approved by Pol on 2026-11-09. Answers to each block are recorded under it as they come.


## Context

Pol asked for the next batch. Every open backlog item is big (B-005, B-006, B-007, B-008, B-009,
B-010, B-016/17), or it can't be reproduced (B-013), or it's already fixed (B-022, fixed by 537507b
on `dev`). Big tasks don't run as batch tasks, so Pol chose to **start a big task instead**:
**B-016 (starter content) + B-017 (onboarding)**, previously batch 02 T-10.

Under the workflow (and Pol's review style), a big task runs as an interactive session in blocks.
Each block is analysed, confirmed, implemented, reviewed and tested before the next one starts.
The first block is questions only, with no code.

Why starters come before onboarding: B-017's "how to add tiles" step should point at the starter
picker. A new user who has no images of their own can't finish the tour without it.

## What exists (verified)

- **Fresh load is an empty document.** `newDocument()` (`apps/editor/src/document.ts:125`) gives
  5 rows, 10 columns, `tiles: []`, `operations: []`. There is no sample content, and nothing in
  `apps/editor/src` is called example, sample, starter, preset or template.
- **Adding a tile:** `TilesSection.svelte` uses the AddBar, a drop target or the header "+" →
  `addGroup` → `attachAll` (`assets.ts:206`). That creates a blob URL, measures the image, and
  stores `{url, file, width, height}` in the in-memory store. `meta.src` is the export path
  `tiles/<tileId>/<assetId>.<ext>`. The commit is `session.apply(addTiles(...))`
  (`document.ts:439`).
- **Import:** `ImportPanel.svelte`'s local `open(archive)` (~line 203) runs `readArchive` →
  `migrate` → `validate` → `File`s → `replaceAll` → `session.open` → `drafting.discard()`.
  `readArchive` (`import.ts:104`) takes a plain `Map<path, bytes>`, so a starter tileset
  **reuses this path**: fetch the `tileset.json` and each `meta.src`, then build the Map.
- **Provider:** `editorProvider` (`assets.ts:353`) draws only from the store. So starter images are
  fetched into `File`s and go through the normal attach path, and export and re-import keep
  working unchanged. Rejected: serving starters by static URL through `prefixedProvider`. Export
  needs the bytes, and sizes are measured at attach time.
- **Content:**
  - `apps/demo/public/atlas` and `kelp` are complete tilesets in the export layout (~70–110 KB of
    SVG each).
  - `../tiles` has 54 loose SVGs in families (circle, quarter, split, solid, stripes; Atlas/Beige/
    Blue/Pink colourways). One has a doubled `.svg.svg`.
  - `apps/editor/public` does not exist yet. Vercel serves `apps/editor/dist`, which is 388 KB
    now, and there is no size limit.
- **Overlay pieces for the tour:**
  - `lib/ui/popover.ts`: `placeBeside`, `placeOnLargerSide`, `keepInside`, `pressedOutside`.
  - `Explainer.svelte`: a non-modal bubble that closes on Esc, ✕ or a press outside.
  - `reveal.ts`: `revealInScroller`.
  - Sections unfold only through a `reveal` counter, and today only Operations has it wired.
  - Nothing uses `localStorage` yet. A "tour seen / skipped" flag would be the first key, wrapped
    in try/catch.
  - There is no help ("?") entry point, and there are no z-index tokens.

## Shape of the work

**Big, but no contract change is expected:**
- No schema bump, no `generate()` or drawn output change, export zip unchanged.
- `Package: no`, because it is editor only.
- Areas: editor-shell, editor-io, ui-kit, editor-state, plus the new `apps/editor/public/starters/`.
- It touches `App.svelte` (the tour layer and section reveals).
- If an answer would change a contract (e.g. a starter that is "linked" rather than copied), stop
  and flag it.

**Where it runs:**
- Branch `starters-onboarding` from `origin/dev`, with the PR against `dev`.
- Progress and Pol's answers go in `docs/plans/starters-onboarding.md` on that branch, the way
  REDESIGN_PROGRESS.md held the redesign.
- Change entries go in `docs/changes/starters-onboarding/` (`B-016`, `B-017`).
- Stop for Pol after every block.

### Part 1: starters (B-016)

**Already decided by Pol (2026-11-09):**
- **First pre-made tileset:** `../tileset-files/picsBackground`. It is an export folder:
  - `tileset.json`, schemaVersion 2, cell size 80, design width 1140, 10 rows.
  - 6 tile groups (blau, verd, rosa, groc, gris, solid red) with 21 SVGs, and 12 operations.
- **Tile gallery:** an archive of ready-made tiles, filled from picsBackground's tiles. Adding a
  tile offers two choices: **open the gallery** (a simple grid of tiles) or **add from your
  computer** (today's file picker and drop).

**Measured, and it shapes the plan:**
- picsBackground is **10 MB**. Its SVGs wrap embedded raster images (`data:image`), up to 1.2 MB
  each.
- The editor's whole build is 388 KB today. So nothing may be fetched at startup:
  - the tileset is fetched only when chosen;
  - the gallery fetches small thumbnails first and the full file only when a tile is added.

**Decided, not asked:**
- A gallery tile or a pre-made tileset is **copied** into the document like any user image. It
  keeps no link, and export is identical.
- **Pol (2026-11-09): the tileset ships migrated to the newest version and is named "collage".**
  - Run the package's own `migrate()` over the file once (v2 → v4 only rewrites `schemaVersion`)
    and commit its output.
  - `TilesetFile` has no name field, so the name lives in the folder
    (`templates/collage/`) and in the manifest's label, "Collage".
  - `engineVersion` is advisory (`06` **C3**) and is left as `migrate()` leaves it, so no version
    number is written by hand (E2).
  - A test asserts the committed file is at the current `schemaVersion` and validates. A future
    schema bump then fails CI until the template is migrated again.

**S0 · Remaining questions, no code.** Each comes with a recommendation and leads with what the
user sees:
1. **Names.** "Tile gallery" is Pol's word. What is the pre-made tileset called in the UI
   ("Example", "Starter", "Template")? Rec: **"Templates"**, since what it does is replace the
   document with one to edit.
2. **Pre-made tileset: where it is offered.**
   - (a) A "Templates…" entry next to New/Import in the top bar, plus a line in the empty
     Tiles/Operations states. Picking one replaces the document, through the existing
     unsaved-changes Dialog.
   - (b) A fresh load opens it instead of the empty document. That costs a 10 MB download on
     every first visit.
   - Rec: **(a)**.
3. **Gallery grain.**
   - (a) The grid shows every image (21). Picking one adds a new tile group with that image.
   - (b) The grid shows the 6 groups. Picking one adds the whole group with its weights.
   - (c) As (a), with multi-select into one new group.
   - Rec: **(b)**. A group is what the pre-made tileset's operations were tuned for, and it gives
     the user variants at once. Also: can a gallery image be added as a variant to an existing
     group (from the group's own "+")? Rec: yes, it is the same choice there.
4. **Weight.** Ship the SVGs as they are (10 MB, fetched on demand), or re-encode the embedded
   rasters (e.g. as WebP inside the SVG, or plain PNG/WebP files) so they are smaller? Rec:
   **re-encode** once, outside the app, if the result looks identical to Pol. Re-encoding changes
   the pictures' bytes but no editor code, so it is reversible.

**S1 · Mocks.** A scratch page, not in the repo, for the empty state, the add menu and the picker.
Pol picks.

**S2 · Docs.** Append the patterns to `DESIGN_SYSTEM.md`, with sizes decided by WCAG 2.2 AA.

**S3 · Implement, in three sub-blocks. Stop after each.**
- **S3a.** Content and loader:
  - Copy picsBackground into `apps/editor/public/templates/collage/` in the export
    layout, plus a `manifest.json` that lists the templates and the gallery entries (tile name,
    asset paths, weights, thumbnail).
  - Pull ImportPanel's `open()` out into a shared, tested `.ts` function (`openArchive`), so that
    Import and templates share one sequence.
  - Add `gallery.ts`, which is pure and tested:
    - manifest → `Archive` via an injected `fetch`;
    - gallery entry → `File`s.
  - Add a test that the template migrates and validates. Each new file gets its docs page.
- **S3b.** The template UI: the top-bar entry and the empty states, through the unsaved-changes
  guard.
- **S3c.** The tile gallery:
  - "Add tile group" (AddBar and the header "+") offers **Gallery** or **From your computer**.
  - The gallery is a simple grid popup that reuses `TilePicker`'s grid.
  - Picking a tile fetches its files, turns them into `File`s, and adds them through the existing
    `attachAll`/`addTiles` path. A group's "+" does the same with `addAssets`, if S0 Q3 says so.

**S4 · Sweep.** A Playwright probe in the scratchpad, then:
- The template round-trips through Export → Import unchanged.
- Gallery tiles survive export.
- Nothing from `templates/` loads until it is asked for (check the network log on a fresh load).
- Keyboard access, AA contrast and target size are met, and nothing overflows at 320 px or in a
  400 px sidebar.
- Then Pol closes B-016.

### Part 2: onboarding (B-017)

**O0 · Questions, no code.**
1. **Steps.** Grid & size → Tiles (pointing at the gallery) → Operations → Randomness (the New seed button),
   with or without a welcome step. Pol approves the copy for each step.
2. **When it shows.** On the first visit, remembered in `localStorage`. It can be replayed from a
   new "?" button in the top bar. Opting out is "Skip tour" on every step, plus Esc, and it is
   remembered.
3. **Does it act or just point?**
   - (a) It points, and the user does the action. Next always works.
   - (b) It waits until the user has done the step.
   - Rec: **(a)**. A tour you can't leave without finishing is worse than one you skip.
4. **Highlight.** A bubble only, or a bubble plus a dimmed backdrop with the target cut out.
   Rec: **a bubble plus a ring on the target**, with no backdrop. That keeps the editor usable
   during the tour.

**O1 · Mock.** **O2 · Docs.**

**O3 · Implement:**
- `tour.ts` is pure and tested. It holds the step model and the next/back/skip state, and stores
  the seen flag through a try/catch storage wrapper.
- `Tour.svelte` reuses `popover.ts` placement, with a fallback below 40rem, and uses
  `revealInScroller`.
- Add `reveal` counters for Grid, Tiles and the footer, the way Operations already has one.
- Add a "?" `IconButton` in `SidebarTopBar`, and give the tour a z-index above the Explainer's 20.
- Each new file gets its docs page.

**O4 · Sweep.** A probe that checks:
- Every step points at a visible target, in the two-column and the stacked layout.
- Skip and Esc are remembered across a reload.
- The tour can be replayed.
- Focus returns to the trigger.

Then Pol closes B-017.

## Housekeeping (Pol, outside the task)

BACKLOG.md isn't edited by a task. At the next BACKLOG update, move **B-022** to Done ("fixed by
537507b, batch-01 review").

## Verification (every implementation block)

- `pnpm test` and `pnpm typecheck` at the root are green.
- `pnpm --filter @vit-foundation/tileset-docs build` passes the docs coverage check for the new files.
- `pnpm changelog check` passes.
- The editor runs on 5174 and is driven by a Playwright probe in the scratchpad.
- `generate()` output is unchanged (no engine file touched). Confirm with `git diff --stat
  origin/dev -- packages/` being empty.

## First action once approved

Create the branch and `docs/plans/starters-onboarding.md` with this plan. Then put **S0's
questions** to Pol with AskUserQuestion, and write no code.

## S0 answers (Pol, 2026-11-09)

1. **Name:** "Templates". Collage is the first template.
2. **Where templates are offered:** only through **New**. The New button opens a choice with
   two options, **Empty** and **From template**. Templates do **not** appear in the Tiles or
   Operations sections, and there is no separate top-bar entry. Choosing either option still goes
   through today's unsaved-changes Dialog.
3. **Gallery grain:** the grid shows **single images (21)**, with **multi-select**. The picked
   images become one new tile group.
   - Carried forward as an assumption for S1, not yet confirmed: the gallery is also offered from
     a group's own "+", where the picked images are added as variants of that group.
4. **Weight:** compress the embedded photos **only if appearance is unaffected**.
   - S3a renders every tile before and after compression and diffs them.
   - Any tile that differs visibly keeps its original file. The result goes to Pol with the sizes.

**Consequences for S1–S3:**
- S1 mocks the New choice (Empty / From template, then the template list), the "Add tile group"
  choice (Gallery / From your computer), and the multi-select gallery grid.
- S3b becomes "the New choice", not "the top-bar entry and the empty states".

## Next session plan: S1 · Mocks

**Next session starts here.** Read this section and "S0 answers" above, then
`apps/editor/DESIGN_SYSTEM.md`. No editor code is written in this block. The output is a scratch
page (in the session scratchpad, not the repo) plus Pol's picks, recorded here as "S1 picks".

### What exists today (checked 2026-11-09)

- **New:** `SidebarTopBar.svelte:92` is a tertiary `Button` with `onNew`. `App.svelte:212` sets
  `askingNew`, and `App.svelte:621` is a `Dialog` ("Start a new tileset?", "Start new"). That
  Dialog asks **every time**, not only when there are unsaved changes. On confirm,
  `newTileset()` (`App.svelte:214`) runs `session.reset()`, clears failures and notices, then
  `replaceAll([])`.
- **Add tile group:** the section header "+" (`TilesSection.svelte:202`) and the full-width
  `AddBar` (`:232`) both call `pick(null)`, which opens the hidden file input. A group's own
  `AddBar` ("Add variants to …", `TileGroup.svelte:133`) calls `pick(tile)`. Dropping files on
  the library also adds a group, and stays "from your computer".
- **Primitives to reuse:** `ui/Popup.svelte` (modal form popup), `Dialog.svelte`, `Menu.svelte`
  (`align`/`anchor`/`trigger`), `SplitButton.svelte`, `RadioList.svelte`, `GlyphGrid.svelte`, and
  the tile picker's thumbnail grid (`apps/editor/src/controls/TilePicker.svelte`, see its docs page
  `apps/docs/src/content/docs/editor/tile-picker.md`).
- **Content:** `../tileset-files/picsBackground/` has 21 SVGs in `tiles/t1..t6/`. The groups are
  blau, verd, rosa, groc, gris and solid red; `t6/a1.svg` is a 149-byte flat colour. Use the
  real files in the mock.

### Mock variants to draw

1. **The New choice** (S0: Empty / From template).
   - **A:** `New` becomes a `Menu` trigger: "Empty", "From template…". Each then goes through
     today's confirm Dialog.
   - **B:** `New` opens one `Popup` that holds the two choices as large options (`RadioList`
     or two cards) plus the existing "Everything in this one is lost…" line, so there is **one**
     step, not a menu and then a Dialog. Under "From template", the template list (only
     Collage now) appears inline, with a thumbnail.
   - Recommend **B**: one popup replaces a two-step menu → dialog, and it has room for the
     template's thumbnail.
2. **"Add tile group"** (S0: Gallery / From your computer).
   - **A:** The header "+" and the `AddBar` open a `Menu`: "From gallery…", "From your
     computer…".
   - **B:** The `AddBar` splits into two side-by-side bars, "Gallery" and "From your computer".
     The header "+" opens the A menu.
   - Recommend **A** (one control, nothing new in the section's layout).
3. **The gallery** (S0: 21 single images, multi-select → one new group).
   - A `Popup` with a thumbnail grid. Each cell is a toggle (`aria-pressed`), at least 44 px
     (WCAG 2.2 AA target size; the exact size is decided here and recorded in DESIGN_SYSTEM.md).
   - Primary button: "Add N tiles", disabled at 0.
   - Variant **G1** is a flat grid of 21. Variant **G2** groups the cells under the source
     group's name (blau, verd…).
   - Show the state with 0, 1 and several selected, and at a 320 px-wide window.

### Questions to put to Pol with the mocks

- Pick A/B for 1 and 2, and G1/G2 for 3.
- **The new group's name** when several images are picked. Recommend: the source group's name
  if they all come from one group, otherwise "Gallery".
- **The S0 assumption:** is the gallery also offered from a group's own "+" (picked images
  become variants of that group)? Recommend yes; the same Menu applies.
- **"From template" with one template:** does it open Collage straight away, or show the
  one-item list? Recommend the list (B shows it inline anyway), so a second template adds
  nothing new to learn.

### Notes for later blocks (do not do in S1)

- S3a needs thumbnails. Picking one thumbnail per gallery image is cheap, but the photos inside
  the SVGs are large. Generate small PNG/WebP thumbnails once, outside the app, and commit them
  next to the template. The compression check (S0 answer 4) runs in the same step.
- The template's own thumbnail: render Collage once with the package's `renderImage` and
  commit the PNG. It is not drawn live, because that would fetch 10 MB to show a preview.
- Gallery images keep weight 1 when added; the template keeps its own weights.

### Exit criterion

Pol has picked a variant for 1, 2 and 3 and answered the four questions. Record them under
"S1 picks", commit, and stop. S2 (DESIGN_SYSTEM.md) is the next block.

## S1 picks (Pol, 2026-11-09)

The mocks were a scratch page in the session scratchpad, drawn with the editor's tokens and the
21 real Collage images. None of it is in the repo.

1. **The New choice: 1B.** New opens one Form popup, "New tileset", with the two choices as
   large options: **Empty** and **From template**. Choosing "From template" unfolds the template
   list inline, with a thumbnail. Under the choices is the "Everything in this one is lost…" line,
   then Cancel and the verb ("Start new" / "Open Collage"). There is no menu and no second Dialog.
   - The list shows even with only Collage in it, so a second template adds nothing new to learn.
2. **Add tile group: 2A.** The section's "+" and the "Add tile group" bar open a `Menu` with
   "From gallery…" and "From your computer…". The section's layout does not change. Dropping files
   stays "from your computer".
   - **Confirmed:** a group's own "Add variants to …" opens the same Menu. Images picked there are
     added as variants of that group.
3. **The gallery: G1.** One flat grid of the 21 images, each cell labelled with its source group
   and number ("blau 1"). Cells are toggles with an ink ring and a check, and "Add N tiles" is
   disabled at 0.
   - The hint "Pick one or more. They become one new tile group." shows **only** when the gallery
     is opened from "Add tile group", not from "Add variants to …".
4. **The new group's name is typed by the user** when the gallery creates a group. Pol: the
   gallery will grow a lot and will be reworked later, possibly with tabs, so the name can't be
   derived from the source group. The rejected recommendation was "the source group's name, or
   'Gallery'".
   - So the gallery popup opened from "Add tile group" holds a **name field**, and it is not
     shown when the popup is opened from "Add variants to …". S2 decides its place, whether it
     starts empty or prefilled, and how an empty or taken name is refused. Tiles already refuses
     a taken name.
