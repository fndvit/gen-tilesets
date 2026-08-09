import { describe, expect, it } from "vitest";
import type { Layout } from "../types.js";
import {
  cellAt,
  cellBox,
  gridWidth,
  naturalHeight,
  naturalRatio,
  originX,
  originY,
  scaleFactor,
  type GridGeometry,
} from "./geometry.js";
import { applyMatrix, cssTransform, transformMatrix } from "./transform.js";

/** 07 §5.4's worked example, verbatim. */
const layout: Layout = {
  cellSize: 175,
  referenceWidth: 1280,
  yOffset: 0.3,
  horizontalAlignment: "gutter",
};
const geo = (Wpx: number): GridGeometry => ({ layout, rows: 5, columns: 8, Wpx });

describe("07 §5.4's worked example — the geometry vector table's shape", () => {
  it("has a grid design width of 1400 and a bleed of 120", () => {
    expect(gridWidth(geo(1280))).toBe(1400);
    expect(gridWidth(geo(1280)) - layout.referenceWidth).toBe(120);
  });

  it.each([
    { Wpx: 640, s: 0.5, ox: -30, oy: -26.25, side: 87.5, height: 411.25 },
    { Wpx: 1280, s: 1.0, ox: -60, oy: -52.5, side: 175, height: 822.5 },
    { Wpx: 1920, s: 1.5, ox: -90, oy: -78.75, side: 262.5, height: 1233.75 },
  ])("reproduces the table row at Wpx $Wpx", ({ Wpx, s, ox, oy, side, height }) => {
    const g = geo(Wpx);
    expect(scaleFactor(g)).toBeCloseTo(s, 10);
    expect(originX(g)).toBeCloseTo(ox, 10);
    expect(originY(g)).toBeCloseTo(oy, 10);
    const box = cellBox(g, 0, 0);
    expect(box.right - box.left).toBeCloseTo(side, 10);
    expect(naturalHeight(g)).toBeCloseTo(height, 10);
  });

  it("places cell (3, 2) exactly as 07 §5.4 states, at Wpx 1280", () => {
    const box = cellBox(geo(1280), 3, 2);
    expect(box.left).toBeCloseTo(465, 10);
    expect(box.top).toBeCloseTo(297.5, 10);
    expect(box.right).toBeCloseTo(640, 10);
    expect(box.bottom).toBeCloseTo(472.5, 10);
    expect((box.left + box.right) / 2).toBeCloseTo(552.5, 10);
    expect((box.top + box.bottom) / 2).toBeCloseTo(385, 10);
  });

  it("spans -60 .. 1340, 1400 wide, centred on 640 — 60px of bleed each side", () => {
    const g = geo(1280);
    const first = cellBox(g, 0, 0);
    const last = cellBox(g, 7, 0);
    expect(first.left).toBeCloseTo(-60, 10);
    expect(last.right).toBeCloseTo(1340, 10);
    expect(last.right - first.left).toBeCloseTo(1400, 10);
    expect((first.left + last.right) / 2).toBeCloseTo(640, 10);
  });
});

describe("scale derives from width alone — 07 §5.1", () => {
  it("never uses columns * cellSize as the divisor", () => {
    // s = Wpx / (columns * cellSize) would make the bleed vanish and fit the grid
    // neatly -- the outcome the design marks as wrong (02 §7.2).
    const g = geo(1280);
    expect(scaleFactor(g)).toBe(1280 / 1280);
    expect(scaleFactor(g)).not.toBe(1280 / 1400);
  });

  it("is unaffected by rows", () => {
    const tall: GridGeometry = { ...geo(1280), rows: 500 };
    expect(scaleFactor(tall)).toBe(scaleFactor(geo(1280)));
  });
});

describe("every horizontal quantity is a fixed fraction of Wpx — 07 §5.3", () => {
  it("cancels Wpx out of every ratio", () => {
    for (const Wpx of [320, 640, 1280, 1920, 3840]) {
      const g = geo(Wpx);
      expect(originX(g) / Wpx).toBeCloseTo(
        (layout.referenceWidth - 8 * layout.cellSize) / (2 * layout.referenceWidth),
        12,
      );
      expect(originY(g) / Wpx).toBeCloseTo(
        (-layout.yOffset * layout.cellSize) / layout.referenceWidth,
        12,
      );
      const box = cellBox(g, 0, 0);
      expect((box.right - box.left) / Wpx).toBeCloseTo(layout.cellSize / layout.referenceWidth, 12);
    }
  });

  it("gives a natural ratio that is a constant of Layout and rows — S8", () => {
    const r = naturalRatio(layout, 5);
    for (const Wpx of [320, 1280, 3840]) {
      expect(Wpx / naturalHeight(geo(Wpx))).toBeCloseTo(r, 10);
    }
  });
});

describe("cell edges are shared, never independently rounded — R6", () => {
  it("makes cell x's right edge identically cell x+1's left edge", () => {
    for (const Wpx of [317, 640, 1281, 1920.5]) {
      const g = geo(Wpx);
      for (let x = 0; x < 7; x++) {
        expect(cellBox(g, x, 0).right).toBe(cellBox(g, x + 1, 0).left);
      }
      for (let y = 0; y < 4; y++) {
        expect(cellBox(g, 0, y).bottom).toBe(cellBox(g, 0, y + 1).top);
      }
    }
  });

  it("leaves no sub-pixel seam at awkward widths", () => {
    // Sub-pixel gaps between tiles read as a faint grid of seams across the whole
    // background -- visible at some widths and not others, and hard to attribute.
    const g = geo(1237.3);
    for (let x = 0; x < 7; x++) {
      expect(cellBox(g, x + 1, 0).left - cellBox(g, x, 0).right).toBe(0);
    }
  });
});

describe("cellAt — 07 §8.2, §8.3", () => {
  it("inverts cellBox for any point within the box — R11", () => {
    const g = geo(1280);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 8; x++) {
        const box = cellBox(g, x, y);
        const cx = (box.left + box.right) / 2;
        const cy = (box.top + box.bottom) / 2;
        expect(cellAt(g, cx, cy)).toEqual({ x, y });
      }
    }
  });

  it("gives a shared edge to the higher-indexed cell — half-open, R11", () => {
    const g = geo(1280);
    const box = cellBox(g, 3, 2);
    expect(cellAt(g, box.left, box.top)).toEqual({ x: 3, y: 2 });
    // The right edge belongs to cell 4, not cell 3.
    expect(cellAt(g, box.right, box.top)).toEqual({ x: 4, y: 2 });
    expect(cellAt(g, box.left, box.bottom)).toEqual({ x: 3, y: 3 });
  });

  it("is total and does not bound-check — 04 §4.2 needs the out-of-grid values", () => {
    // An author dragging a rect to the grid edge should not have it silently
    // resized, so the drag's real coordinates must survive.
    const g = geo(1280);
    expect(cellAt(g, -500, -500).x).toBeLessThan(0);
    expect(cellAt(g, -500, -500).y).toBeLessThan(0);
    expect(cellAt(g, 5000, 5000).x).toBeGreaterThan(8);
    expect(cellAt(g, 5000, 5000).y).toBeGreaterThan(5);
  });

  it("round-trips at every width", () => {
    for (const Wpx of [320, 640, 1280, 1920]) {
      const g = geo(Wpx);
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 8; x++) {
          const box = cellBox(g, x, y);
          expect(cellAt(g, (box.left + box.right) / 2, (box.top + box.bottom) / 2)).toEqual({ x, y });
        }
    }
  });
});

describe("yOffset clips row 0 through a negative origin — 07 §5.2, §7.2", () => {
  it("puts the top of row 0 above the render box", () => {
    const g = geo(1280);
    expect(originY(g)).toBeLessThan(0);
    expect(cellBox(g, 0, 0).top).toBeLessThan(0);
  });

  it("ends flush with the last row's bottom edge at natural height", () => {
    const g = geo(1280);
    expect(cellBox(g, 0, 4).bottom).toBeCloseTo(naturalHeight(g), 10);
  });

  it("leaves originY at 0 when yOffset is 0", () => {
    // Compared with ==, not Object.is: `-s * 0 * cellSize` is negative zero, and
    // -0 === 0. The sign of zero is not observable in any rendered output.
    const g: GridGeometry = { ...geo(1280), layout: { ...layout, yOffset: 0 } };
    expect(originY(g) === 0).toBe(true);
    expect(cellBox(g, 0, 0).top === 0).toBe(true);
  });
});

describe("transforms — 07 §6, D11", () => {
  const unitBox = { left: 0, top: 0, right: 1, bottom: 1 };

  it("reproduces 07 §6.3's worked case exactly — the D11 order test", () => {
    // scaleX: 2, scaleY: 1, rotation: 90.
    // "Scale then rotate (D11, correct). The unit square's corner (1, 0) maps to
    //  (0, 2). A leaf stretched to twice its width and then turned on its side is
    //  twice as TALL. The stretch rides with the drawable."
    const m = transformMatrix({ scaleX: 2, scaleY: 1, rotation: 90 }, unitBox);
    const [a, b, c, d] = m;
    // Linear part only, so drop the translation by mapping the direction vector.
    expect(a * 1 + c * 0).toBeCloseTo(0, 10);
    expect(b * 1 + d * 0).toBeCloseTo(2, 10);
  });

  it("is NOT rotate-then-scale — the wrong picture maps (1, 0) to (0, 1)", () => {
    // "Rotate then scale (wrong). The same corner maps to (0, 1), and the stretch
    //  applies along the screen's axes after the turn. Every tile is twice as wide
    //  regardless of which way it points."
    const m = transformMatrix({ scaleX: 2, scaleY: 1, rotation: 90 }, unitBox);
    const [b, d] = [m[1], m[3]];
    expect(b * 1 + d * 0).not.toBeCloseTo(1, 6);
  });

  it("turns clockwise for positive rotation in y-down space — 07 §6.2", () => {
    // 02 §5 puts y increasing downward. Reversing this sign would flip every
    // asymmetric tile in every existing config with no version number moving.
    const m = transformMatrix({ scaleX: 1, scaleY: 1, rotation: 90 }, unitBox);
    // +x maps to +y, which on screen is rightward going downward: clockwise.
    expect(m[0]).toBeCloseTo(0, 10);
    expect(m[1]).toBeCloseTo(1, 10);
  });

  it("occupies exactly its cell box at scale 1, rotation 0 — R7", () => {
    const box = cellBox(geo(1280), 3, 2);
    const m = transformMatrix({ scaleX: 1, scaleY: 1, rotation: 0 }, box);
    // `c = -scaleY * sin(0)` is negative zero. Compared numerically rather than
    // with toEqual, which distinguishes -0 from 0 and nothing downstream does.
    expect(m.map((v) => v + 0)).toEqual([1, 0, 0, 1, 0, 0]);
    const tl = applyMatrix(m, box.left, box.top);
    expect(tl.x).toBeCloseTo(box.left, 10);
    expect(tl.y).toBeCloseTo(box.top, 10);
  });

  it("rotates about the drawable's centre, not the origin — D11", () => {
    const box = cellBox(geo(1280), 3, 2);
    const m = transformMatrix({ scaleX: 1, scaleY: 1, rotation: 45 }, box);
    const centre = applyMatrix(m, (box.left + box.right) / 2, (box.top + box.bottom) / 2);
    expect(centre.x).toBeCloseTo((box.left + box.right) / 2, 8);
    expect(centre.y).toBeCloseTo((box.top + box.bottom) / 2, 8);
  });

  it("mirrors about the centre axis for a negative scaleX — the flip primitive", () => {
    const box = cellBox(geo(1280), 3, 2);
    const m = transformMatrix({ scaleX: -1, scaleY: 1, rotation: 0 }, box);
    const left = applyMatrix(m, box.left, box.top);
    expect(left.x).toBeCloseTo(box.right, 8);
  });

  it("extends a 45deg drawable to cellSize * sqrt(2) — 07 §6.3, why cells cannot clip", () => {
    // At scaleX = scaleY = 1, a 45deg rotation extends the bounding box to
    // cellSize x sqrt(2). For cellSize 175 that is 247.5 design px, overhanging
    // each edge by 36.25. Rotation puts a square drawable outside its cell with
    // no scaling at all -- which is why R9 makes the render box the only clip.
    const g = geo(1280); // s = 1, so render px == design px here
    const box = cellBox(g, 3, 2);
    const m = transformMatrix({ scaleX: 1, scaleY: 1, rotation: 45 }, box);
    const corners = [
      applyMatrix(m, box.left, box.top),
      applyMatrix(m, box.right, box.top),
      applyMatrix(m, box.left, box.bottom),
      applyMatrix(m, box.right, box.bottom),
    ];
    const width = Math.max(...corners.map((p) => p.x)) - Math.min(...corners.map((p) => p.x));
    expect(width).toBeCloseTo(175 * Math.SQRT2, 6);
    expect(width).toBeCloseTo(247.487, 2);
    expect((width - 175) / 2).toBeCloseTo(36.24, 1);
  });

  it("keeps the CSS list in D11 order, matching the matrix — 07 §6.3, 08 §6.3", () => {
    // The trap both documents warn about: a CSS transform list applies right to
    // left, so the list must read translate(...) rotate(...) scale(...).
    const css = cssTransform({ scaleX: 2, scaleY: 1, rotation: 90 }, { xPercent: 0, yPercent: 0 });
    expect(css).toBe("translate(0%, 0%) rotate(90deg) scale(2, 1)");
    const rotateIndex = css.indexOf("rotate(");
    const scaleIndex = css.indexOf("scale(");
    const translateIndex = css.indexOf("translate(");
    // Right-to-left evaluation: scale first, then rotate, then translate.
    expect(translateIndex).toBeLessThan(rotateIndex);
    expect(rotateIndex).toBeLessThan(scaleIndex);
  });
});
