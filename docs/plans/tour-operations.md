# Tour: build Mosaic one operation at a time

Progress record. Started 2026-11-12, after a novice user's test showed that the tour's
operations part was hard to grasp. It runs on branch `tour-operations` (from `dev`), and every
block goes into one PR, opened after the last block.

## What was asked (Pol, 2026-11-12)

On a first visit, the Operations step empties the preview. The tour then goes through Mosaic's
three operations one at a time:
- Operation 1 gets one step per stage (Selection, Pattern, Attribute, Blend), and the preview
  shows each stage take effect.
- Operations 2 and 3 get one step each, and each Next adds that operation to the preview.

A third button, **Skip operations**, jumps to Breakpoints.

Answers:
- **Selection** shows the existing selection marking.
- **Pattern** changes nothing on the preview; the text explains it.
- **Blend** is its own step with no visible change.
- Operation 1's card opens at each stage.
- First visit only: a replay keeps its 8 steps.

## Blocks 1–2: copy, model, preview staging, UI (done 2026-11-12, commit 6f97609 + names commit)

- **The steps.** 14 on a first visit; the build is steps 5–11. The text is in
  `apps/editor/DESIGN_SYSTEM.md` § "Onboarding: the tour", subsection "Building Mosaic", and
  copied into `apps/editor/src/tour.ts`.
- **Pol's review.** Pol confirmed the text, then asked for the editor's own names to be bold:
  **All**, **Noise**, **Tile**, **Set**, **Special**.
- **The model, in `tour.ts`.**
  - Each step carries `build`, `ops` (how many operations the preview draws) and `open` (the
    card and stage).
  - `mosaicOperations` guards the build and `runFor` decides the run: if the open file's
    operations aren't Mosaic's three, the tour runs as a replay.
  - The other new helpers are `skipOperations`, `showsSkipOperations` and `stagedFile`.
- **The preview.** `apps/editor/src/tour-preview.svelte.ts` holds `kept`. `App.svelte`'s `shown`
  draws the first `kept` operations, applied to the draft's file too.
- **The tour.** `Tour.svelte`:
  - sets `kept` on each step;
  - opens operation 1's card and moves it from stage to stage;
  - clears both on Done, Skip tour and Esc, and on unmount.
- **The cards.** `OperationsSection` tags Mosaic's cards `op-1`, `op-2` and `op-3`.
- **Two placement fixes, both tested.**
  - In the sidebar column, the bubble slides left to keep its width. Step 5's "+" sits at the
    sidebar's right edge and had left the bubble a sliver.
  - `oneWindow` is false when a target's visible part is empty. On step 5 stacked, the picture
    had collapsed onto the window's edge, so it never came into view.
- **Tests.** `tour.test.ts` includes a check against the real Mosaic: each stage is exactly the
  finished picture's first layers.

Left as it was, on purpose: the "Draft · not saved" tag shows on steps 6–9 while the card is
open, as the old step 6 did.

## Block 3: sweep and docs (done 2026-11-12)

**Status:** done. The sweep passed after one fix, and the docs are written. The PR is open (below).

### Sweep results

Probe: Playwright with axe-core 4.10.2. The scripts are `walk2.mjs`, `exits2.mjs`, `replay2.mjs` and `axe2.mjs`
in that session's scratchpad (`…/df70b2e3-e74d-47d4-b6c0-2f49bcad6a7b/scratchpad/t/`), with
`lib.mjs` as before.

**Found and fixed: stacked, a build step cut out a picture that was off the window.**
- Step 11 at 390 × 844 and 320 × 700 cut out operation 3's card *and* the picture, whose hole ran
  off the window's bottom. `oneWindow` measured the picture clipped to the window: only the strip
  showing, so the pair "fit".
- Measuring it whole (`reach`) then broke step 5 at 390 × 844. The "+" and the picture span 770px
  of 844, so the span "fit", but only the first target is scrolled into view and the picture
  stayed a window below. The old clip had caught that case only by accident.
- Fix: `oneWindow` asks whether each target is wholly inside the window, as measured after the
  first is revealed, not whether their span fits. `tour-layout.ts` says why, with what was
  rejected. Tests were added for both cases. No behaviour or text changed from what
  DESIGN_SYSTEM.md says: stacked, the picture alone.

**After the fix, everything passes:**
1. **Steps**, at 1440 × 900, 768 × 900, 390 × 844 and 320 × 700, all 14 at each size:
   - the title and "n of 14";
   - the buttons (Skip operations on 5–11 only);
   - focus on the primary button;
   - the live region text;
   - no horizontal scroll;
   - no page errors.
2. **Cut-outs.** Two holes on 5–11 at 1440 and 768. The picture alone on 5–11 at 390 and 320.
   Every hole is inside the window and matches its target's visible box within 1.5px. The bubble
   never covers a hole's top 32px.
3. **Picture**, from screenshots at all four sizes: empty at 5, the All marking at 6–7, tiles at
   8–9, rotations at 10, Special at 11, whole at 12.
4. **The card** is open at Selection, Pattern, Attribute and Blend on 6–9, and closed on 5, 10
   and 11. After Done, and after Skip tour or Esc on 6 and on 10: there is no draft, Undo is
   disabled, and the exported `.json`'s config equals `public/templates/mosaic/tileset.json`'s.
5. **Exits:**
   - Skip operations from each of 5–11 lands on Breakpoints, 12 of 14, with the whole picture;
   - Back from there goes to Operation 3;
   - Back from 5 goes to Tile group with the whole picture;
   - Skip tour and Esc on 6 and on 10 restore everything;
   - a reload after any of them shows no tour.
6. **Replay.** "?" after a first visit, and after New → Empty, gives 8 steps, no build and no Skip
   operations, and focus returns to "Show the tour".
7. **Guard**, tested live: a first visit served a Mosaic whose operation 3 selects All runs as a
   replay, with 8 steps and the replay's Welcome.
8. **axe-core** (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa`) on steps 1, 5, 6 and 11 at 1440 and 320: no
   violations, as O4.
9. **Reduced motion:** steps 5–11 place the same at 1440 and 320, and the holes' and bubble's
   transition is 0s (0.12s without it).
10. **Known exception still holds:** Tile group at 320 × 700 covers that group's third slider.

### Docs written

- **Docs site.** Blocks 1–2 had updated no page, and `tour-preview.svelte.ts` had none, so the
  coverage gate would have failed CI.
  - New page: `editor/tour-preview`.
  - Rewritten for 14 steps: `tour`, `tour-dialog`, `tour-layout`, and `operation-card`'s `tour`
    row.
- `ARCHITECTURE.md`: a row for `tour-preview.svelte.ts`, and the `tour.ts` row now names the build.
- `BACKLOG.md`: B-036 logged as in progress. It moves to Done after the PR merges.
- `docs/changes/tour-operations/B-036.md`.

## Block 3 handoff brief (kept for the record)

Start by reading this file, then `apps/editor/DESIGN_SYSTEM.md` § "Onboarding: the tour", then
`apps/editor/src/tour.ts` and `apps/editor/src/lib/Tour.svelte`. Check out `tour-operations`.
The editor's dev server is `pnpm dev` on 5174. A fresh browser context is a first visit.

### Tooling

The O4 sweep helpers were these two files:
- `lib.mjs` loads playwright-core from `node_modules/.pnpm` and the cached
  chromium_headless_shell-1243, and provides `fresh`, `enter` and `title`.
- `axe.min.js` is axe-core 4.10.2.

Copies, with a `walk.mjs` (one line of state per step, plus screenshots of steps 4–12) and an
`exits.mjs`, are in this session's scratchpad:
`/private/tmp/claude-501/-Users-poldarder-Documents-pol-projects-tileset-creator-generative-tileset-creator/23762f2b-f41e-4626-86b7-8744063fb0df/scratchpad/t/`.

`/private/tmp` is cleared on reboot. If the folder is gone, rebuild the helpers in the new
scratchpad. They are about 40 lines.

The preview is not drawn with `<img>`, so a DOM count of images reads 0. Judge the picture from
screenshots.

### Checks

Run each one at 1440×900, 768×900 (two columns, narrow), 390×844 and 320×700.

1. **Steps.** Walk all 14. On every step check:
   - the title and the count ("n of 14");
   - the buttons (Skip operations on 5–11 only);
   - focus is on the primary button;
   - the live region text is "<title>, <n> of 14. <plain text>";
   - there is no horizontal page scroll.
2. **Cut-outs.**
   - Two holes on 5–11 where they fit one window. Stacked, the picture alone wherever the "+"
     or card and the picture don't fit.
   - Every hole is inside the window and matches its target's visible box.
   - The bubble never covers a cut-out's head.
3. **Picture per step**, from screenshots:
   - empty at 5;
   - the All marking at 6–7;
   - tiles at 8–9;
   - rotations at 10;
   - Special at 11;
   - the whole picture at 12 and after.
4. **The card.**
   - Operation 1's card is open at the right stage on 6–9 and closed on 5, 10 and 11.
   - After the tour there is no draft, Undo is disabled, and the exported `.json` equals Mosaic's.
5. **Exits:**
   - Skip operations from each of 5–11 lands on Breakpoints with the whole picture;
   - Back from Breakpoints goes to Operation 3;
   - Back from 5 goes to Tile group with the whole picture;
   - Skip tour and Esc on 6 and on 10 restore everything;
   - a reload after skipping doesn't show the tour.
6. **Replay.** "?" after a first visit gives 8 steps, no build steps, no Skip operations, and
   focus returns to "?". Do the same with a non-Mosaic file open: New → Empty, then "?".
7. **Guard.** On a first visit whose Mosaic is changed before the tour reaches step 5 (inject
   through `localStorage`/IndexedDB, or simulate by editing `public/templates/mosaic` locally and
   reverting), the tour runs as a replay. If that's impractical, the unit tests on `runFor`
   cover it; say so.
8. **axe-core**, on steps 1, 5, 6 and 11 at 1440 and at 320: no violations beyond those O4
   recorded.
9. **Reduced motion** (`prefers-reduced-motion: reduce`): steps 5–11 still place correctly, with
   no glide.
10. **Known exception, re-check it still holds.** Tile group at 320×700 covers Blue's third
    slider (O4).

Fix what fails. Put a fix's rationale at the point of use, and stop for Pol if a fix changes
behaviour or text.

### Docs, then the PR

- Write a change entry at `docs/changes/tour-operations/B-036.md`, editor-only (`Package: no`),
  following `docs/Batch-workflow.md` → "Change entries". Run `pnpm changelog check`.
- `BACKLOG.md`: log **B-036** (the next free number; check first) and move it to Done only after
  the PR merges.
- `ARCHITECTURE.md`: add an editor module row for `tour-preview.svelte.ts`.
- Run `pnpm test` and `pnpm typecheck` from the root.
- Push the branch and open one PR into `dev`. The body sums up Blocks 1–3 and the sweep's result.
  Pol merges; Claude can't.
