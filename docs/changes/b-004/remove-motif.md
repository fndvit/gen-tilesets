# B-004 Remove the sidebar tile motif
Backlog: B-004 · Tier: trivial · Areas: editor-shell · Decisions: Pol, 2026-11-13 (remove it)
Output: unchanged
Package: no

## What changed
The tile motif that batch-01 T-06 drew in the sidebar's free space is gone. `SidebarMotif.svelte`, `motif.ts` and its test are deleted, along with the sidebar `ScrollArea`'s fill mode, which existed only for the motif. Commit 0157602.

## Notes
- Docs: `editor/sidebar-motif.md` deleted, `editor/app.md` updated.
