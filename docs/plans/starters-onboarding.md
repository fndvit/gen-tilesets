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
