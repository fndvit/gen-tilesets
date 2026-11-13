# T-04 Scroll past the editor
Backlog: B-013 · Tier: contained · Areas: editor-shell · Decisions: none
Output: unchanged
Package: no

## What changed
A Playwright probe (kept in the scratchpad) drove the editor at widths 660–2560 px, zoom 50–200 %, two window heights, with a fixture imported, opening and closing every disclosure, hovering every described control, opening every menu, explainer and preview size: 2,297 checks. One case made the page scroll: at a 660 px window, hovering "Preview size" opened its 260 px hint past the right edge of the window, so the whole page scrolled sideways by 32 px. `PreviewTopBar` now holds that hint to the bar's width (the bar is an inline-size container); the reason and the rejected fixes are written at the rule. N3's fix (the hidden text escaping `ScrollArea`) still holds.

## Notes
- No vertical page scroll reproduced above 40rem. If Pol's case was vertical, it needs the file or state it happened with.
- The only vertical page scroll found is a window under about 212 CSS px tall (for example 400 px at 200 %), where the top bar and the fixed footer alone are taller than the window. There the scroll is what keeps the footer reachable, so it was left alone.
- Docs: `editor/preview-bars.md`.
