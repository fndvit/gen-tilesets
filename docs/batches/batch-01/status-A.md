# Status: session A

Branch `batch-01-a`. Every task done in order; no task blocked.

| Task | State | Commit |
| --- | --- | --- |
| T-01 Grid button → On/Off switch | done | `T-01: Turn the preview's Grid button into an Off/On switch` |
| T-02 Fresh-load hint | done | `T-02: Point the fresh-load hint at the switches that enable it` |
| T-03 Sidebar order; Derived into Grid & size | done (D-01 A, D-02 A) | `T-03: …` |
| T-04 Scroll past the editor | done, see below | `T-04: Keep the preview readout's hint inside the window` |
| T-05 Painted cells outside the grid | done, one deviation, see below | `T-05: …` |
| T-06 Tile motif | done | `T-06: …` |
| T-07 (i) explainers | done (D-04 A) | `T-07: …` |
| T-11 Reseed on load chip | done | `T-11: …` |

## For the review

- **T-04.** The probe (scratchpad, not the repo) ran 2,297 checks: widths 660–2560 px, zoom 50–200 %, heights 700 and 1100, the kelp fixture imported, and every disclosure, hint, menu, explainer and preview size. It reproduced one case. At a 660 px window, hovering "Preview size" opened its hint 32 px past the window's right edge, and the page scrolled sideways. That is fixed in `PreviewTopBar`, and the re-run at 660–1024 px (477 checks) found nothing. **No vertical page scroll reproduced.** If Pol's case was vertical, it needs the file or the state it happened in. Below about 212 CSS px of window height, the top bar and the fixed footer alone overflow, so the page scrolls; that keeps the footer reachable and was left alone.
- **T-05, deviation.** The plan assumed the history marks an open (a `replaced` entry); it does not. Rather than BLOCK, or change `history.ts` or `apply()`, `session.open()` also keeps the opened file, read-only, as `session.opened`. `orphans.ts` `cameWithFile` compares against it cell by cell. The write path is unchanged. Needs Pol's check that this is within "must not change how `apply()` or the history works".
- **T-11** also touched `reseed.ts` (editor-state, which this session holds) for two tested helpers.
- **`Toggle` (ui-kit, session B's area, not edited):** while the pointer is over the *chosen* segment, `.segment:hover:not(:disabled)` outranks `[aria-checked="true"]`. The white label then sits on the light hover wash and can barely be read. This affects every Toggle, including T-01's new Grid switch. Suggested fix: scope the hover to `:not([aria-checked="true"])`.
- **`Explainer` (ui-kit, unchanged):** "How operations work" opens upward from the Operations header and is taller than the room there, so its last note scrolls inside the panel.
- **`DESIGN_SYSTEM.md`** still lists "Derived" among the sections (its Section row). It was not edited because the file is append-only in this batch.
