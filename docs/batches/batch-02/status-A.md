# Status: session A

Branch `batch-02-a`.

| Task | State | Commit |
| --- | --- | --- |
| T-01 Drag to draw a Rect selection | done (D-01: B's gesture, A's result) | `T-01: Drag on the preview to draw a Rect selection` |
| T-02 Hide/unhide operations | in progress | |

## For the review

- **T-01.** Driven in the editor with a Playwright probe (scratchpad): a drag down-right past the grid writes `5, 2 · 5 × 3` on a 10 × 5 grid while the outline runs off it; up-left past the edge writes `0, 0 · 6 × 3`; Esc mid-drag ends it and later moves write nothing; a click writes 1 × 1; choosing "All" removes the layer. An outline far past the edge does not grow the preview's scroll area.
