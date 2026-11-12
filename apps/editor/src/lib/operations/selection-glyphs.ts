/**
 * Selection artwork, by registry name, in Figma's order — the Selection step's
 * glyph grid and its layer rows (B-033, Block 3) both draw from here, so a
 * layer's row shows the same picture as the cell it was chosen from. A name
 * missing here gets a label-only cell after these, and a blank square in a
 * layer row (**E9**).
 *
 * `every-nth.svg` counts cells row after row with n = 3 (cells 0, 3, 6, …),
 * which is the v5 `everyNth` (B-009). `row-column.svg` is hand-written, every
 * 2nd column: Figma has no node for it.
 */

import allGlyph from "../../assets/glyphs/selection/all.svg";
import checkeredGlyph from "../../assets/glyphs/selection/checkered.svg";
import everyNthGlyph from "../../assets/glyphs/selection/every-nth.svg";
import handpickGlyph from "../../assets/glyphs/selection/handpick.svg";
import rowColumnGlyph from "../../assets/glyphs/selection/row-column.svg";
import randomGlyph from "../../assets/glyphs/selection/random.svg";
import rectGlyph from "../../assets/glyphs/selection/rect.svg";

export const SELECTION_GLYPHS: Readonly<Record<string, string>> = {
  all: allGlyph,
  checkerboard: checkeredGlyph,
  everyNth: everyNthGlyph,
  rowColumn: rowColumnGlyph,
  random: randomGlyph,
  rect: rectGlyph,
  cellList: handpickGlyph,
};
