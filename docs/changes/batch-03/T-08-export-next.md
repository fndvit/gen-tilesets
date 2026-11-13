# T-08 After Export: what to do with the file
Backlog: B-030 · Tier: contained · Areas: editor-shell, docs-demo · Decisions: D-06 (B)
Output: unchanged
Package: no

## What changed
After Export writes `tileset.zip`, a "Your tileset is downloading" Popup says what the zip holds and how to use it on a website: install the package (with a Copy button), put `tiles/` and `tileset.json` in the site's public files, load and draw it, and a link to the getting-started guide. It shows on every zip export until "Don't show again", remembered in `localStorage`. The command, the link, the copy and the flag are a new `export-next.ts` (tested); `SidebarTopBar.svelte` draws the window. `getting-started.md` no longer says the download is "below the sidebar's sections".

## Notes
- Outside the task's areas, append only: a `copy` icon (Lucide) in `lib/ui/icons.ts`, and a `DESIGN_SYSTEM.md` section, which also records the editor's first text link style.
- Focus returns to Export by hand (`refocusExport`): the main part is disabled while the zip is written, so focus is on the body when the dialog opens and its own return would land nowhere.
- The Copy button and a status region say "Copied" or "Couldn't copy" (no clipboard outside a secure context, or refused); the command is selectable text either way.
- The package is not on npm yet, so the command fails until the first publish (as the plan says).
- Driven with a Playwright probe (scratchpad): Export image doesn't open it; Export and the menu's Tileset (.zip) do; Copy writes the command; the link has `target="_blank"`; Esc and Close return focus to Export; Don't show again survives a reload; no overflow at 375px.
- Docs: new `editor/export-next.md`; `editor/sidebar-top-bar.md`, `editor/ui-icons.md` and `guides/getting-started.md` updated.
