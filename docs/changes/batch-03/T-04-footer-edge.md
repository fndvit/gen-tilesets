# T-04 Randomness footer distinguishable from sections
Backlog: B-026 · Tier: contained · Areas: editor-shell, ui-kit · Decisions: D-02 (A built, then changed by Pol to a gap and an edge)
Output: unchanged
Package: no

## What changed
The fixed Randomness footer stays a white card, now with 12px of the grey ground above it and a 1px `--color-edge` hairline round it, so a section cut off by the scroll edge ends on grey and never reads as one card with the footer. Only `SidebarFooter.svelte`'s card style changed.

## Notes
- D-02 A (an inverted black card through a `.theme-ink` token scope) was built first. Pol rejected it: inside it selected turned white, secondary buttons dark and hints white, the opposite of the same controls everywhere else. The scope is removed; `tokens.css` is back as it was.
- The edge is an inset `box-shadow`, so it takes no space; grey-500 is 3.6:1 against the ground. It is not ink, so principle 2 needs no exception; principle 1 ("almost no borders") allows the one card that is always on screen to have one.
- The gap is `--space-6`, twice the 6px between sections. It is a margin, outside the card, so the tour's footer step (`data-tour="footer"`) still cuts out exactly the card.
- `DESIGN_SYSTEM.md`: *Footer edge* appended (with what was rejected); the *Footer: Randomness* row describes the edge and gap.
- Docs: `editor/sidebar-footer.md` updated.
