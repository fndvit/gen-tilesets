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
   - **Changed by Pol (2026-11-09, start of S3a):** the cells show **no name** under the
     thumbnail. The label ("blau 1") stays in the manifest as the cell's accessible name
     (`aria-label`). DESIGN_SYSTEM.md is updated to match.
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

## S2 · Docs (2026-11-09)

The patterns are in `apps/editor/DESIGN_SYSTEM.md` § "Starters: templates and the tile gallery":
New tileset, Radio list described, Template list, Add menu, Tile gallery and Field error. Cross-references
were updated in Layout, Menu, Add row, Dialog, Form popup, the icons, Status, and the
accessibility table. Tokens that S3 adds are marked *(S3)*.

**Decisions made in S2, for Pol to check:**
- The mock's template list sat **inside** the chosen ink row. It now sits **under** the choices as
  its own radio group, so each group of radios has its own name for assistive tech.
- The chosen template had an **accent** ring. It is now the ink ring, because the accent only
  means "editing now".
- New tileset opens on **Empty**, which is what New did before.
- The **name field starts empty**, with no placeholder text, and focus starts there.
- An empty or taken name is refused **on Add**, as a new **Field error** (a red alert icon and
  ink words under the field), and never while typing. Taken uses the existing rename rule:
  case and spaces are ignored.
- **Variants mode:** the title is "Add to <group>", the hint is "Pick one or more to add as
  variants.", and the verb is "Add N variants".
- **Load failures:**
  - A template that fails is reported by the existing "Import refused" Popup.
  - A gallery add where every picture fails gets a Popup.
  - A partial failure uses the existing attach-failure notice.
- **New icon:** `gallery` (Lucide layout-grid). "From your computer…" reuses `import`.
- **Sizes:**
  - gallery cell 64 px, thumbnail 52 px, check badge 18 px;
  - template thumbnail 96 × 60;
  - described radio rows at least 52 px.

  Every target is well above 24 px (2.5.8).

Next: **S3a** (content and loader).

## Next session plan: S3a · Content and loader

**Next session starts here.** First read "S1 picks", "S2 · Docs" and the DESIGN_SYSTEM.md section
"Starters: templates and the tile gallery". If Pol has changed any S2 decision, update the doc
first. S3a is the first block that writes editor code. It adds **no UI**: New and the Add menu
still behave as today. Stop for Pol at the end.

### What exists (checked 2026-11-09)

- **The source:** `../tileset-files/picsBackground/`, with `tileset.json` (schemaVersion 2,
  engineVersion "0.0.0", 16 × 10 cells, cellSize 80, referenceWidth 1140, no breakpoints) and
  `tiles/t1..t6/aN.svg`.
  - The total is 10 MB.
  - Every SVG but `t6/a1` (149 bytes, flat red) wraps **one embedded PNG**. The PNGs are 294–852
    px square and 67 KB–1.2 MB each.
  - `t2/a1` = `t2/a3` and `t3/a2` = `t5/a3` are byte-identical pairs. Keep both files: they are
    separate assets in the file.
- **Import today:** `ImportPanel.svelte` has a local `open(archive)` (~line 202):
  - `readArchive` (`import.ts:104`) → `migrate` → a `newer` refusal → `validate`.
  - Then `File`s (via `nameOf`/`mimeOf`) → `replaceAll` → `session.open` → `drafting.discard()`
    → `notices.clear()` + `importNotices`.
  - `run()` wraps it with the busy state and reports into the "Import refused" Popup.
- **Tools present in `node_modules/.pnpm`:**
  - `sharp`, `pixelmatch`, `pngjs`, `svgo`;
  - `vite-node` (runs TS that imports the package source);
  - Playwright 1.56. Its own Chromium build is **not** installed: launch with
    `executablePath: ~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
- **Others:**
  - `apps/editor/public/` does not exist, and Vite's default `publicDir` is used.
  - Docs pages live in `apps/docs/src/content/docs/editor/`, and `pnpm --filter
    @vit-foundation/tileset-docs coverage` fails on a source file without one. A
    `.svelte.ts` page is named after the module (see `opening.md`).

### Steps

1. **Compress (scratchpad scripts, nothing committed but the output).**
   - **Encode:** for each SVG, decode the embedded PNG with `sharp` and re-encode it as WebP at
     the **same pixel size**. Try lossless first and keep it if it is smaller; otherwise use
     lossy q 90. Swap the data URI's MIME and leave the SVG's markup alone. `t6/a1` is skipped.
   - **Compare:** render each SVG before and after in headless Chromium, at the embedded PNG's
     native size (the strictest case, since Collage draws cells at 80 px, so ≤ 160 device px at
     2×). Compare the two with `pixelmatch` (threshold 0.1).
   - **Accept:** an image is accepted only if **0.1 % of its pixels or fewer** differ. Any image
     that fails keeps its original bytes.
   - **Report:** build a scratch page showing every tile before and after, side by side, with
     both sizes and the diff count, and send Pol the totals. **Stop here for Pol's OK on the
     pictures** (S0 answer 4) before step 2 commits anything.
2. **Template content.**
   - Copy the folder to `apps/editor/public/templates/collage/`, in the export layout:
     `tileset.json` + `tiles/tN/aN.svg`, with the compressed SVGs.
   - Migrate `tileset.json` with the package's own `migrate()`, through a scratch `vite-node`
     script. Commit its output. **No hand-edited version number** (E2), and `engineVersion` stays
     what `migrate()` leaves.
3. **Thumbnails.**
   - **Gallery:** one 104 px square WebP per image (52 px at 2×), made with `sharp` from the
     render in step 1, saved at `public/templates/collage/thumbs/tN-aN.webp`.
   - **Template:** a 192 × 120 picture of Collage (96 × 60 at 2×). Import a zip of the folder
     into the running editor, use **Export image** at the design width, then crop and scale it
     with `sharp` to `public/templates/collage/thumb.webp`. That is the product's own drawing,
     with no new render code.
4. **Manifest:** `apps/editor/public/starters.json`, holding:
   - `templates: [{ id: "collage", label: "Collage", path: "templates/collage/",
     thumb, summary: "6 tile groups · 12 operations" }]` (count the operations from the file);
   - `gallery: [{ id, label: "blau 1", src, thumb }]`, in Collage's order. The gallery **points
     into the template's files** rather than copying them, and the manifest is what decouples the
     two when the gallery grows (Pol, S1).
   - Its TypeScript shape and a `parseManifest` that refuses a malformed one loudly live in
     `starters.ts`.
5. **Shared open sequence.**
   - Split ImportPanel's `open()` into:
     - a **pure** `prepareArchive(archive)` in `import.ts`, which returns `{ kind: "newer" }`,
       `{ kind: "invalid", errors }` or `{ kind: "ready", file, incoming, upgrades }`;
     - one side-effecting `adopt(prepared)`, in a new `adopt.svelte.ts`, which does the swap:
       `replaceAll`, `session.open`, `drafting.discard`, notices.
   - ImportPanel calls both, and its behaviour does not change. The New tileset popup uses the
     same pair in S3b.
   - Test `prepareArchive` in `import.test.ts`, moving what the panel did into cases: newer,
     invalid, migrated, and missing asset.
6. **`starters.ts` (pure, tested in `starters.test.ts`, with `fetch` injected):**
   - `loadTemplate(entry, fetch) → Archive`: fetch `tileset.json`, read each `meta.src`, and
     fetch it into the Map. A failed fetch **throws** with the path, and nothing is substituted.
   - `loadGalleryFiles(entries, fetch) → { files: File[], failures }`, in pick order, with names
     taken from `src`.
   - Tests use a fake `fetch` over an in-memory map: the happy path, a 404 on one asset, a
     malformed manifest.
7. **The template test** (`starters.test.ts`, reading the real files from `public/` with `fs`):
   - The committed `tileset.json` is at the current `schemaVersion`, `validate()` returns no
     errors, every `meta.src` exists on disk, and the manifest's paths all exist.
   - A future schema bump fails CI until the template is migrated again.
8. **Docs pages** for `starters.ts` and `adopt.svelte.ts`. Update `import.md` and
   `import-panel.md` for the split. The compression parameters and the 0.1 % rule go in
   `starters.md`, so the step can be redone for new gallery images.
9. **Change entry:** `docs/changes/starters-onboarding/B-016.md` (`Package: no`), started here
   and completed in S3c.

### Verification

- `pnpm test` and `pnpm typecheck` at the root are green.
- `pnpm --filter @vit-foundation/tileset-docs coverage` passes, and `pnpm changelog check` passes.
- `git diff --stat origin/dev -- packages/` is empty.
- **Import is unchanged:** run the editor on 5174 and drive it with a Playwright probe. Import a
  zip of `public/templates/collage/`: it opens, and its pictures draw. Then check a
  newer-version and an invalid zip still get "Import refused".
- **Nothing is fetched up front:** a fresh load's network log has no request under `templates/`
  or for `starters.json`.
- `du -sh apps/editor/public` is reported to Pol.

### Exit

Record the sizes, any images kept uncompressed, and the file names under "S3a done". Commit,
update the memory status line, and stop. The next block is **S3b**, the New tileset popup.

## S3a done (2026-11-09)

**Pol's answers in this block:**
- Gallery cells show **no name** under the thumbnail. That was recorded under "S1 picks" and in
  DESIGN_SYSTEM.md (Tile gallery item 2, and the accessibility table). The label is now only the
  cell's `aria-label`.
- Compression: **WebP q90** (chosen over lossless WebP at 5.7 MB and the originals at 10.8 MB,
  after a side-by-side page).
  - 10.8 MB → 0.86 MB.
  - pixelmatch (threshold 0.1) found 0 % of pixels differing at the native size and at 160 px.
    PSNR is 40–51 dB, and the worst channel change is 28/255 (`t4/a1`).
  - No image was kept uncompressed. `t6/a1` (a flat colour) has no raster.

**Sizes:** `apps/editor/public` is 984 KB: 21 SVGs (858 KB), 21 gallery thumbnails, and a 3 KB
template thumbnail.

**Files:**
- `apps/editor/public/starters.json`
- `public/templates/collage/`:
  - `tileset.json`, migrated 2 → 4 by `migrate()`; only `schemaVersion` changed;
  - `tiles/tN/aN.svg`;
  - `thumb.webp`, 192 × 120, from the editor's Export image at 2×, centre-cropped;
  - `thumbs/tN-aN.webp`, 104 px.
- `src/starters.ts`, `src/starters.test.ts`, `src/adopt.ts`. `src/import.ts` gains `Prepared` and
  `prepareArchive`, and `lib/ImportPanel.svelte`'s `open()` now calls `prepareArchive` + `adopt`.
- Docs: `editor/starters.md` and `editor/adopt.md` are new; `import.md` and `import-panel.md` are
  updated. The change entry is `docs/changes/starters-onboarding/B-016.md`.

**Deviations from the plan:**
- `adopt.ts`, not `adopt.svelte.ts`, because it holds no rune.
- Collage has **6 operations**, not 12. The manifest summary is "6 tile groups · 6 operations",
  and a test checks it against the file.
- Gallery files are named `<id><ext>` ("t1-a1.svg"), not by their source basename, because every
  group has an `a1.svg`.
- Gallery thumbnails come from Chromium's render of the **original** SVG.

**Verified:**
- `pnpm test`: 671 + 522 + 12 tests, all green. `pnpm typecheck` is green, as are docs coverage
  and `pnpm changelog check`. `git diff --stat origin/dev -- packages/` is empty.
- A Playwright probe on 5174 checked that:
  - a fresh load makes no request under `templates/` or for `starters.json`;
  - a zip of `public/templates/collage/` imports and draws, with no page errors;
  - a newer zip (schemaVersion 99) and an invalid zip (an unknown key) still get "Import refused".

**Next: S3b**, the New tileset popup (DESIGN_SYSTEM.md "New tileset"). It calls `loadManifest`,
`loadTemplate`, `prepareArchive` and `adopt`, and a failure goes to the "Import refused" Popup.

## S3b done (2026-11-09)

New opens the **New tileset** Form popup (`lib/sections/NewTileset.svelte`), which replaces the
"Start a new tileset?" Dialog.
- **Empty** calls App's unchanged `newTileset`.
- **From template** fetches the manifest (only then, and once per session), lists Collage with
  its thumbnail, and opens it through `loadTemplate` → `prepareArchive` → `adopt`.
- A failure is reported by **`lib/ImportRefused.svelte`**, the popup that used to live inside
  ImportPanel. It is now shared, and says "Collage was not opened. …".
- `RadioList` gains **described rows** and `legendHidden`, `starters.ts` gains **`once`** (tested),
  and the tokens are `--radio-described-h` and `--template-thumb-w`.

**Decisions made in S3b, for Pol to check:**
- The manifest is fetched when **From template** is chosen, not when the popup opens, so a plain
  New makes no request.
- If the manifest fails, the Template fieldset shows "Couldn't load the templates: <reason>" with
  the alert icon, and the verb stays disabled. Choosing From template again retries.
- Closing the popup (Esc) while a template is loading **abandons** the load, and nothing is
  replaced.
- A template card that is not chosen gets a 1px ink ring on hover. The chosen one has 2px.
- The summary wraps between its parts, never beside the "·" (seen at 320 px).

**Verified:** `pnpm test` (671 + 524 + 12), `pnpm typecheck`, docs coverage and `pnpm changelog
check` are green, and `packages/` is unchanged. A Playwright probe on 5174 checked that:
- a fresh load makes no starters request, and opening New makes none either;
- focus starts on Empty, and ArrowDown chooses From template, which fetches only `starters.json`
  and `thumb.webp`;
- Open Collage fetches the 21 pictures, opens the tileset (blau, seed north-quarry-83) and closes
  the popup;
- reopening starts on Empty and does not fetch the manifest again, and Start new empties the
  document;
- a 404 on one picture gives "Collage was not opened… /templates/collage/tiles/t1/a1.svg: HTTP
  404", and the document is unchanged;
- a manifest 500 shows the load error, and choosing From template again retries and succeeds;
- Esc during a slow load leaves the document unchanged;
- at 320 px the dialog is 282 px wide, with no overflow.

**Next: S3c**, the tile gallery (the Add menu and the gallery popup).

**After S3b (Pol, 2026-11-09):** Collage's tile groups are renamed from Catalan to English:
- blau → **Blue**, verd → **Green**, rosa → **Pink**;
- groc → **Yellow**, gris → **Grey**, solid red → **Solid**.

The gallery labels follow ("Blue 1"). Only `name` changed, not the ids, so generated output is
unchanged.

## Next session plan: S3c · The tile gallery

**Next session starts here.** First read:
- "S1 picks" (with Pol's no-visible-name change), "S2 · Docs" and "S3b done";
- DESIGN_SYSTEM.md § "Starters: templates and the tile gallery" (Add menu, Tile gallery, Field
  error).

S3c finishes B-016's UI. Stop for Pol at the end. S4, the sweep, comes next.

### What exists (checked 2026-11-09, after 940d9ef)

- **Tiles section** (`lib/sections/TilesSection.svelte`):
  - The header "+" is `Section`'s own `IconButton` (`lib/Section.svelte`, the `add()` snippet).
    It first sets `expanded = true`, then calls `onAdd`. `Section` has **no way to anchor a Menu
    on that "+"**: it takes `onAdd`/`addLabel` or an `actions` snippet.
  - The full-width `AddBar label="Add tile group"` and the "+" both call `pick(null)`.
  - A group's "Add variants to …" is `AddBar variant="square"` in `lib/tiles/TileGroup.svelte`
    (`onAdd` prop → `pick(tile)`).
  - `pick` opens one hidden file input. `onPick` calls `addGroup(files)` or
    `addVariants(tile, files)`.
  - `addGroup` reserves a tile id (`nextTileId` + `heldTileIds` + `reserved`), runs `attachAll`,
    and names the group `uniqueTileName(session.file, tileNameOf(first.name))`.
  - Failures go to `reportFailures` → the `attachFailures` notice. The section already has a
    `report(messages)` Popup ("problems"), used for a taken rename.
- **`AddBar`** (`lib/ui/AddBar.svelte`) takes `label`, `onclick`, `variant` and `disabled`. It
  has **no `attach` and no `aria-haspopup`/`aria-expanded`**, so it cannot be a Menu trigger yet.
- **`Menu`** (`lib/ui/Menu.svelte`) takes `label`, `items: MenuItem[]` (`label`, `icon`,
  `onSelect`, `disabled?`), `align`, `anchor` and a `trigger` snippet that gets
  `{ open, toggle, attach }`. `SplitButton` is the worked example of a custom trigger.
- **Icons** (`lib/ui/icons.ts`): `import` exists, `gallery` does **not** (Lucide layout-grid).
- **Names** (`document.ts`): `tileNameTaken(file, name, exceptId?)` compares names trimmed and
  lower-cased; `uniqueTileName` adds " 2", " 3"….
- **TilePicker** (`controls/TilePicker.svelte`) moves between cells with the arrow keys, Home and
  End, reading the column count from the layout (`columns()`). Copy that pattern; it is not a
  shared module.
- **Starters:**
  - `loadGalleryFiles(entries, fetch, base)` returns `{ files, failures }` in pick order.
  - The manifest is held by a module-level `once` in `NewTileset.svelte`'s `<script module>`,
    with `BASE = import.meta.env.BASE_URL`.
  - `starters.json` has 21 gallery entries ("Blue 1" … "Solid 1"), each with a 104 px
    `thumbs/tN-aN.webp`.
- **`Popup`**: its body scrolls as a whole, and `actions` is a right-aligned flex row.

### Steps

1. **Share the manifest.** Move `BASE` and the `once(loadManifest…)` instance out of
   `NewTileset.svelte` into one module, e.g. `src/starters-client.ts`, so New and the gallery
   make one fetch between them. Its docs page goes with it; update `new-tileset.md`.
2. **`gallery.ts`, pure and tested in `gallery.test.ts`:**
   - `togglePick(picked, id)`: the picks in **pick order**, since that is the variant order;
   - `verbOf(mode, n)`: "Add N tiles" / "Add N variants", or "Add tiles" / "Add variants" at 0;
   - `countOf(n)`: "None picked" / "1 picked" / "N picked";
   - `checkName(file, name)`: `null`, "Give the new group a name.", or `Another group is already
     called "<name>". Choose a different name.` (through `tileNameTaken`).
3. **Icon:** add `gallery` (Lucide layout-grid, same stroke settings as the others).
4. **Menu triggers:**
   - **`AddBar`** gains optional `attach` (an `Attachment<HTMLButtonElement>`), `haspopup` and
     `expanded`, so it can be a Menu trigger. Both variants, bar and square, need them.
   - **`Section`** gains `addItems?: MenuItem[]`. When it is set, the header "+" is a `Menu`
     trigger (list right-aligned), and opening it still sets `expanded = true`. `onAdd` stays as
     it is for the other sections.
   - The items are **From gallery…** (`gallery`) and **From your computer…** (`import`). The
     group bar's list aligns left.
   - Dropping files is unchanged.
5. **`lib/tiles/TileGallery.svelte`, a Form popup** (DESIGN_SYSTEM.md § Tile gallery):
   - `mode: { kind: "group" } | { kind: "variants", tile }`. Title, hint, name field and verb
     follow the S2 table. In variants mode the title is "Add to Blue".
   - **Name:** an Input, empty, focused first. It is checked **on Add** with `checkName`. A
     **Field error** sits under it (16 px `alert` in `--color-danger`, ink `.t-body`,
     `aria-invalid`, `aria-describedby`). The error clears when the field changes, and focus
     goes back to the field.
   - **Grid:** cells are toggle buttons (`aria-pressed`, `aria-label` = the entry's label) with
     **no visible label** (Pol). They hold the 52 px thumbnail in a 64 px cell, with the 2 px ink
     ring and an 18 px check badge when picked. The grid is one Tab stop with arrow keys, Home
     and End (copied from TilePicker), and Space or Enter toggles.
   - Add the tokens `--gallery-cell` 64px and `--gallery-thumb` 52px, and remove their *(S3)*
     marks in DESIGN_SYSTEM.md.
   - **Scrolling:** the name and footer stay put while the grid scrolls, so give the grid its own
     scroller (a max-height inside the body). Popup's body scrolls as a whole today.
   - **Footer:** "None picked" / "N picked" on the left, in muted mono, as a polite live region.
     Cancel and the verb are on the right. Below 400 px the footer wraps, with the buttons on
     their own line.
   - The manifest loads when the popup opens. Loading and failure use the same
     `role="status"` lines as New tileset.
6. **The add path** in `TilesSection`:
   - On Add: the verb reads "Adding…" and is disabled. Then `loadGalleryFiles(picked…)`.
   - **Group:** pass the typed name to `addGroup(files, name)`. Re-check
     `tileNameTaken` after the await, because a group may have been committed meanwhile, and
     fall back to `uniqueTileName` rather than refusing late.
   - **Variants:** call `addVariants(tile, files)`.
   - If **every** picture fails, add nothing, close the popup and use the section's existing
     `report()` Popup. If **some** fail, add the rest and merge the fetch failures with
     `attachAll`'s into one `attachFailures` notice.
   - Gallery pictures get weight 1 (`attachAll` does that).
7. **Docs:** new pages for `gallery.ts`, `TileGallery.svelte` and the manifest module. Update
   `tiles-section.md`, `tile-group.md`, `section.md`, `ui-add-bar.mdx`, `ui-menu.mdx`,
   `ui-icons.md` and `starters.md`. Finish the change entry `B-016.md` (S3c lines), and record
   "S3c done" here.

### Decisions to make in the session (recommendation first)

- The two triggers above. Rec: **extend `AddBar` and `Section`** rather than wrapping them,
  because both are already the components DESIGN_SYSTEM.md names.
- What the gallery shows while its thumbnails load. Rec: **the field-grey cell**, as a template
  card's thumbnail does.
- Whether the gallery should hide pictures the target group already holds (variants mode). Rec:
  **no**. Adding a duplicate is legal, and the gallery cannot know what the group's pictures
  were made from.

### Verification

- `pnpm test`, `pnpm typecheck`, docs coverage and `pnpm changelog check` are green, and
  `git diff --stat origin/dev -- packages/` is empty.
- A Playwright probe on 5174 (headless shell at
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`; scripts in the scratchpad)
  checks that:
  - a fresh load makes no starters request;
  - the header "+", the "Add tile group" bar and a group's "+" each open the two-item Menu, and
    From your computer still opens the file picker;
  - in group mode, Add with an empty name and with a taken name ("blue") shows the Field error
    and adds nothing. Picking Blue 1, Pink 2 and Solid 1 with the name "Mix" adds a group "Mix"
    with three variants in pick order that draw. Only those three pictures are fetched in full;
  - in variants mode on an existing group, two pictures are appended;
  - a 404 on one picture adds the rest and shows the attach-failure notice; 404s on all of them
    show the Popup and add nothing;
  - the keyboard works: one Tab stop for the grid, the arrows move, Space toggles, and the count
    is announced;
  - at 320 px and with a 400 px sidebar, nothing overflows and the footer wraps;
  - Export → Import round-trips a document with gallery tiles.

### Exit

Record "S3c done" here, commit, update the memory status line, and stop for Pol. Next is **S4**,
the sweep (see "Part 1"), then Pol closes B-016.

## S3c answers (Pol, 2026-11-09)

At the start of S3c, Pol changed the plan above:
- **No Add menu.** Every Add in Tiles (the header "+", "Add tile group", a group's "+") opens the
  Tile gallery directly.
- The gallery has an **Upload…** button at the **footer's left**.
- Uploads join the gallery under **My tiles**, **kept across reloads** (IndexedDB), and arrive
  **already picked**. One Add adds gallery and uploaded pictures together, in pick order.

The three open decisions went with the recommendations: AddBar and Section are extended (only
with `aria-haspopup="dialog"` now, since there is no menu); a loading thumbnail is field grey;
variants mode shows every picture.

## S3c done

- Every Add opens `lib/tiles/TileGallery.svelte`, a Form popup with My tiles and Collection,
  Upload…, Remove picked…, the name Field error, and the wrapping footer.
- New modules: `starters-client.ts` (one manifest fetch for both popups), `lib/tiles/gallery.ts`
  and `my-tiles.ts`, both tested.
- Decisions beyond Pol's are listed in `docs/changes/starters-onboarding/B-016.md` (S3c lines).
- Checked in the browser (Playwright on 5174), all passing:
  - a fresh load makes no starters request;
  - both Add tile group triggers open the gallery;
  - empty and taken names show the Field error and fetch nothing;
  - Blue 1, Pink 2 and Solid 1 named "Mix" add a group in pick order, fetching only those three;
  - two PNG uploads arrive picked, and a .txt is refused with a line;
  - a mixed group adds;
  - My tiles survives a reload, and a re-upload makes no duplicate;
  - Remove picked… asks and removes;
  - the arrows, Home, End and Space work, with one Tab stop per grid;
  - variants mode appends;
  - one 404 adds the rest and names the missing picture in the notice, and all 404s give the
    Popup and add nothing;
  - nothing overflows at 320 and 400 px, and the footer wraps;
  - blocked storage shows the in-memory line and still uploads;
  - Export → Import round-trips a gallery group.

**Next: S4**, the sweep (see "Part 1"), then Pol closes B-016.

## S4a done (2026-11-09)

Pol, before S4: now that My tiles survives a reload, the tileset should too. Answers:
- **What comes back:** the tileset and its pictures (what an Export holds). Undo starts empty; the
  draft, open sections and load preview are not kept.
- **Two tabs:** the last change wins.
- **Failure:** an empty tileset and a failure notice saying why; blocked or full storage shows
  "Changes won't be kept across reloads".

Built: `browser-db.ts`, `keep.ts` (tested), `keeping.svelte.ts`, `session.resume`, `adopt(…, how)`.
Decisions beyond Pol's are in `docs/changes/starters-onboarding/B-016.md` (S4a lines).

Checked in the browser (Playwright on 5174), all passing:
- a fresh load makes no starters request;
- Collage, reloaded, comes back with the same groups, draws the same, Undo disabled, and makes no
  starters request;
- New → Empty, reloaded, is empty, and the kept pictures are gone;
- an uploaded group, reloaded, comes back, and My tiles still works;
- Tab then an instant reload keeps the edit (four times in a row);
- deleting a variant removes its picture from storage;
- Export before and after a reload is byte-identical;
- a kept file with a newer schemaVersion gives the notice and an empty tileset;
- blocked storage gives the "won't be kept" notice, and editing still works.

**Next: S4**, the sweep (see "Part 1"), with the reload checks added, then Pol closes B-016.

## S4 done (2026-11-09)

The sweep found nothing to fix, so no code changed. It ran as one Playwright probe on 5174, with
axe-core 4.10.2 for WCAG 2.2 AA (contrast and target size are both in its `wcag22aa` set). All
33 checks pass:
- **Nothing loads early:**
  - a fresh load makes no request to `starters.json` or `templates/`;
  - neither does reopening Collage on a reload.
- **The template round-trips:**
  - Collage's Export matches the committed `tileset.json` except for `engineVersion`, which Export
    stamps with the running engine's version (0.11.0; advisory, `06` **C3**, and E2);
  - its 21 pictures are byte-identical to the committed files;
  - Export → New Empty → Import → Export is byte-identical;
  - a reload exports byte-identically, with Undo disabled.
- **Gallery tiles survive:** Blue 1, Solid 1 and an upload, named "Mix", export in pick order with
  their bytes intact, and a reload exports byte-identically.
- **Keyboard:**
  - New opens with Enter, focus lands on the checked radio, ArrowDown picks From template, Tab
    reaches the card, and Esc closes and returns focus to New;
  - the gallery opens on Name, one Tab reaches the grid and one leaves it, the arrows, End and
    Space pick, and Esc returns focus to Add tile group.
- **axe AA, no violations:**
  - the editor, empty and with Collage open;
  - the New tileset popup, with From template chosen;
  - the Tile gallery, with and without My tiles, and at 320 px.
- **No overflow** at 320 px and at 1000 px (a 400 px sidebar): the editor, the New tileset popup,
  Collage open, and the Tile gallery.

**Next:** Pol closes B-016, then O0 (onboarding questions, no code).

## After S4: opening a file can't be undone (Pol, 2026-11-09)

Pol found that Undo after opening a template brought back the old tileset without its pictures
(the store had already been swapped). It was not in the plan: New → Empty already started a fresh
history for this reason, but templates went through Import's undoable path. Answers:
- **Templates and Import both start a fresh history** (`session.open`). The reload already did.
- **Import asks first**, with the same warning line as New tileset, **unless the current tileset is
  blank** (no tile groups, operations or breakpoints), so the question is skipped when it would
  guard nothing.
- **The warning** gains an alert icon and a bold first sentence, and reads "Everything in the
  current tileset is lost, and it can't be undone. Export it first to keep it." It fits on one
  line: New tileset, Import's question and the Tile gallery are 592px wide.

Commit 9fb4cf1. Details and checks are in `docs/changes/starters-onboarding/B-016.md`. The full S4
sweep was not re-run; the parts the change touched were checked in Chrome.

**Next:** Pol closes B-016, then O0 (onboarding questions, no code), in a new session.

## B-016 closed (Pol, 2026-11-09)

Pol closed B-016 after S4 and the undo fix. Nothing is left open. The change entry's "What changed"
now sums up the whole item, not only S3a.
- `BACKLOG.md` is not edited here. B-016 moves to `## Done` after the PR merges into `dev` (Pol, per
  `docs/Batch-workflow.md`, Release).
- The PR against `dev` carries B-016 and B-017 together, and is opened after O4.

**Next: O0**, onboarding questions (no code).

## O0 · What exists (checked 2026-11-09, after B-016)

Some O0 facts above predate S3c and S4a:
- "Add tile group" (the bar and the header "+") opens the **Tile gallery** directly. There is no
  Add menu.
- The sidebar order is Grid & size, Tiles, Operations, **Breakpoints** (`BreakpointsSection`, titled
  "Breakpoints"), then the footer (`SidebarFooter.svelte`) with Seed and the **New seed**
  `IconButton`.
- There are already "How operations work" and "How randomness works" `Explainer` bubbles.
  `Explainer`, `Menu` and `TilePicker` all use z-index 20.
- `localStorage` is still unused. IndexedDB (`browser-db.ts`) holds the kept tileset and My tiles.
- The tileset is kept across reloads, so a first visit is not the same thing as an empty tileset.

## O0 answers (Pol, 2026-11-09)

1. **Steps:** a Welcome step, then five steps in sidebar order. Pol added Breakpoints and left the
   wording to Claude.

   | Step | Points at | Text |
   | --- | --- | --- |
   | Welcome | nothing (centred) | "This is Collage, an example tileset. The next five steps show how it is made. You can skip the tour at any time." Buttons: Skip tour, Start tour. |
   | Grid & size | the Grid & size section | "Set the cell size and the number of rows. The columns follow from the design width." |
   | Tiles | "Add tile group" | "Add tile groups. Pick pictures from the gallery, or upload your own." |
   | Operations | "Add operation" | "Operations decide which tile goes in each cell. They run from top to bottom." |
   | Breakpoints | the Breakpoints section | "Change how the tileset looks at different screen sizes. Only useful if you export it for a website." |
   | Randomness | the New seed button | "Every picture follows from the seed. Press New seed to get a different one." |

2. **Collage is open on the first visit** (Pol's own answer, in place of "offer Collage from the
   Welcome step"). The tour uses it as its example.
   - **First visit only**, tied to the same flag as the tour. Once the tour has been seen or
     skipped, a load with nothing kept is empty, as today.
   - New → Empty still gives an empty tileset, and a reload brings that back.
3. **When it shows:** on the first visit only, remembered in `localStorage` (behind a try/catch
   wrapper). A new **"?"** button in the top bar replays it. Every step has **Skip tour**, and Esc
   skips too. Skipping or finishing is remembered.
   - **A replay runs over whatever is open.** It never replaces the user's tileset. If a step's
     target is missing, the bubble points at its section instead.
4. **Points, with a dimmed backdrop** (Pol chose this over the recommended "bubble + ring, no
   backdrop"). Next always works, and the user doesn't have to do the step. Everything but the
   target is dimmed, and the editor can't be used until the tour ends or is skipped.

**Decisions made in O0, for Pol to check:**
- On a replay, the Welcome text can't say "This is Collage", so it reads "Make a tileset in five
  steps. You can skip this tour at any time." The Collage line is used only on the first visit.
- A press on the backdrop does nothing. It does not skip, so a stray click doesn't end the tour.
  Skip tour and Esc are the ways out.
- The Breakpoints text says "export it for a website" because breakpoints only matter where the
  package draws the tileset at different widths. Export image draws one width.

**Consequences for O1–O4:**
- **This reverses one B-016 check.** S4 checked that a fresh load fetches nothing from the starters.
  A first visit now fetches `starters.json`, Collage and its 21 pictures (about 0.86 MB). Later
  visits fetch nothing, because the tileset is kept. The O4 probe checks both.
- If Collage fails to load on a first visit, the editor opens empty, the failure goes to the usual
  notice, and the tour still runs.
- The first visit is decided **before the editor mounts** (`main.ts` already restores the kept
  tileset there): no kept tileset and no seen flag → open Collage through `loadTemplate` →
  `prepareArchive` → `adopt`.
- The backdrop needs a cut-out for the target and a z-index above the Explainer, Menu and
  TilePicker's 20. While the tour is open, the editor behind it is `inert`.

## Next session plan: O1 · Mock

**Next session starts here.** Read "O0 answers" above and `apps/editor/DESIGN_SYSTEM.md`. No editor
code is written. Output: a scratch page in the session scratchpad, drawn with the editor's tokens
over a screenshot-like layout with Collage open, then Pol's picks recorded here as "O1 picks".

Draw:
- The Welcome step: centred card over the dimmed editor, both texts (first visit and replay).
- One pointing step (Tiles) in the two-column layout and stacked below 40rem: the bubble beside
  the target, the cut-out with a ring, "2 of 6", Back, Next, Skip tour.
- The last step (Randomness, in the footer): Next reads "Done".
- The "?" button in the top bar, next to New.

Questions to put with the mock:
- The backdrop's darkness (the scrim token, if one exists, else a value decided by contrast).
- Where the step count sits, and whether Back is shown on the first pointing step.

## O1 picks (Pol, 2026-11-10)

The mock was a scratch page in the session scratchpad: real screenshots of the editor with Collage
open (1440 × 900 and 375 × 812), with the tour drawn over them in the editor's tokens at the
measured positions of the real controls. None of it is in the repo.

1. **Scrim: 40% ink**, `color-mix(in srgb, var(--color-ink) 40%, transparent)`. There was no scrim
   token; the Popup's `::backdrop` (24%) was too light to say "only the cut-out is live". The
   bubble is white either way, so its text contrast does not depend on it. O2 adds a token.
2. **The step count sits in the bubble's header, at the right** (Pol's pick over the recommended
   footer-left): the step's name in `.t-title`, then a muted `.t-console` "3 of 6". The footer
   holds Skip tour (tertiary) at the left, then Back (secondary) and Next (primary) at the right.
3. **Back is shown on the first pointing step** (Grid & size) and goes back to Welcome, so every
   pointing step has the same footer.
4. **The ring is ink**, 2px (`--rule-strong`), 4px outside the target, with a 2px white halo so it
   reads on the dark scrim. The accent stays for focus and "editing now" (principle 3): Next has
   focus while the ring shows, and two pink rings would compete.
5. **"?" is an `IconButton` at the right of the top bar, after Undo**, with a new `help` icon
   (Lucide circle-help) and the label "Show the tour". At 375 px the bar is already full (a "?"
   overflows by 24 px), so **below 40rem Undo becomes icon-only** (an `IconButton` labelled
   "Undo").

**Decided in the mock, for Pol to check:**
- Welcome has **no step count** (it is the cover), a `.t-section` "Welcome" heading, and Skip tour
  (secondary) and Start tour (primary) at the right. It is centred, 380px wide.
- **The count includes Welcome**: Grid & size is 2 of 6, Tiles 3 of 6, Randomness 6 of 6. (O0's
  draft said "2 of 6" for Tiles, which was off by one.)
- **The last step has no Skip tour**: Done and Skip would end the tour the same way.
- **Tiles points at the section header's "+"**, not the "Add tile group" bar: the "+" is always on
  screen, while the bar sits at the end of an open, long section.
- **Placement is the Explainer's**: beside the sidebar over the preview, level with the target and
  moved up to stay inside the window; below 40rem it hangs below the target (above if it doesn't
  fit), full width less 16 px gutters. The bubble is `--explainer-w` (340 px) wide, `--space-7`
  padding, radius 12, `--shadow-float`, with no arrow.

## Next session plan: O2 · Docs

**Next session starts here.** Read "O0 answers" and "O1 picks" above. Add a section to
`apps/editor/DESIGN_SYSTEM.md` ("Onboarding: the tour (B-017, O2)"): the scrim token (in
`tokens.css`'s table, value 40% ink), the Tour bubble and Welcome card anatomy, the cut-out and ring,
placement, the step count, the footer and its last-step variant, keyboard (Esc skips, focus starts on
Next/Start tour, `inert` behind), the "?" IconButton and Undo's icon-only form below 40rem, and the
`help` icon in the Icons list. Write no editor code. Then stop for Pol; O3 implements.

## O2 · Docs (2026-11-10)

The patterns are in `apps/editor/DESIGN_SYSTEM.md` § "Onboarding: the tour (B-017, O2)": when it
shows, the six steps and their targets, the scrim and cut-out, the step bubble, the Welcome card,
placement, behaviour, and "?". Cross-references were added to the token table (`--color-scrim`,
`--tour-welcome-w`), the top bar in Layout, the patterns table (**Tour**), the icons (`help`), the
accessibility table and Naming. Tokens and files that O3 adds are marked *(O3)*.

**Decisions made in O2, for Pol to check:**
- **The tour is a native modal `<dialog>`** covering the window, holding the scrim, the ring and the
  bubble. The top layer puts it above the Explainer, Menu and Tile picker (z-index 20) with no
  z-index of its own, and `showModal()` makes the editor inert and keeps Tab in the bubble. This
  replaces O0's "a z-index above 20 and `inert` on the editor": the browser does both, the way
  `Popup` already relies on it.
- **Operations points at its header's "+"**, like Tiles (O1), so both targets are on screen
  whether the section is open or closed.
- **Focus** starts on Start tour (Welcome) and on Next (every other step), and moves there on each
  step. A polite live region announces "<step>, <n> of 6. <text>", because landing on the same
  Next button again would say nothing new.
- **After the tour**, focus returns to "?" after a replay. After a first-visit tour, which no
  button opened, it goes to the sidebar's first section header (Grid & size).
- **Motion:** the cut-out and bubble move between steps over `--dur-fast`, and jump under reduced
  motion.
- **The Welcome card** is the window's width less 16px on each side below 40rem.

## Tour text, revised (Pol, 2026-11-10)

Pol proposed richer text after O2. Claude reviewed and reworded it, and Pol approved the result.
The full table is in DESIGN_SYSTEM.md § "Onboarding: the tour", "Steps". In short:

- **Eight steps on the first visit, seven on a replay** (corrected at O3a: this said nine and eight, one too many): Welcome, Grid & size, Tiles, **Tile group**
  (new), Operations, **An operation** (new, first visit only), Breakpoints, Randomness.
- **Welcome** has two paragraphs. The first introduces the editor (operations, the gallery or your
  own pictures, export for a website or as an image). The second is the Collage line on the first
  visit, or "The next six steps show how a tileset is made." on a replay.
- **Grid & size** explains Design width (the page width you design for; just enough columns to
  cover it; the tileset scales at other widths) and cuts out the whole section.
- **Tile group** points at the first group: a tile with one or more pictures (variants), and the
  sliders set how often each is drawn. Generic, so it works on a replay.
- **Operations** is reworded: the old "decide which tile goes in each cell" was wrong for rotation,
  scale, offset and opacity operations.
- **An operation** opens Collage's operation 4 (a rectangle, Random, Yellow 5 / Blue, Pink, Grey 1)
  and says its tiles keep operations 2 and 3's rotation and opacity.
- **Randomness** gives the three levels (New seed, Re-seed, Reroll assets) and points at ⓘ for the
  rest. It cuts out the whole footer.

**Pol's answers:**
- The opened-operation step is **first visit only**, because it describes Collage.
- On that step **the card and the preview are both cut out**, so the selection shows on the picture.
- Use the attributes' own names, "rotation" and "opacity", never "turn" or "fade".

**Decided while writing it in, for Pol to check:**
- On step 6 in two columns, the bubble stays **in the sidebar column**, below or above the opened
  card. Beside the sidebar, where every other step's bubble goes, it would cover the picture it cuts
  out.
- If Collage fails on the first visit, the tour runs as a replay does: the replay's Welcome text
  and no step 6.
- Leaving step 6 by any way closes operation 4's card without saving; the tour never leaves a
  draft open.

## Next session plan: O3 · Implement

**Next session starts here.** Read "O0 answers", "O1 picks", "O2 · Docs", "Tour text, revised"
above and the DESIGN_SYSTEM.md section "Onboarding: the tour". Split into blocks and stop after
each:

- **O3a · Model.** `apps/editor/src/tour.ts`, pure and tested: the eight steps (id, title, text,
  target keys, a `firstVisitOnly` flag on step 6; Welcome's shared paragraph and its two second
  paragraphs), the run's step list (first visit with Collage, or replay), next/back/skip/done
  transitions, the count "<n> of <total>", and the seen flag behind a try/catch `localStorage`
  wrapper. The first-visit rule (no kept tileset and no seen flag) in `main.ts`, which already
  runs `keeping.restore()` before `mount` (`main.ts:11`); a first visit opens Collage through
  `loadTemplate` → `prepareArchive` → `adopt`. Docs page for `tour.ts`.
- **O3b · Tour.svelte + tokens.** `--color-scrim`, `--tour-welcome-w` in `tokens.css`; the `help`
  icon in `icons.ts`. `src/lib/Tour.svelte` as a modal `<dialog>`: an SVG scrim with one or two
  cut-outs and rings, the bubble placed with `placeBeside` / `placeOnLargerSide`
  (`lib/ui/popover.ts`; in the sidebar column on step 6), targets revealed with `revealInScroller`
  (`lib/ui/reveal.ts`), re-placed on resize. Targets found by `data-tour` attributes: the Grid &
  size card, the Tiles "+", the first tile group, the Operations "+", operation 4's card, the
  preview picture, the Breakpoints header and the Randomness footer. Step 6 opens operation 4's
  card on entry and closes it, unsaved, on leaving. Docs page.
- **O3c · "?" and Undo.** "?" `IconButton` after Undo in `SidebarTopBar.svelte`; Undo an
  `IconButton` below 40rem. Wire the tour into `App.svelte`.
- Verification as in "Verification (every implementation block)". O4 is the sweep.

## Next session plan: O3a · Model and first visit (detail)

**Next session starts here.** Branch `starters-onboarding`, last commit "O2, the tour's text
revised". Read, in order: "O0 answers", "O1 picks", "O2 · Docs", "Tour text, revised", the O3
overview above, and DESIGN_SYSTEM.md § "Onboarding: the tour". O3a writes **no Svelte UI**: the
tour does not show yet. Stop for Pol at the end.

### What exists (checked 2026-11-10)

- `src/main.ts` runs `keeping.restore()` and then `mount(App)`. `restore()` (`keeping.svelte.ts:104`)
  returns `Promise<void>` and returns early when nothing was kept (`snapshot === null`, `:111`).
  It never throws.
- Opening a template: `manifest()` (`starters-client.ts:21`, fetched once) → `loadTemplate(entry,
  fetch, BASE)` (`starters.ts:155`) → `prepareArchive` → `adopt(prepared)` (`adopt.ts:32`), as
  `NewTileset.svelte` does ("A template opens exactly as an import of it would"). A refusal there is
  reported through `ImportRefused`; on a first visit it goes to a notice instead (O0).
- Opening an operation card: `drafting.edit(op)`; closing: `drafting.discard()`
  (`drafting.svelte.ts`). `OperationsSection.svelte:85` wraps it in `guard`, which asks first when
  another draft has changes. Needed in O3b, not here.
- `localStorage` is used nowhere yet. `browser-db.ts` is IndexedDB.
- Every new `.ts` under `src/` needs a docs page in `apps/docs/src/content/docs/editor/` (e.g.
  `keep.md`, `starters.md` are the pattern), or the docs coverage check fails.

### Steps

1. **`src/tour.ts`**, pure, no Svelte, no DOM:
   - `TourStep` = `{ id, title, text, targets: TargetKey[], firstVisitOnly?: true, fallback?: TargetKey }`.
     Target keys name `data-tour` values for O3b: `grid`, `tiles-add`, `tile-group`, `ops-add`,
     `op-example` + `preview`, `breakpoints`, `footer`. Welcome has no target.
   - The texts exactly as DESIGN_SYSTEM.md's Steps table (copy them; a test pins them to the doc
     is **not** wanted, the doc is the source and the code cites it).
   - `stepsFor(run: "first" | "replay")` → the run's list (7 or 8). The "Collage failed" case is
     `"replay"`.
   - Welcome's text: the shared paragraph plus the run's second paragraph.
   - A small state machine: `start`, `next`, `back`, `skip`, `done`; `count(state)` → "3 of 8";
     Back on step 2 goes to Welcome; the last step's primary label is "Done" and it has no Skip.
   - The seen flag: `seenStore(storage = () => globalThis.localStorage)` with `get()` / `set()`,
     every access in try/catch (a blocked store reads as "not seen" and a failed write is silent,
     per DESIGN_SYSTEM.md). Key: `gen-tilesets.editor.tourSeen` (or similar; say why at the
     point of use).
   - `isFirstVisit(keptSomething: boolean, seen: boolean)` → `!keptSomething && !seen`.
2. **`src/tour.test.ts`**: step lists for both runs (ids, totals, step 6 only on "first"),
   counts, Back from step 2, Done on the last, skip/done set the flag, a throwing storage reads
   as not seen and never throws, `isFirstVisit`'s four cases.
3. **`keeping.restore()` returns whether it reopened something** (`Promise<boolean>`): `true`
   only when a kept tileset was adopted. Update its comment and `keep`/`keeping` docs page if it
   states the return. Check every caller (`grep -rn "restore()" src`).
4. **First visit in `main.ts`**: after `restore()`, if `isFirstVisit(...)`, open Collage before
   mounting: manifest → its first template → `loadTemplate` → `prepareArchive` → `adopt`. On any
   failure, push the usual notice and carry on empty. Record which run the tour will be
   (`"first"` if Collage opened, else `"replay"`) somewhere App can read in O3b (a tiny exported
   store in `tour.ts` or a mount prop; decide and write why). Keep the logic in a testable `.ts`
   function (`firstVisit.ts` or inside `tour.ts`) taking its loaders as arguments, with a test for
   success and for each failure. Adopting must not reach undo (it doesn't for a reload; check that
   the same holds here, per "After S4").
5. **Docs pages** for each new `.ts` file; `pnpm --filter @vit-foundation/tileset-docs build`.
6. **Changelog:** `pnpm changelog check`; add an editor line only if that check asks for one.

### Verification

- `pnpm test` and `pnpm typecheck` at the root.
- Docs build passes the coverage check.
- Playwright probe in the scratchpad (pattern: an earlier session's `s3b/probe.mjs`, using
  `playwright-core` from the repo's `node_modules/.pnpm` and the cached headless shell), dev server
  on 5174:
  - a fresh profile (no IndexedDB, no localStorage) opens with Collage, and fetches `starters.json`
    plus Collage (about 0.86 MB);
  - with `localStorage` holding the seen flag and nothing kept → opens empty, no starters fetched;
  - with a kept tileset → reopens it, no starters fetched;
  - Collage's fetch blocked (route abort) → opens empty with a notice; nothing thrown.
  The flag isn't set by anything yet (the tour UI is O3b), so set it by hand in the probe.
- `git diff --stat origin/dev -- packages/` is empty.

### Exit

Commit ("Starters and onboarding: O3a, the tour's model and the first visit"), write "O3a done"
here with any decisions for Pol to check, update the memory, and stop. Next: O3b (Tour.svelte).

## O3a done (2026-11-10)

Built as planned: `tour.ts` (steps, state machine, count, seen flag), `first-visit.ts` (opens
Collage before mount, else a notice and a replay), `keeping.restore()` now returns a boolean, and
`main.ts` passes the run to `App` as the `tourRun` mount prop (unused until O3b). Tests, typecheck,
the docs build and `pnpm changelog check` pass (it asked for no line). `packages/` is untouched.

**Browser probe** (scratchpad `o3a/probe.mjs`, dev server 5174):
- A fresh profile opens Collage, and Undo is disabled. 23 starters requests: the manifest,
  `tileset.json` and the 21 pictures (0.88 MB on disk).
- A reload of that profile reopens the kept Collage and fetches no starters.
- With the seen flag set and nothing kept, the editor opens empty and fetches no starters.
- With templates blocked, it opens empty with the notice "The example tileset couldn't be opened ·
  Failed to fetch". No page error.
- With `localStorage` throwing, it is still a first visit and Collage opens. No page error.

**For Pol to check:**
1. **The step count was wrong in the docs; fixed (Pol, this session).** 8 steps on the first visit,
   7 on a replay. Welcome says "The next seven steps…" or "The next six steps…". Breakpoints is
   "7 of 8" or "6 of 7". DESIGN_SYSTEM.md and this doc are corrected.
2. **`restore()` returns whether the store *held* a tileset, not whether it reopened it.** A kept
   tileset that was refused (or a read that threw) is not a first visit. Opening Collage over it
   would clear the "couldn't be reopened" notice, and Collage's first save would overwrite the kept
   file. The O3a plan said "true only when adopted".
3. **The first-visit failure notice:** title "The example tileset couldn't be opened", the reason as
   data, then "You're starting with an empty tileset. New → From template can open it later."
4. **Collage is found by id (`"collage"`), not as the manifest's first template,** because step 6
   describes it.
5. **The run reaches App as a mount prop** (`tourRun: "first" | "replay" | null`), not as a store in
   `tour.ts`, so the model stays pure.
6. **The seen flag is in `localStorage`, key `gen-tilesets.editor.tourSeen`, value `"1"`.**
   `end(seen)` sets it for Done, Skip tour and Esc alike.
7. **Not part of O3a:** the docs build had been failing since "After S4" (9fb4cf1), because
   `LossWarning.svelte` had no page. I added `loss-warning.md`.

### After O3a: a last step (Pol, 2026-11-10)

Pol added a final step pointing at **New**: "Start building your own tileset with 'New', or close
this and keep exploring Collage". Claude asked about replays, and Pol answered:
- **It is in every run.** On a replay (and on a first visit whose Collage failed) its text is
  "Start building your own tileset with New, or close this and keep working on this one."
- **The title is "Your own tileset".**
- So the tour is **9 steps on a first visit and 8 on a replay** again. Those are the doc's original
  numbers, which now match its table. Welcome says "The next eight steps…" or "The next seven
  steps…". Breakpoints is "7 of 9" or "6 of 8". Done and the missing Skip tour move to the new step.
- Target key `new`: in O3b, the top bar's New `Button` (`SidebarTopBar.svelte:92`) carries
  `data-tour="new"`.
- Claude wrote "New" without quotation marks, as the other steps write the editor's labels
  ("New seed", "Re-seed").

DESIGN_SYSTEM.md (row 9 of the Steps table, the counts, the last-step footer), `tour.ts`, its test
and `tour.md` are updated. Item 1 above is replaced by this.

**Next: O3b** (`Tour.svelte`, the tokens, the `help` icon).

## Next session plan: O3b · Tour.svelte (detail)

**Next session starts here.** Branch `starters-onboarding`, last commit "the tour ends on New".
Read, in order: "O1 picks", "Tour text, revised", "O3a done" and "After O3a: a last step" above,
then DESIGN_SYSTEM.md § "Onboarding: the tour" (all of it: Steps, the scrim and the cut-out, the
step bubble, the Welcome card, Placement, Behaviour). Read `tour.ts` and `first-visit.ts`; they are
the model, and O3b only draws it. O3b ends with the tour **showing on a first visit**. "?" and the
replay are O3c. Stop for Pol at the end.

### What exists (checked 2026-11-10)

- **The model**, `src/tour.ts`: `start(run)`, `current`, `next` (`null` past the last), `back`,
  `count` ("3 of 9"), `primaryLabel`, `showsSkip`, `end(seenStore())` (sets the flag, returns
  `null`). `TargetKey` lists the nine `data-tour` values, and `TourStep.fallback` is used by Tile
  group (→ `tiles-header`).
- **The run**: `App.svelte` has the prop `tourRun: TourRun | null` from `main.ts` (null when this is
  not a first visit). Nothing reads it yet.
- **Placement helpers**, `lib/ui/popover.ts`: `placeBeside(sidebar, anchor, viewport, size,
  margin)` returns `{top, left, maxHeight}`, or `undefined` when there is no room beside the sidebar
  (it measures, with no media query). `placeOnLargerSide(anchor, viewport, height)` returns
  `{top, left, right, up}`. Both are already tested (`popover.test.ts`). `Explainer.svelte` is the
  pattern for using them.
- **Revealing**: `revealInScroller(element, topInset, behavior)` in `lib/ui/reveal.ts`.
  `Collapsible.svelte` `stuckAbove()` shows how to work out the sticky header's inset.
- **A modal `<dialog>`**: `lib/ui/Popup.svelte:76` calls `showModal()`. Follow it for focus
  return and Esc (`cancel` event → skip, with `preventDefault` so the tour closes the dialog itself).
- **Nothing takes a `data-tour` attribute yet, and no component spreads rest props.** Each target
  needs a small optional prop:
  | Key | Element | How |
  |---|---|---|
  | `grid` | Grid & size's whole card | `Collapsible` root, via a new `Section`/`Collapsible` prop `tour` |
  | `tiles-add` | the Tiles header's "+" | `Section` `tourAdd` → a new `IconButton` prop `tour` |
  | `tiles-header` | the Tiles header | `Collapsible` `.heading`, via a new prop `tourHeading` |
  | `tile-group` | the first `TileGroup` | `TilesSection.svelte:237`, on the first group's root |
  | `ops-add` | the Operations header's "+" | as `tiles-add` (`OperationsSection.svelte:130` is its own `IconButton`; check which "+" is the header's) |
  | `op-example` | Collage's operation 4, `op6` (the `rect` one) | `OperationCard.svelte:117` `<article>`, a `tour` prop set by `OperationsSection` on the 4th card |
  | `preview` | the picture | `.stage` in `App.svelte` (around the `<Tileset>`, `bind:box={renderBox}`) |
  | `breakpoints` | the Breakpoints header | `tourHeading` on its `Section` |
  | `footer` | the Randomness card | `SidebarFooter.svelte:63` `.fixed` |
  | `new` | the top bar's New | `SidebarTopBar.svelte:92`, a new `Button` prop `tour` |
  Keep these as plain optional props (`tour?: string`) and write the reason once, in `Section.svelte`:
  the tour finds its targets by attribute, so a label change can't break it. Rejected: finding
  them by `aria-label` or by class.
- **Opening operation 4**: `opening.open(id, "attribute")` (`opening.svelte.ts`), which is what
  pressing the card's title does (`OperationCard.svelte:126` → `onSelect("attribute")`). It goes
  through `guard` and asks Operations to reveal the card. Closing: `drafting.discard()`. On a first
  visit no draft is open, so `guard` never asks. Find the op by position (the 4th) **and** check
  that it is `op6` with a `rect` selection. If not, skip the opening and point at the Operations
  header, so a changed Collage can't open the wrong card.

### Steps

1. **Tokens and icon.** In `tokens.css`, add `--color-scrim:
   color-mix(in srgb, var(--color-ink) 40%, transparent)` and `--tour-welcome-w: 380px`. In
   `icons.ts`, add `help` (Lucide circle-help), as DESIGN_SYSTEM lists it. `icons.test.ts` may count
   the icons; update it if so. Remove the *(O3)* marks in DESIGN_SYSTEM.md for what is now built.
2. **`data-tour` props** as in the table. Each is optional and undefined by default, so no output
   changes.
3. **`src/tour-layout.ts`** (pure, tested) for the geometry, so that `Tour.svelte` holds no logic
   worth a test (CLAUDE.md, Testing):
   - `cutout(box, pad)` gives the box grown by `--space-2` (4px).
   - `scrimPath(viewport, cutouts, radius)` gives the SVG path: the window with rounded holes, using
     `fill-rule="evenodd"`.
   - `placeBubble(...)` gives `{top, left, width}`. In two columns it calls `placeBeside`. Stacked,
     or with no room beside, it goes below the cut-out, or above it when it doesn't fit, at the
     window's width less 16px on each side. On step 6 in two columns it stays in the sidebar column,
     below the card or above it, left-aligned with it.
   - `resolveTarget(step, find)` gives the elements to cut out, using `fallback` when the target is
     missing. `find` is injected, so the tests need no DOM.
   - Write `tour-layout.test.ts` for all of these.
4. **`src/lib/Tour.svelte`**: props `run: TourRun` and `onEnd: () => void`.
   - On mount, `showModal()`. Inside the dialog: a full-window SVG (the scrim path, plus a 2px ink
     ring with a 2px white halo on each cut-out; the ring is not the accent), then the bubble or
     the Welcome card.
   - **The bubble.** The header has the title in `.t-title` and `count()` in muted `.t-console`.
     Then the text in `.t-body`. The footer has Skip tour (tertiary, left; only if `showsSkip`),
     then Back (secondary) and the primary button (`primaryLabel`).
   - **The Welcome card** is centred and `--tour-welcome-w` wide, with "Welcome" in `.t-section`,
     the two paragraphs, then Skip tour (secondary) and Start tour (primary). It has no count.
   - **On each step:** reveal the target in its scroller (`revealInScroller`, `instant` under
     reduced motion), then measure and place. Re-place on `resize`, and with a `ResizeObserver` on
     the targets so a reflow moves the cut-out. Move focus to the primary button. Update a polite
     live region with "<title>, <n> of <total>. <text>".
   - **Step 6:** on entry, `opening.open(op6, "attribute")` and wait a `tick` plus the slide before
     measuring. On leaving by any way (Next, Back, Skip, Esc, Done), `drafting.discard()`.
   - **Ending:** `end(seenStore())`, `dialog.close()`, then `onEnd()`. A click on the scrim does
     nothing.
   - Name the dialog with `aria-labelledby` (title and count) and describe it with
     `aria-describedby` (the text).
5. **Wire it into `App.svelte`**: `let touring = $state(tourRun)`, and render
   `{#if touring}<Tour run={touring} onEnd={() => (touring = null)} />{/if}`. The `TourRun` type
   already allows O3c to set `touring = "replay"` from "?".
6. **Docs pages** `tour-layout.md` and `ui-tour.md` (or whatever name the coverage check expects
   for `lib/Tour.svelte`; look at an existing `lib/*.svelte` page such as `import-refused.md`).
   Add the new props to the pages of `Section`, `Collapsible`, `IconButton`, `Button`,
   `OperationCard` and `SidebarFooter` where those pages list props. Run `pnpm --filter
   @vit-foundation/tileset-docs build`.
7. **Changelog**: `pnpm changelog check`.

### Verification

- `pnpm test` and `pnpm typecheck` at the root. The docs build passes.
- A Playwright probe in the scratchpad (pattern: this session's `o3a/probe.mjs`, which resets the
  profile per case with a new browser context; dev server on 5174). Take screenshots at 1440×900
  and at 375×800:
  - A fresh profile shows Welcome over Collage with the first-visit text and focus on Start tour.
    Next goes through all 9 steps. Each count is right, each cut-out lands on its target, and the
    bubble doesn't cover the cut-out.
  - Step 6 opens operation 4 and the rectangle shows on the picture. Next closes the card, and so
    do Back and Esc there. No draft is left (the card is closed and Undo is still disabled).
  - The last step reads Done, has no Skip tour, and cuts out New.
  - Esc on any step ends the tour and sets the flag; a reload shows no tour. Done does the same.
  - A click on the scrim does nothing. Tab stays in the bubble.
  - Templates blocked: the notice, then a tour of 8 steps with the replay's Welcome and last-step
    text.
  - Stacked (375 wide): the bubble is below or above the cut-out, full width less 16px on each side.
  - axe-core 4.10.2 (from the scratchpad, as S4 used it) reports no violations with the tour open.
- `git diff --stat origin/dev -- packages/` is empty.

### Exit

Commit ("Starters and onboarding: O3b, the tour"), write "O3b done" here with any decisions for Pol
to check, update the memory, and stop. Next: O3c ("?" and the icon-only Undo).
