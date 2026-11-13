# Change entries

One file per task, written by the task itself: `batch-NN/T-07-hide-operations.md`, or one file
per trivial bundle (`batch-NN/bundle-B1.md`). The format and the rules are in
[`docs/Batch-workflow.md`](../Batch-workflow.md), under "Change entries". No task edits a shared
log, so parallel branches never conflict here.

- **Editor-only entries** (`Package: no`) stay here; this folder is their record.
- **Package entries** (`Package: yes`) are also folded into [`CHANGELOG.md`](../../CHANGELOG.md)
  at release. Each folded entry is cited there as `<!-- change: docs/changes/… -->`, and a cited
  entry is never folded again.

```sh
pnpm changelog check                                    # every entry is well-formed
pnpm changelog draft 0.12.0 --title "…"                  # print the next release's section
pnpm changelog draft 0.12.0 --title "…" --write          # insert it into CHANGELOG.md
```

The script is `scripts/changelog.mjs`. Its draft is a starting point: edit it into the
changelog's voice (`### Added:` / `### Changed:` / `### Fixed:`, what it costs, whether output
changed) and keep the markers.

## Before batches

- `CHANGELOG.md` up to 0.11.0 is the hand-written history of the engine, the renderer and the
  editor. It is not split into entries here and is not edited.
- `pre-batch/editor-redesign.md` records the editor redesign (PR #18), the one piece of work that
  had no entry anywhere. Its working documents are in `../gen-tileset-spec-archive/editor-redesign/`.
