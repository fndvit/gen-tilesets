import { describe, expect, it } from "vitest";
import { bleed, deriveColumns } from "./derive.js";

/**
 * `02` §7.1's derivation, and the two **E1** guarantees it manufactures.
 *
 * These are checked nowhere else in the package — `06` §10.4 lists both as
 * *advisory diagnostics*, which is to say `validate()` will not catch a
 * violation and a renderer will draw one without complaint. "An advisory
 * diagnostic is the shadow of a guarantee the editor manufactures." This file is
 * where the guarantee is.
 */

const ALIGNMENTS = ["column", "gutter"] as const;

describe("deriveColumns — 02 §7.1", () => {
  it("takes no correction where the parity already matches", () => {
    // ceil(1000 / 100) = 10, even, and "gutter" wants even.
    expect(deriveColumns(1000, 100, "gutter")).toBe(10);
    // ceil(1000 / 120) = 9, odd, and "column" wants odd. The demo fixture.
    expect(deriveColumns(1000, 120, "column")).toBe(9);
  });

  it("corrects parity upward, never downward — 02 §7.1", () => {
    // "Parity is always corrected upward. Rounding down would leave gaps at the
    // grid edges; rounding up produces symmetric bleed, which is the intended
    // look."
    expect(deriveColumns(1000, 100, "column")).toBe(11); // 10 -> 11, not 9
    expect(deriveColumns(1001, 100, "gutter")).toBe(12); // 11 -> 12, not 10
  });

  it("reproduces 02 §7.2's worked example", () => {
    // "Config A: ceil(1280 / 175) = 8 columns -> 1400 design px of grid,
    // authored at 1280. 120px overflows, 60px off each side."
    const columns = deriveColumns(1280, 175, "gutter");
    expect(columns).toBe(8);
    expect(columns * 175).toBe(1400);
    expect(bleed(1280, 175, columns)).toBe(120);
  });

  it("ceils rather than rounds — a partial column is a whole column", () => {
    expect(deriveColumns(1001, 100, "column")).toBe(11); // ceil(10.01) = 11, odd already
    expect(deriveColumns(999, 100, "gutter")).toBe(10); // ceil(9.99) = 10, even already
  });

  /**
   * **E1, guarantee one.** `columns * cellSize >= referenceWidth`, so
   * `originX <= 0` (`07` §5.2) and there are never gutters at the viewport
   * edges. Its shadow is `06` §10.4's fourth diagnostic.
   */
  it("always covers the design width — E1, 07 §5.2", () => {
    for (const alignment of ALIGNMENTS) {
      for (let referenceWidth = 1; referenceWidth <= 2000; referenceWidth += 7) {
        for (const cellSize of [1, 7, 33, 100, 120, 175, 512, 1999]) {
          const columns = deriveColumns(referenceWidth, cellSize, alignment);
          expect(columns * cellSize).toBeGreaterThanOrEqual(referenceWidth);
        }
      }
    }
  });

  /**
   * **E1, guarantee two.** `columns`' parity matches `horizontalAlignment`:
   * `"column"` requires odd (the centre axis falls through a cell), `"gutter"`
   * requires even (the axis falls on a boundary). Its shadow is `06` §10.4's
   * first diagnostic.
   *
   * This is the whole function of the field. `02` §7.3: at render time,
   * "centring the grid on the viewport's centre axis produces the correct
   * alignment automatically as a consequence of that parity — the renderer never
   * reads the field."
   */
  it("always matches the requested parity — E1, 02 §7.1", () => {
    for (let referenceWidth = 1; referenceWidth <= 2000; referenceWidth += 7) {
      for (const cellSize of [1, 7, 33, 100, 120, 175, 512, 1999]) {
        expect(deriveColumns(referenceWidth, cellSize, "column") % 2).toBe(1);
        expect(deriveColumns(referenceWidth, cellSize, "gutter") % 2).toBe(0);
      }
    }
  });

  it("never returns fewer than one column", () => {
    for (const alignment of ALIGNMENTS) {
      expect(deriveColumns(1, 1000, alignment)).toBeGreaterThanOrEqual(1);
    }
  });

  it("corrects by at most one, so the bleed stays under two cells", () => {
    for (const alignment of ALIGNMENTS) {
      for (let referenceWidth = 1; referenceWidth <= 1200; referenceWidth += 13) {
        const cellSize = 100;
        const columns = deriveColumns(referenceWidth, cellSize, alignment);
        expect(bleed(referenceWidth, cellSize, columns)).toBeLessThan(2 * cellSize);
      }
    }
  });

  /** A toggle can move `columns` by one through the parity correction alone. */
  it("differs by exactly one between the two alignments — 09 §9.3", () => {
    for (let referenceWidth = 100; referenceWidth <= 1200; referenceWidth += 13) {
      const a = deriveColumns(referenceWidth, 100, "column");
      const b = deriveColumns(referenceWidth, 100, "gutter");
      expect(Math.abs(a - b)).toBe(1);
    }
  });
});

describe("bleed — 02 §7.2", () => {
  it("is zero exactly when the grid meets the design width", () => {
    expect(bleed(1000, 100, 10)).toBe(0);
  });

  it("is the difference the design marks as intentional", () => {
    // "referenceWidth != columns * cellSize. The difference is the intentional
    // bleed." A renderer computing s = Wpx / (columns * cellSize) would make it
    // vanish -- "exactly the outcome the design marks as wrong."
    expect(bleed(1000, 120, 9)).toBe(80);
    expect(bleed(1280, 175, 8)).toBe(120);
  });
});
