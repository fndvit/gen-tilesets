# Status: session A

Branch `batch-02-a`.

| Task | State | Commit |
| --- | --- | --- |
| T-01 Drag to draw a Rect selection | done (D-01: B's gesture, A's result) | `T-01: Drag on the preview to draw a Rect selection` |
| T-02 Hide/unhide operations | done (D-02 A, D-03 A), one deviation, see below | `T-02: Hide and show operations in the preview` |

## For the review

- **T-01.** Driven in the editor with a Playwright probe (scratchpad): a drag down-right past the grid writes `5, 2 · 5 × 3` on a 10 × 5 grid while the outline runs off it; up-left past the edge writes `0, 0 · 6 × 3`; Esc mid-drag ends it and later moves write nothing; a click writes 1 × 1; choosing "All" removes the layer. An outline far past the edge does not grow the preview's scroll area.
- **T-02.** Probe on the atlas fixture (zipped from `apps/demo/public/atlas`): the eye on operation 2 is 28 × 28, works by Enter, sets `aria-pressed` and the card's name "Operation 2, hidden", and changes the picture; opening the card draws it again and closing hides it again; Export image's PNG differs while hidden and matches again once shown. At a 400 px sidebar no card header overflows (the detail ellipsizes, as before). **Deviation:** one label "Hide operation N" with `aria-pressed`, not "Hide/Show opN" plus `aria-pressed`; reason in the change entry.
