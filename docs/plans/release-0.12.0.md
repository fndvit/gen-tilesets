# Release 0.12.0: dev → main, first npm publish

Handoff brief.

**Status, 2026-11-13: Blocks 1–3 are done. Block 4 is for a new conversation.**
- Block 1, the audit: Pol confirmed the checklist.
- Block 2, implement: done and confirmed.
- Block 3, review: done. Its fixes are committed, and Pol moved on to Block 4.

All the work is on the local branch `release-0.12.0` (cut from `dev` at c34e9aa), in the four commits below,
plus the commit that wrote this handoff. Nothing is pushed:

```
7497b3c Release 0.12.0: review fixes
8cb7b50 Release 0.12.0: changelog section and version bump
24c38a5 Release 0.12.0: bring the docs up to date
f5bc595 Release 0.12.0: the brief for Blocks 2–4
```

"Where things stand" below describes `dev` before Block 2. On the branch, the version is 0.12.0 and
the CHANGELOG has a 0.12.0 section.

**To start the next conversation:** "Continue the 0.12.0 release from docs/plans/release-0.12.0.md,
Block 4." Run `git switch release-0.12.0` first; the session may open on `dev`.

## Where things stand (2026-11-13)

- `dev` is 121 commits ahead of `main`. Main's last merge was PR #18 (2026-11-08).
- `packages/tileset/package.json` says **0.11.0** on both branches. CHANGELOG has 0.10.0 and 0.11.0
  sections. The newest tag is **v0.9.0**.
- **Nothing is on npm**: `npm view @vit-foundation/gen-tilesets` returns 404. 0.10.0 and 0.11.0 were
  never tagged or published.
- Package changes since main:
  - **B-009**: `everyNth` is now row-major, and the old rule is `rowColumn`. Schema v5.
  - **B-033**: `Operation.selection` is always an array. Schema v6, and `isCoordinateBound` is a new
    export.
  - Both change output.
- `pnpm changelog check`: all 28 entries are well-formed. `pnpm changelog draft 0.12.0` folds exactly
  `docs/changes/b-009/every-nth.md` and `docs/changes/b-033/selection-layers.md`.

## Pol's decisions

- The version is **0.12.0**.
- Pol publishes it **by hand** as the first npm version, then sets up trusted publishing. CI
  publishes from 0.12.1 on.
- **Do not push a `v0.12.0` tag.** `publish.yml` runs on every `v*` tag. Before the manual publish it
  fails because the package doesn't exist yet; after it, the version already exists. Tag locally, or
  push knowing that run goes red.
- CHANGELOG 0.12.0: the folded package entries plus **one short `### Editor` paragraph** pointing to
  `docs/changes/`.
- Pol does every push and merge. Claude is denied them, so hand Pol `!` commands.
- Pol's working style:
  - Each block is confirmed before the next.
  - One branch and **one PR** for the whole release, opened after the last block.

## Block 2: Implement (branch `release-0.12.0` from `dev`)

### Fix the confirmed checklist

Root docs:
1. **`ARCHITECTURE.md` editor table (`## apps/editor/src`):**
   - The `first-visit.ts` row says "Collage opens". It is Mosaic (`FIRST_VISIT_TEMPLATE = "mosaic"`).
   - Add rows for `layers.ts` (the editor's reading of selection layers, B-033), `export-next.ts`
     (the after-export window, B-030), `lib/preview/visibility.ts` (hidden operations, view state
     only, B-012) and `lib/ui/reveal.ts` (scrolling an opened thing into view, B-020/B-027).
   - Read each module's header first.
2. **`BACKLOG.md`, B-004 Done line:** append "; motif removed 2026-11-13 (0157602)". Add the
   editor-only entry `docs/changes/b-004/remove-motif.md` in the format of `docs/Batch-workflow.md`
   "Change entries" (`Package: no`). Then run `pnpm changelog check`.
3. **`CHANGELOG.md`:**
   - Header paragraph: keep "records the package only", but allow one short editor pointer
     paragraph per release.
   - Under 0.10.0, add one italic correction line: 0.10.0 and 0.11.0 were never published, and
     0.12.0 is the first version on npm.
   - Leave the rest of the old sections as written.
4. **`packages/tileset/RELEASING.md`:** remove the false "0.10.0 was published by hand" claim. Say
   that the first npm version, 0.12.0, is published by hand from a `pnpm pack` tarball, and that CI
   publishes once trusted publishing is configured. Versions up to 0.9.0 are on GitHub Packages.
5. **`docs/changes/b-033/selection-layers.md`:** "The PR is pending" → "PR #31".
6. **`apps/editor/src/export.ts:56`:** the comment says "`schemaVersion: 2`". Change it to
   `SCHEMA_VERSION`.

Docs site (`apps/docs/src/content/docs/`):

7. **`guides/responsive.md:75`:** `"schemaVersion": 4` → `6`.
8. **`concepts/versioning.md:36-49`:**
   - The literal 4 → 6 (`types.ts:334`).
   - Add "6 since 0.12.0 (B-033, selection a list of layers), 5 since 0.12.0 (B-009, `everyNth` →
     `rowColumn`)" to the SCHEMA_VERSION history.
   - Rewrite the paragraph claiming three steps that "only rewrite the number… renamed nothing". Now
     there are five steps: 4→5 renames and 5→6 wraps. Link `engine/migrate.md`.
9. **`editor/export.md:112` and `:132-133`:** `schemaVersion: 4` → `SCHEMA_VERSION` (6), written at
   `document.ts:131`, and `export.test.ts` asserts `SCHEMA_VERSION`.
10. **`editor/export-next.md:54`:** replace the "not on npm yet" gotcha with: 0.12.0 is the first
    version on npm, and the command works from then on.
11. **`engine/index-entry.md:49`:** add "`isCoordinateBound` since 0.12.0 (B-033)" to the
    "Why public" cell.
12. **`review-findings.md`:** leave it. It is a 0.8.0 snapshot.

Check every line number against the file first. They were right on 2026-11-13.

### The changelog and the bump

- Run `pnpm changelog draft 0.12.0 --title "selection layers and a row-major Every Nth" --write`.
  Edit the result into the file's voice (`### Changed:` / `### Added:`). Say what each change costs
  and that output changed. **Keep the `<!-- change: … -->` markers.**
- The section must say:
  - **Breaking under 0.x:** a config built in TypeScript, or passed to `generate()` without
    `migrate()`, must use `selection: [...]`. An `everyNth` there now counts row-major. Files that go
    through `migrate()` / `loadTilesetFile` draw as before.
  - The new export is `isCoordinateBound(layers)`.
  - 0.12.0 is the first version on npm.
- Drop the drafts' "PR pending" and "version bump at release" bullets.
- Add `### Editor`: one paragraph of headlines, pointing to `docs/changes/` (batch-01…03,
  starters-onboarding, tour-operations, b-024, b-004). Headlines:
  - sidebar order and sticky headers
  - (i) explainers
  - Rect drag
  - hide operations
  - templates, the tile gallery and Mosaic on first visit
  - the tour
  - Reseed on load as a checkbox
  - the after-export window
  - the selection layers UI
  - the motif removed
- Bump `packages/tileset/package.json` to `0.12.0`, **in that file only** (invariant E2).
- Commit in pieces: the brief, the docs fixes, then the changelog and the bump.

## Block 3: Review (done 2026-11-13)

- `/code-review` (medium) on `dev..release-0.12.0`: nine findings, eight fixed in 7497b3c.
  - A rule against pushing a tag, in `RELEASING.md`, `CLAUDE.md` and `versioning.md`.
  - Tests run before the hand publish.
  - Two changelog details: the coordinate-bound message, and zero-area extents.
  - Stale schema-2 comments in `load.ts` and its test.
  - The `versioning.md` gotcha.
  - A duplicate link.
  - This brief's status.
- Not fixed, on purpose: `apps/demo/public/readme/tileset.json` is schema 4. It loads through
  `loadTilesetFile`, which migrates it.
- I compared CHANGELOG 0.12.0 with `git diff origin/main..dev -- packages/tileset/src`. Every package
  change is in it. The one new root export is `isCoordinateBound`.

## Block 4: Test, PRs, publish

Steps 1–3 are Claude's. Steps 4–5 are Pol's; Claude hands over the commands and then checks.
Step 2 is the largest and needs network access for the throwaway apps' installs.

1. Run `pnpm test`, `pnpm typecheck` and `pnpm changelog check`; all must be green.
   `pnpm changelog draft 0.12.1 --title x` must refuse because there is nothing to fold. Build the
   docs site with `pnpm --filter @vit-foundation/tileset-docs build` (check the name in
   `apps/docs/package.json`).
2. Do the full tarball check from `packages/tileset/RELEASING.md` "Verifying a release": SvelteKit,
   plain Vite, and React with no Svelte, as throwaway apps in the scratchpad. Use a config whose
   selection is an array. Steps 5–6 too.
   - Build the tarball with `pnpm build && pnpm pack` in `packages/tileset`. Delete the `.tgz`
     afterwards: it must not be committed.
   - Also feed one app a schema-4 file (`apps/demo/public/readme/tileset.json`) through
     `loadTilesetFile`. It must draw, which shows that migration ships in `dist`.
   - Check that the tarball's `package.json` says `0.12.0`, and that its `exports` point at `dist`.
   - Report what passed. If anything fails, stop and tell Pol before going further.
3. Write the PR body to the scratchpad: what the release contains, the four commits, the Block 3
   findings, and the tarball results. End it with the attribution line. Hand Pol:
   `! git push -u origin release-0.12.0 && gh pr create --base dev --title "Release 0.12.0" --body-file <file>`
   After Pol merges it: `! git pull --ff-only origin dev && gh pr create --base main --head dev --title "Release 0.12.0" --body-file <file>`
   Then Pol merges with "Create a merge commit".
4. Pol publishes from an up-to-date `main`:
   - `cd packages/tileset && pnpm test && pnpm typecheck && pnpm build && pnpm pack` (a tarball
     publish skips `prepublishOnly`)
   - `npm publish ./vit-foundation-gen-tilesets-0.12.0.tgz --access public` (OTP)
   - Configure the trusted publisher on npmjs.com: `fndvit` / `gen-tilesets` / `publish.yml`.
   - Regenerate the npm recovery codes.
5. Check that `npm view @vit-foundation/gen-tilesets version` returns `0.12.0`. Then update the
   memories `npm-first-publish-pending`, `b-009-every-nth` and `b-033-selection-layers` to say
   released.
