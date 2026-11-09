# T-02 Hide/unhide operations
Backlog: B-012 · Tier: contained · Areas: operations-ui, editor-shell · Decisions: D-02 (A), D-03 (A)
Output: unchanged
Package: no

## What changed
An eye on each operation card hides the operation from the preview and from Export image, only while the editor is open. The hidden ids are preview view state (`preview.hidden`), never the file; a new pure `lib/preview/visibility.ts` (`withoutHidden`, `toggled`, `pruned`, tested) filters what `App.svelte` and `ExportImage` draw, keeps the operation open for editing, and forgets ids the file no longer has, so a reused id starts visible. A hidden card says "Hidden", with a hollow index square and a muted title.

## Notes
- **Deviation: the label.** The plan gave "Hide opN" / "Show opN" *and* `aria-pressed`. The button has one label, "Hide operation N" (the card's other buttons say "operation N"), with `aria-pressed`: the APG toggle-button pattern, since a label that flips as well as a pressed state is announced as "Show …, pressed". The icon changes to `eye-off` while pressed.
- **Outside the areas: ui-kit.** `IconButton` gained an additive `pressed` prop (`aria-pressed`, ink while pressed); `icons.ts` gained `eye` and `eye-off` (append). Session B (ui-kit) does not touch `IconButton`.
- `DESIGN_SYSTEM.md`: appended "Preview gestures and hidden operations" (T-01 and T-02).
- Docs: new `editor/visibility.md`; updated `app`, `operation-card`, `operations-section`, `preview-width` (the view state page), `export-image`, `ui-icon-button`, `ui-icons`.
