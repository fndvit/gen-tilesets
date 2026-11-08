# Bundle B1 (editor-shell)
Backlog: B-003, B-015 · Tier: trivial · Areas: editor-shell · Decisions: none
Output: unchanged
Package: no

## What changed
- T-01 Grid button → On/Off switch: the preview top bar's one-segment Grid button is now the editor's `Toggle` (Off / On) bound to `preview.showGrid`, held at two chips wide from `PreviewTopBar` so `Toggle` is unchanged, with a visible "Grid" label before it as "Breakpoints" has.

## Notes
- The visible "Grid" label is not in the plan's wording; without it the switch reads only "Off / On". It is `aria-hidden`, since the group's accessible name is the Toggle's `label`.
- Docs: `editor/preview-bars.md` updated.
