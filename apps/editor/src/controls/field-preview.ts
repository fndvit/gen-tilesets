/**
 * The Pattern well's field preview, as pixels — `DESIGN_SYSTEM.md` *Operation
 * stepper*, the Pattern well (item 12).
 *
 * One pixel per cell of the whole grid: a selected cell in a grey from paper
 * (`t = 0`) to ink (`t = 1`), the pattern's value there; an unselected cell in
 * `--grey-200`. `FieldPreview.svelte` puts the result on a canvas and scales it
 * up with `image-rendering: pixelated`.
 *
 * Kept out of the component so it is tested (vitest cannot load a `.svelte`
 * file). It returns RGBA bytes rather than CSS colours: a 61×120 grid is 7,320
 * cells, and one `putImageData` draws them all, where `fillRect` would need a
 * call and a colour string per cell.
 */

import type { FieldCell } from "./palette.js";

export type Rgb = readonly [number, number, number];

/**
 * The tokens the preview draws with, as numbers. A canvas cannot read a CSS
 * variable, and parsing a computed colour back would buy nothing while the
 * editor has one theme; if it gains a dark one, pass these in from there.
 */
export const FIELD_COLOURS = {
  /** `--color-paper` (white): `t = 0`. */
  paper: [255, 255, 255],
  /** `--color-ink` (black): `t = 1`. */
  ink: [0, 0, 0],
  /** `--grey-200`: a cell the Selection leaves alone. */
  unselected: [226, 226, 226],
} as const satisfies Record<string, Rgb>;

/**
 * The preview's pixels for a `columns × rows` grid, row by row, 4 bytes each.
 * A cell absent from `cells` is unselected. `t` outside 0–1 is clamped, so a
 * Source that strays never wraps a byte.
 */
export function fieldPixels(
  columns: number,
  rows: number,
  cells: readonly FieldCell[],
  colours: { paper: Rgb; ink: Rgb; unselected: Rgb } = FIELD_COLOURS,
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(columns * rows * 4);
  const { paper, ink, unselected } = colours;
  for (let i = 0; i < columns * rows; i++) {
    pixels.set([unselected[0], unselected[1], unselected[2], 255], i * 4);
  }
  for (const { x, y, t } of cells) {
    if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
    const k = Math.min(1, Math.max(0, t));
    const i = (y * columns + x) * 4;
    pixels[i] = paper[0] + (ink[0] - paper[0]) * k;
    pixels[i + 1] = paper[1] + (ink[1] - paper[1]) * k;
    pixels[i + 2] = paper[2] + (ink[2] - paper[2]) * k;
    pixels[i + 3] = 255;
  }
  return pixels;
}
