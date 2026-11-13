# T-05 Closing a section scrolls as smoothly as opening
Backlog: B-028 · Tier: contained · Areas: ui-kit · Decisions: none (300 ms open, 220 ms close)
Output: unchanged
Package: no

## What changed
Closing a section or group near the bottom of the sidebar no longer jumps. Before the body goes, `Collapsible` scrolls up by `closeDrop` (how much the body's removal would clamp the scroll) over the fold's own duration and curve, `--dur-close` (220 ms, new token) on `--ease`, so the browser never clamps. Both scrolls now run on a new `tweenScroll` in `reveal.ts` (requestAnimationFrame, `cubicBezier`/`parseEase` for `--ease`, instant under reduced motion) instead of native smooth scrolling; the reveal after opening takes `--dur-slow` (300 ms).

## Notes
- The cause had a second half (see `status-B.md`): OperationCard's visually hidden "Operation N:" escapes the fold's clip and held the scroll height, so the old close paused and then dropped 494 px at once. The lead scroll fixes it without touching OperationCard.
- The tween stops when the user scrolls against it (`moved`), like native smooth scrolling.
- `tokens.css`: `--dur-close` added after `--dur-slow`. `DESIGN_SYSTEM.md`: appended *Sidebar motion and controls*, with the durations. Docs: `ui-reveal-ts.md`, `ui-collapsible.mdx`.
