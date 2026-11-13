# T-07 (i) explainers for Operations and Randomness
Backlog: B-018, B-019, B-010 · Tier: contained · Areas: editor-shell · Decisions: D-04 (A)
Output: unchanged
Package: no

## What changed
An (i) button in the Operations section's header (before the "+") opens "How operations work", and one at the right of the Randomness footer's title opens "How randomness works". Both use the existing `Explainer` popover, wired as "How noise works" is, with D-04's text unchanged in two data files, `lib/sections/operations-explainer.ts` and `randomness-explainer.ts`, each tested. The operations text's advice answers B-010 (a rotation persists into a later tile operation).

## Notes
- `Section.svelte` gained an optional `actions` snippet (header controls before the "+", outside the disclosure button) so the Operations header could hold the (i) without editing `lib/ui/`.
- Checked in the browser at 1440 × 900 and 320 × 640: open by mouse and by Enter; Esc, ✕ and a press outside close; Esc and ✕ return focus to the button; the button is 28 × 28 px; the panel stays inside the window; the section does not fold.
- At 1440 × 900 the operations popover opens upward from the Operations header, and its last line (the Note) is below the fold of its own scrolling panel. `Explainer` caps its height and scrolls (ui-kit behaviour, unchanged).
- Docs: new `editor/operations-explainer.md`, `editor/randomness-explainer.md`; updated `editor/operations-section.md`, `editor/sidebar-footer.md`, `editor/section.md`.
