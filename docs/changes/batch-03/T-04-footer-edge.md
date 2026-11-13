# T-04 Randomness footer distinguishable from sections
Backlog: B-026 · Tier: contained · Areas: editor-shell, ui-kit · Decisions: D-02 (A built, then changed by Pol to a gap and an edge, then to the top bar's style)
Output: unchanged
Package: no

## What changed
The fixed Randomness footer keeps a section card's shape but takes the top bar's colours: filled with the grey ground and edged with the top bar's 1px ink hairline (`--color-bar-rule`), so a section scrolled against it never reads as one card with it. Fields inside it step down to grey-200 (hover grey-300). Only `SidebarFooter.svelte`'s card style changed.

## Notes
- Tried in order, all rejected by Pol: D-02 A, an inverted black card through a `.theme-ink` token scope (selected turned white, secondary buttons dark and hints white, the opposite of the same controls everywhere else; the scope is removed and `tokens.css` is as it was); a white card with 12px of ground above it and a grey-500 hairline; the inverted card again in dark grey (#262626, then #333). The top bar's style is Pol's pick, 2026-11-11.
- The hairline is an inset `box-shadow`, so it takes no space, and the tour's footer step (`data-tour="footer"`) still cuts out exactly the card. Principle 2 now names it as one of ink's lines.
- `--color-field` is reset to grey-200 inside the card, because the usual grey-100 is the ground itself; the field's grey-500 edge is 3.3:1 on grey-200 (1.4.11).
- `DESIGN_SYSTEM.md`: principle 2, the *Footer: Randomness* row and the section *Footer: the top bar's style* (was *Footer edge*), with what was rejected.
- Docs: `editor/sidebar-footer.md` updated.
