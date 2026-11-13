# T-06 Opening an operation scrolls it into view
Backlog: B-027 · Tier: contained · Areas: operations-ui, ui-kit · Decisions: none
Output: unchanged
Package: no

## What changed
Opening an operation from its own title or a chip now scrolls the sidebar until the open card's end shows, never pushing its top under the Operations header, as opening a section does. `Collapsible`'s `stuckAbove` moved into `reveal.ts`, beside a new `revealOpened(element)` that both `Collapsible` and `OperationCard` call. Opens from outside (orphan notice, tour) keep `OperationsSection`'s single `scrollIntoView`.

## Notes
- When the open waits behind "Discard your changes?", the reveal follows the open (after Discard), not the click; `OperationCard` reads `opening.asking` (editor-state, read-only) to drop a request answered with Keep editing, so a later open from the notice scrolls once.
- Docs: `operation-card.md`, `ui-reveal-ts.md`.
