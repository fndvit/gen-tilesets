# Status: session C

Branch `batch-03-c`.

| Task | State | Commit |
| --- | --- | --- |
| T-03 (i) explainer for Tiles | done (D-01 as answered), one small addition, see below | `T-03: Add the "How tiles work" explainer to the Tiles section` |
| T-04 Randomness footer distinguishable from sections | done (D-02 A built, then changed by Pol to a gap and an edge) | `T-04: Draw the Randomness footer as an ink card`, then `T-04: Replace the ink footer with a gap and a hairline edge` |
| T-08 After Export: what to do with the file | done (D-06 B) | `T-08: Say what to do with tileset.zip after Export` |

## For the review

- **T-03.** Text is D-01's final text word for word. D-01 has no note, so `Explainer.svelte` gained a guard: an empty `note` draws nothing instead of a bare hairline (ui-kit, one line; recorded in the change entry).
- **T-04.** The ink card (D-02 A) was built, then Pol rejected it: the inverted controls meant the opposite of the same controls elsewhere. Now a white card with 12px of ground above it and a 1px `--color-edge` hairline (inset shadow). `.theme-ink` removed; `tokens.css` is unchanged from `dev`. `DESIGN_SYSTEM.md`: the *Footer: Randomness* row changed and *Footer edge* appended; principle 2 is as on `dev`.
- **T-08.** As planned. Additions the plan did not name: a `copy` icon appended to `icons.ts`, a "Copied"/"Couldn't copy" state on the button (with a status region), and refocusing Export by hand, because Export is disabled during the write and the dialog's own focus return lands on the body.
