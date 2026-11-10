# T-04 Randomness footer distinguishable from sections
Backlog: B-026 · Tier: contained · Areas: editor-shell, ui-kit · Decisions: D-02 (A)
Output: unchanged
Package: no

## What changed
The fixed Randomness footer is a black card with white text, so it never reads as the end of the section scrolled against it. A new `.theme-ink` scope, appended to `tokens.css`, redefines the semantic tokens the footer's controls read (card, ink, muted, field, edge, secondary, hover/pressed washes, selected, disabled, primary, accent), and `SidebarFooter`'s card takes it. No component was edited: every control in the footer already read its colours from tokens.

## Notes
- Every pair measured at WCAG 2.2 AA; the table is in `DESIGN_SYSTEM.md` *Ink footer*. The focus ring on black uses Pol's original #E94B82 (5.2:1 on the card), because `--pink` is 3.5:1 there.
- Hints inside the footer invert with it (white bubble, black text). The Explainer is rendered outside the card and stays white; Popups carry `.theme-default` anyway.
- `.theme-ink` re-states `--color-rule` and `--rule`: a custom property that reads another is resolved where it is declared, so `:root`'s would keep the light edge.
- `DESIGN_SYSTEM.md`: *Ink footer* appended; besides the append, principle 2 gained one sentence pointing to the exception, and the *Footer: Randomness* row's "A white card" became "A black card", since it would otherwise be false.
- Driven with a Playwright probe (scratchpad): hover, press and focus on the seed field, re-seed, (i), the Toggle and Reroll assets are all visible; the tour's footer step is unchanged (`data-tour="footer"`).
- Docs: `editor/sidebar-footer.md` updated.
