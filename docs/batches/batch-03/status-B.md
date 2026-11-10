# Batch 03, session B: status

## T-05 Closing a section scrolls as smoothly as opening

Done.

Cause, reproduced before the change with a Playwright probe (editor at 1280 × 800, Collage, the
sidebar scrolled to its bottom, Operations closed; `scrollTop`, its maximum and the section's top
read every animation frame):

- The browser clamped `scrollTop` while the body collapsed, as triage expected: it sat at its
  maximum on every frame, and dropped 210 px in the first frame (the fold's curve front-loads it).
- Then nothing moved for the rest of the fold, and the last 494 px dropped in one frame when the
  body was removed. The pause has a second cause triage did not expect: the last operation card's
  visually hidden "Operation N:" span is `position: absolute` with `ScrollArea`'s `.viewport` as
  its containing block, so it escapes `slide`'s `overflow: hidden` and holds `scrollHeight` at the
  old bottom until the body goes.

After the change, the same probe: `scrollTop` stays under its maximum on every frame and moves
along the fold, ending exactly where the browser used to put it (1332). Leading the fold with the
scroll fixes both causes, so the span is left alone (it is OperationCard's, and harmless once
nothing clamps). Two details the plan did not spell out, both written at the point of use: the
tween's clock is `document.timeline.currentTime` (timed by `performance.now()` it ran a frame
behind the fold and the browser clamped once), and a clamp along the tween's own way does not stop
it, only a move against it or past its end.

## T-06 Opening an operation scrolls it into view

Done, as planned. Checked with Playwright probes (1280 × 800, Collage, sidebar at its bottom):
opening the last operation from a chip scrolls 284 px over ~300 ms and stops with the card's top
just under the Operations header (card taller than the view); under reduced motion it is instant.
Behind "Discard your changes?": nothing scrolls on the click, Discard opens and then scrolls to
the same place, Keep editing leaves the card closed and nothing scrolls.

One choice beyond the plan: `OperationCard` reads `opening.asking` (read-only) so a request that
waited on the dialog and was answered Keep editing is dropped. Without it, a later open of that
card from the orphan notice would scroll twice. The alternative was a prop from
`OperationsSection`, which is editor-shell, outside this task's areas.
