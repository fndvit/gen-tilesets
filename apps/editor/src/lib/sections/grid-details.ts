/**
 * What the file implies but the author does not type: the rows of Grid &
 * size's folded "Details" part (batch 01, T-03, B-001).
 *
 * These were the Derived section's until D-02 (A) moved them under the fields
 * that change them. They are built here rather than in the component so a
 * test can check them (`.svelte` files cannot be imported by Vitest here).
 *
 * `columns` is **displayed, never edited** (§9.1). The author needs to know it,
 * because a `rect` is authored in column indices, and editing it would break
 * `columns * cellSize >= referenceWidth` and produce `06` §10.4's fourth
 * diagnostic from inside the editor, which **E1** forbids.
 */

import type { TilesetFile } from "@vit-foundation/gen-tilesets";
import { naturalHeight } from "@vit-foundation/gen-tilesets/render";
import { bleed } from "../../derive.js";
import { ENGINE_VERSION } from "../../document.js";

/** One read-only row: the label, then the value as shown. */
export type DetailRow = readonly [term: string, value: string];

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The rows, in display order.
 *
 * **Visible height** is `07` §5.3's natural height,
 * `s * (rows - yOffset) * cellSize`: "the box that exactly contains the
 * visible grid, clipping row 0's top by `yOffset` and ending flush with the
 * last row's bottom edge". Evaluating it at `Wpx = referenceWidth` makes
 * `s = 1`, so the same function returns design px. It is taken from the
 * package rather than multiplied out here: `07` **R1** requires one
 * implementation of the coordinate mapping, and `08` **S10** exports it for
 * exactly this.
 *
 * `02` §7.4: the grid is **top-anchored**, its height is `rows * cellSize` in
 * design px, and only `rows` makes it taller or shorter. There is no vertical
 * counterpart to `horizontalAlignment`, and no vertical bleed here: `07` §7.3
 * makes that the host's, through the box's height.
 */
export function gridDetails(file: TilesetFile): DetailRow[] {
  const { config, layout } = file;
  const currentBleed = bleed(layout.referenceWidth, layout.cellSize, config.columns);
  const visibleHeight = naturalHeight({
    layout,
    rows: config.rows,
    columns: config.columns,
    Wpx: layout.referenceWidth,
  });
  /** What `yOffset` clips off the top of row 0, in design px (`02` §7.4). */
  const clipped = layout.yOffset * layout.cellSize;

  return [
    ["Columns", String(config.columns)],
    ["Grid width", `${config.columns * layout.cellSize} px`],
    ["Grid height", `${config.rows * layout.cellSize} px`],
    ["Visible height", `${round(visibleHeight)} px` + (clipped > 0 ? ` (${round(clipped)} clipped)` : "")],
    ["Bleed", `${currentBleed} px` + (currentBleed > 0 ? ` (${currentBleed / 2} each side)` : "")],
    ["Tiles", String(config.tiles.length)],
    ["Operations", String(config.operations.length)],
    ["Engine", ENGINE_VERSION],
    ["Schema", String(file.schemaVersion)],
  ];
}
