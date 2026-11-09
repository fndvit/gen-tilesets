# T-03 Re-order sidebar sections; place Derived
Backlog: B-001 · Tier: contained · Areas: editor-shell · Decisions: D-01 (A), D-02 (A)
Output: unchanged
Package: no

## What changed
The sidebar sections now run Grid & size → Tiles → Operations → Breakpoints, the order a tileset is built in (DOM order, so Tab order too). The Derived section is gone: its rows are a folded "Details" group (a `Collapsible` group, closed, summary "N columns · W × H px") at the bottom of Grid & size. The rows are built by a new pure `lib/sections/grid-details.ts`, tested in `grid-details.test.ts`, so the numbers are no longer computed only inside a `.svelte` file.

## Notes
- Removed `DerivedSection.svelte` and its docs page; added `editor/grid-details.md`; updated `editor/app.md`, `editor/grid-section.md`, `editor/section.md` and the callers line of `editor/ui-collapsible.mdx` (a docs page for a ui-kit file; only its callers list changed, `Collapsible` itself did not).
- `DESIGN_SYSTEM.md`'s Section row still lists "Derived" among the sections. It is append-only in this batch, so it was not edited; the review pass may fix the stale word.
