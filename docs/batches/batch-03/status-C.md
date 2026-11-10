# Status: session C

Branch `batch-03-c`.

| Task | State | Commit |
| --- | --- | --- |
| T-03 (i) explainer for Tiles | done (D-01 as answered), one small addition, see below | `T-03: Add the "How tiles work" explainer to the Tiles section` |
| T-04 Randomness footer distinguishable from sections | done (D-02 A) | `T-04: Draw the Randomness footer as an ink card` |

## For the review

- **T-03.** Text is D-01's final text word for word. D-01 has no note, so `Explainer.svelte` gained a guard: an empty `note` draws nothing instead of a bare hairline (ui-kit, one line; recorded in the change entry).
- **T-04.** No component edited; the `.theme-ink` scope reaches every control in the footer. Probe (scratchpad) computed styles: card #111, Reroll hover #474747 / pressed #5E5E5E with white text, (i) hover a 10% white wash, chosen segment white with #111 text, focus ring #E94B82. Two edits besides the appends in `DESIGN_SYSTEM.md`: principle 2 points to the exception, and the *Footer: Randomness* row no longer says "white card" (both far from the lines A and B edit).
