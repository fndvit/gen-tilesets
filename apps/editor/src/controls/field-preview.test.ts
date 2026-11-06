import { describe, expect, it } from "vitest";
import { FIELD_COLOURS, fieldPixels } from "./field-preview.js";

const at = (pixels: Uint8ClampedArray, columns: number, x: number, y: number): number[] =>
  Array.from(pixels.slice((y * columns + x) * 4, (y * columns + x) * 4 + 4));

describe("fieldPixels", () => {
  it("has one RGBA pixel per cell of the whole grid", () => {
    expect(fieldPixels(5, 3, [])).toHaveLength(5 * 3 * 4);
  });

  it("maps t = 0 to paper and t = 1 to ink", () => {
    const pixels = fieldPixels(2, 1, [
      { x: 0, y: 0, t: 0 },
      { x: 1, y: 0, t: 1 },
    ]);
    expect(at(pixels, 2, 0, 0)).toEqual([...FIELD_COLOURS.paper, 255]);
    expect(at(pixels, 2, 1, 0)).toEqual([...FIELD_COLOURS.ink, 255]);
  });

  it("draws a cell the Selection leaves alone in --grey-200", () => {
    const pixels = fieldPixels(3, 2, [{ x: 1, y: 1, t: 0.5 }]);
    expect(at(pixels, 3, 0, 0)).toEqual([...FIELD_COLOURS.unselected, 255]);
    expect(at(pixels, 3, 2, 1)).toEqual([...FIELD_COLOURS.unselected, 255]);
    expect(at(pixels, 3, 1, 1)).toEqual([128, 128, 128, 255]);
  });

  it("places a cell by row, then column", () => {
    const pixels = fieldPixels(4, 3, [{ x: 3, y: 2, t: 1 }]);
    expect(at(pixels, 4, 3, 2)).toEqual([0, 0, 0, 255]);
    expect(at(pixels, 4, 2, 3 - 1)).toEqual([...FIELD_COLOURS.unselected, 255]);
  });

  it("clamps a stray t and skips a cell outside the grid", () => {
    const pixels = fieldPixels(2, 1, [
      { x: 0, y: 0, t: 1.4 },
      { x: 1, y: 0, t: -0.2 },
      { x: 5, y: 0, t: 0.5 },
    ]);
    expect(at(pixels, 2, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(at(pixels, 2, 1, 0)).toEqual([255, 255, 255, 255]);
  });
});
