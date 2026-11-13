# B-024 Reseed on load: say that nothing is lost
Backlog: B-024 · Tier: trivial · Areas: operations-ui, editor-state · Decisions: Pol, 2026-11-11 (hint only, engine unchanged)
Output: unchanged
Package: no

## What changed
Ticking "Reseed on load" changes the picture at once, which reads as losing the tileset's look. It does not: unticking brings the same picture back. Both Reseed on load checkboxes (closed card and the open card's Pattern step) now share one hint, `RESEED_ON_LOAD_HINT` in `reseed.ts`: "When ticked, this operation gets a new random draw every time the page loads, so visitors see a different version on each visit. The preview then shows one of those versions; untick to get your original picture back." The closed card's checkbox had no hint before.

## Notes
- Rejected: making load salt 0 the identity in `mixLoad` (changes every flagged file's output, reverses `02` §6.7), a line always shown under the box, and a pushed notice.
- Docs: `editor/reseed.md`, `operation-body.md`, `operation-card.md`.
- B-010 closed as by design in the same pass (no code).
