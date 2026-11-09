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
