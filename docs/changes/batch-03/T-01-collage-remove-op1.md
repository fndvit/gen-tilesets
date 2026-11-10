# T-01 Collage: remove the operation that does nothing
Backlog: B-032 · Tier: contained · Areas: editor-shell, docs-demo · Decisions: none
Output: unchanged
Package: no

## What changed
The Collage template loses `op1` (constant Yellow on every cell), which `op6`'s rectangle and `op7`'s cell list overwrite everywhere. Generating the file before and after gives the same grid (checked for the default seed and two others, at load salts 0, 1, 7 and 12345), so `thumb.webp` is unchanged. The tour's "An operation" step now finds `op6` at `operations[2]` and says "operation 3" and "operations 1 and 2"; the manifest summary reads "6 tile groups · 5 operations".

## Notes
- Also changed: the template file (editor-io's `public/templates`), comments in `tour.ts`, `first-visit.ts`, `tour-layout.ts`, `starters.ts`; `tour.test.ts`; DESIGN_SYSTEM.md lines 443 and 459; docs pages `tour.md`, `tour-dialog.md`, `tour-layout.md`, `starters.md`.
- `DESIGN_SYSTEM.md:305` still uses "6 tile groups · 6 operations" as an example of the summary's wrapping; it is illustrative and outside the two lines this task may edit, so it was left.
- `docs/changes/starters-onboarding/B-016.md` still says "6 operations"; it is a record and was left.
