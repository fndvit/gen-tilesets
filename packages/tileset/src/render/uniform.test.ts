import { describe, expect, it } from "vitest";
import type { Grid, Layout, TileState } from "../types.js";
import { naturalHeight, originX, scaleFactor, type GridGeometry } from "./geometry.js";
import { domGeometry, uniformDrawList, uniformGeometry } from "./uniform.js";
import { applyMatrix } from "./transform.js";
import { assetKey } from "./provider.js";

/** The reported case: design width 1000, cell size 100, render box 827px. */
const layout: Layout = {
  cellSize: 100,
  referenceWidth: 1000,
  yOffset: 0,
  horizontalAlignment: "gutter",
};
const geo = (Wpx: number): GridGeometry => ({ layout, rows: 12, columns: 11, Wpx });

/** 07 §5.4's layout, which has a fractional yOffset and a bleed. */
const offsetLayout: Layout = {
  cellSize: 175,
  referenceWidth: 1280,
  yOffset: 0.3,
  horizontalAlignment: "gutter",
};
const offsetGeo = (Wpx: number): GridGeometry => ({
  layout: offsetLayout,
  rows: 5,
  columns: 8,
  Wpx,
});

/**
 * The footer preset at its worst measured width. 76 columns in a 341px box at
 * DPR 1 gives `cellDev = 4` and a +12.17% presentation resample — the extreme of
 * the `1 / (2 * cellDev)` bound. The recommendation is confirmed across the whole
 * span of cell sizes this layout produces, not only in the comfortable middle, so
 * the tests have to reach the end of it.
 */
const footerLayout: Layout = {
  cellSize: 15,
  referenceWidth: 76 * 15,
  yOffset: 0,
  horizontalAlignment: "gutter",
};
const footerGeo = (Wpx: number): GridGeometry => ({
  layout: footerLayout,
  rows: 10,
  columns: 76,
  Wpx,
});

/** Awkward on purpose. 827 is the reported width; 600 and 1000 divide evenly. */
const WIDTHS = [827, 615, 600, 768.4, 1000, 1237.3, 1920.5];
const DPRS = [1, 1.5, 2, 3];
const ALL = [
  { name: "the reported 1000/100 layout", g: geo },
  { name: "07 §5.4's bleeding, y-offset layout", g: offsetGeo },
  { name: "the 76-column footer preset", g: footerGeo },
];

const identity = (tileId: string | null): TileState => ({
  tileId,
  assetId: tileId === null ? null : "a1",
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  translateX: 0,
  translateY: 0,
});

function gridOf(rows: number, columns: number, cell: (i: number) => TileState): Grid<TileState> {
  return { rows, columns, cells: Array.from({ length: rows * columns }, (_, i) => cell(i)) };
}

describe("the cell is square — the property the chord cannot survive", () => {
  it.each(ALL)("gives every cell one integer side on both axes — $name", ({ g: mk }) => {
    // This is the whole fix. Per-edge snapping paired an x edge with a y edge from
    // two independently snapped sequences and produced 133x132; R8's centre-crop
    // then answered that half pixel with a flat chord tangent to the curve, up to
    // 19.5px on a 190px cell. A square destination has nothing to crop.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const u = uniformGeometry(mk(Wpx), dpr);
        expect(Number.isInteger(u.cellDev)).toBe(true);
        expect(u.cellDev).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("emits a square destination rect for every cell in the list", () => {
    const grid = gridOf(12, 11, () => identity("t1"));
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const u = uniformGeometry(geo(Wpx), dpr);
        const list = uniformDrawList(geo(Wpx), grid, dpr, 0, assetKey);
        for (const item of list) expect(item.side).toBe(u.cellDev);
      }
    }
  });

  it("never falls below one device pixel, however narrow the box", () => {
    // Degenerate rather than an error. A zero would make every edge coincide.
    for (const Wpx of [1, 4, 12]) {
      expect(uniformGeometry(footerGeo(Wpx), 1).cellDev).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("the shared edge survives — R6", () => {
  it.each(ALL)("makes cell k's right edge identically cell k+1's left — $name", ({ g: mk }) => {
    // Shorter than the argument it replaces: an integer origin plus an integer
    // pitch means edge k is `origin + k * cellDev`, one number serving both
    // neighbours. A gap is not unlikely, it is unrepresentable -- and now the
    // widths are equal as well as adjacent.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = mk(Wpx);
        const u = uniformGeometry(g, dpr);
        for (let k = 0; k < g.columns; k++) {
          const right = u.originXDev + k * u.cellDev + u.cellDev;
          expect(right).toBe(u.originXDev + (k + 1) * u.cellDev);
        }
      }
    }
  });

  it("leaves no gap or overlap between adjacent draw items", () => {
    const grid = gridOf(12, 11, () => identity("t1"));
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const list = uniformDrawList(geo(Wpx), grid, dpr, 0, assetKey);
        const byXY = new Map(list.map((i) => [`${i.x},${i.y}`, i]));
        for (const item of list) {
          const right = byXY.get(`${item.x + 1},${item.y}`);
          if (right !== undefined) expect(item.dx + item.side).toBe(right.dx);
          const below = byXY.get(`${item.x},${item.y + 1}`);
          if (below !== undefined) expect(item.dy + item.side).toBe(below.dy);
        }
      }
    }
  });

  it("puts every coordinate on a whole device pixel", () => {
    const grid = gridOf(5, 8, () => identity("t1"));
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        for (const item of uniformDrawList(offsetGeo(Wpx), grid, dpr, 0, assetKey)) {
          expect(Number.isInteger(item.dx)).toBe(true);
          expect(Number.isInteger(item.dy)).toBe(true);
        }
      }
    }
  });
});

describe("the presentation carries the whole residual", () => {
  it.each(ALL)("keeps presentScale within 1 +/- 1/(2*cellDev) — $name", ({ g: mk }) => {
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const u = uniformGeometry(mk(Wpx), dpr);
        // `round` is what earns this bound; `ceil` would only bound it above.
        expect(Math.abs(u.presentScale - 1)).toBeLessThanOrEqual(1 / (2 * u.cellDev) + 1e-12);
      }
    }
  });

  it("reaches the extreme of that bound at the footer preset's worst width", () => {
    // 76 columns, 341px, DPR 1. The reading the recommendation is confirmed
    // against: cellDev 4, roughly +12%, and zero gaps.
    const u = uniformGeometry(footerGeo(341), 1);
    expect(u.cellDev).toBe(4);
    expect((u.presentScale - 1) * 100).toBeGreaterThan(10);
    expect(Math.abs(u.presentScale - 1)).toBeLessThanOrEqual(1 / (2 * u.cellDev) + 1e-12);
  });

  it.each(ALL)("presents at exactly the ideal grid width — $name", ({ g: mk }) => {
    // A drift here is the one failure mode the split introduces that the old
    // geometry could not have: the raster and the presentation disagreeing. Not
    // `gridWidthDev / dpr` -- the two differ by exactly the residual, and handing
    // over the ideal one IS the mechanism.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = mk(Wpx);
        const u = uniformGeometry(g, dpr);
        expect(u.presentedWidthCss).toBe(scaleFactor(g) * g.columns * g.layout.cellSize);
        expect(u.originXCss).toBe(originX(g));
      }
    }
  });

  it("is exactly 1, and the raster exactly the box, at a width that needs no rounding", () => {
    // The control: a width at which `idealCell` is already a whole number of
    // device pixels, so nothing has to be rounded. There the presented and snapped
    // geometries must agree pixel for pixel, and a reading taken at such a width
    // contains none of the resample the split trades away.
    for (const dpr of DPRS) {
      // Wpx chosen so `s * cellSize * dpr` is a whole number: cellSize 100,
      // referenceWidth 1000, so idealCell = Wpx * dpr / 10.
      const Wpx = 100 / dpr;
      const u = uniformGeometry(geo(Wpx), dpr);
      expect(u.presentScale).toBe(1);
      expect(u.gridWidthDev / dpr).toBeCloseTo(u.presentedWidthCss, 9);
    }
  });

  it("cancels the quantisation exactly, so a presented edge IS cellBox's", () => {
    // The identity the two editor overlays rest on. Presented edge k, in CSS px:
    //   originX + (k * cellDev / dpr) * presentScale
    //     = originX + k * idealCell / dpr
    //     = originX + k * s * cellSize          === cellBox(g, k, .).left
    // The snapping lives entirely inside the raster; the presentation undoes it.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = offsetGeo(Wpx);
        const u = uniformGeometry(g, dpr);
        for (let k = 0; k <= g.columns; k++) {
          const presented = u.originXCss + ((k * u.cellDev) / dpr) * u.presentScale;
          const ideal = originX(g) + scaleFactor(g) * k * g.layout.cellSize;
          expect(presented).toBeCloseTo(ideal, 9);
        }
      }
    }
  });
});

describe("the raster's height comes off the edge arithmetic, not off yOffset", () => {
  it("equals the last horizontal edge at every width and DPR", () => {
    // `(rows - yOffset) * cellDev` looks equivalent and is not: originYDev is
    // rounded, so for a fractional yOffset the two differ by up to half a device
    // pixel and the last row lands just inside or just outside -- a hairline of
    // backdrop under the bottom row, or a shaved bottom row.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = offsetGeo(Wpx);
        const u = uniformGeometry(g, dpr);
        const lastEdge = u.originYDev + g.rows * u.cellDev;
        expect(u.rasterHeightDev).toBe(lastEdge);
        expect(Number.isInteger(u.rasterHeightDev)).toBe(true);
      }
    }
  });

  it("differs from the naive product exactly where the naive product is wrong", () => {
    // Not a tautology: it demonstrates the two formulas actually disagree, so the
    // test above is constraining something.
    const disagreements = WIDTHS.flatMap((Wpx) =>
      DPRS.map((dpr) => {
        const g = offsetGeo(Wpx);
        const u = uniformGeometry(g, dpr);
        return u.rasterHeightDev - (g.rows - g.layout.yOffset) * u.cellDev;
      }),
    );
    expect(disagreements.some((d) => Math.abs(d) > 1e-9)).toBe(true);
    // And never by more than the rounding that causes it.
    for (const d of disagreements) expect(Math.abs(d)).toBeLessThanOrEqual(0.5);
  });

  it("puts the top of row 0 above the raster for a non-zero yOffset — R9", () => {
    expect(uniformGeometry(offsetGeo(1280), 2).originYDev).toBeLessThan(0);
    // Compared with ==, not Object.is: `-Math.round(0 * cellDev)` is negative
    // zero, and -0 === 0. The sign of zero is not observable in any rendered
    // output -- `geometry.test.ts` makes the same allowance for `originY`.
    expect(uniformGeometry(geo(1280), 2).originYDev === 0).toBe(true);
  });
});

describe("the presented canvas is not the same height as the declared ratio", () => {
  /**
   * Why the canvas wrapper stops declaring `naturalRatio` once it has a canvas.
   *
   * `height: auto` gives the presented canvas its backing store's ratio, so its
   * CSS height is `presentedWidthCss * rasterHeightDev / gridWidthDev`. The
   * wrapper's declared ratio would give `naturalHeight`. Those are **not** the
   * same number, because `originYDev` is rounded — and where they differ, a
   * wrapper taller than its canvas shows the page backdrop as a hairline under the
   * bottom row.
   */
  const canvasHeightCss = (g: GridGeometry, dpr: number): number => {
    const u = uniformGeometry(g, dpr);
    return (u.presentedWidthCss * u.rasterHeightDev) / u.gridWidthDev;
  };

  it("agrees exactly when yOffset is 0, so the rounding is the whole cause", () => {
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        expect(canvasHeightCss(geo(Wpx), dpr)).toBeCloseTo(naturalHeight(geo(Wpx)), 9);
        expect(canvasHeightCss(footerGeo(Wpx), dpr)).toBeCloseTo(naturalHeight(footerGeo(Wpx)), 9);
      }
    }
  });

  it("disagrees at a fractional yOffset, and the canvas is sometimes SHORTER", () => {
    // The direction matters: shorter is the failing one. A hairline of backdrop
    // under the bottom row is the defect class this whole change removes, so the
    // wrapper must not out-declare its canvas.
    const deltas: number[] = [];
    for (let Wpx = 300; Wpx <= 1400; Wpx += 0.5) {
      for (const dpr of DPRS) {
        deltas.push(canvasHeightCss(offsetGeo(Wpx), dpr) - naturalHeight(offsetGeo(Wpx)));
      }
    }
    expect(Math.min(...deltas)).toBeLessThan(-0.4);
    // Bounded by the rounding that causes it: half a device pixel, presented.
    for (const d of deltas) expect(Math.abs(d)).toBeLessThanOrEqual(0.51);
  });
});

describe("uniformDrawList — R10, R5, G4", () => {
  it("is row-major, so index order is paint order — R10", () => {
    const grid = gridOf(12, 11, () => identity("t1"));
    const list = uniformDrawList(geo(827), grid, 2, 0, assetKey);
    expect(list.length).toBe(12 * 11);
    for (let i = 0; i < list.length; i++) {
      expect(list[i]!.x).toBe(i % 11);
      expect(list[i]!.y).toBe(Math.floor(i / 11));
    }
  });

  it("omits empty cells rather than emitting a null key — G4", () => {
    const grid = gridOf(12, 11, (i) => identity(i % 3 === 0 ? null : "t1"));
    const list = uniformDrawList(geo(827), grid, 2, 0, assetKey);
    expect(list.length).toBe(grid.cells.filter((c) => c.tileId !== null).length);
    expect(list.every((i) => i.key.length > 0)).toBe(true);
  });

  it("reads no asset — R5", () => {
    // Geometry is committed before resolution is attempted and never revised as a
    // result of it. That is why a missing asset leaves a hole in a laid-out grid
    // rather than collapsing it.
    expect(uniformDrawList.length).toBe(5);
    const keys = new Set<string>();
    uniformDrawList(geo(827), gridOf(2, 2, () => identity("t1")), 2, 0, (t, a) => {
      keys.add(`${t}/${a}`);
      return assetKey(t, a);
    });
    expect([...keys]).toEqual(["t1/a1"]);
  });

  it("carries opacity verbatim and nulls the matrix only for an identity cell", () => {
    const grid = gridOf(2, 2, (i) => ({
      ...identity("t1"),
      opacity: i === 0 ? 0.25 : 1,
      rotation: i === 1 ? 45 : 0,
    }));
    const list = uniformDrawList(geo(827), grid, 2, 0, assetKey);
    expect(list[0]!.alpha).toBe(0.25);
    expect(list[0]!.matrix).toBeNull();
    expect(list[1]!.matrix).not.toBeNull();
  });

  it("sees ADR-005's uniform factor cancelling an axis, because it is one matrix", () => {
    const grid = gridOf(1, 1, () => ({ ...identity("t1"), scale: 2, scaleX: 0.5, scaleY: 0.5 }));
    expect(uniformDrawList(geo(827), grid, 2, 0, assetKey)[0]!.matrix).toBeNull();
  });

  it("takes the transform about the cell's own centre — D11, R7", () => {
    const grid = gridOf(3, 3, () => ({ ...identity("t1"), rotation: 45 }));
    for (const item of uniformDrawList(geo(827), grid, 2, 0, assetKey)) {
      const centre = applyMatrix(item.matrix!, item.cx, item.cy);
      expect(centre.x).toBeCloseTo(item.cx, 9);
      expect(centre.y).toBeCloseTo(item.cy, 9);
    }
  });

  it("centres the grid in the box under the DOM origin, and not under the canvas one", () => {
    const list = uniformDrawList(geo(827), gridOf(1, 11, () => identity("t1")), 2, 0, assetKey);
    expect(list[0]!.dx).toBe(0);
    const u = uniformGeometry(geo(827), 2);
    const dom = uniformDrawList(geo(827), gridOf(1, 11, () => identity("t1")), 2, u.originXDev, assetKey);
    expect(dom[0]!.dx).toBe(u.originXDev);
  });
});

describe("translation is placement, not transform — 0.8.0", () => {
  const DPR_WIDTHS = [827, 615, 1237.3].flatMap((Wpx) => [1, 1.5, 2].map((dpr) => ({ Wpx, dpr })));

  it("draws an untranslated grid exactly as before: t = 0 moves nothing", () => {
    // `identity` already carries translate 0; the explicit object is the
    // pre-0.8.0 shape, with the fields absent, which is what a list built
    // before them computed.
    for (const { Wpx, dpr } of DPR_WIDTHS) {
      const grid = gridOf(3, 11, () => identity("t1"));
      const u = uniformGeometry(geo(Wpx), dpr);
      for (const item of uniformDrawList(geo(Wpx), grid, dpr, 0, assetKey)) {
        expect(item.dx).toBe(item.x * u.cellDev);
        expect(item.dy).toBe(u.originYDev + item.y * u.cellDev);
        expect(Object.is(item.dx, -0)).toBe(false);
      }
    }
  });

  it("shifts by round(t * cellDev), keeps the matrix null, and keeps every coordinate integral", () => {
    for (const { Wpx, dpr } of DPR_WIDTHS) {
      const base = uniformDrawList(geo(Wpx), gridOf(2, 3, () => identity("t1")), dpr, 0, assetKey);
      const moved = uniformDrawList(
        geo(Wpx),
        gridOf(2, 3, () => ({ ...identity("t1"), translateX: 0.37, translateY: -1.25 })),
        dpr,
        0,
        assetKey,
      );
      const { cellDev } = uniformGeometry(geo(Wpx), dpr);
      for (let i = 0; i < base.length; i++) {
        expect(moved[i]!.dx - base[i]!.dx).toBe(Math.round(0.37 * cellDev));
        expect(moved[i]!.dy - base[i]!.dy).toBe(Math.round(-1.25 * cellDev));
        expect(Number.isInteger(moved[i]!.dx) && Number.isInteger(moved[i]!.dy)).toBe(true);
        expect(moved[i]!.matrix).toBeNull();
      }
    }
  });

  it("keeps the shared edge between neighbours translated by the same amount — R6", () => {
    for (const { Wpx, dpr } of DPR_WIDTHS) {
      const grid = gridOf(2, 11, () => ({ ...identity("t1"), translateX: 0.5, translateY: 0.5 }));
      const list = uniformDrawList(geo(Wpx), grid, dpr, 0, assetKey);
      for (let i = 0; i + 1 < 11; i++) {
        expect(list[i]!.dx + list[i]!.side).toBe(list[i + 1]!.dx);
      }
    }
  });

  it("pivots a rotated tile about the centre it was moved to — transform(pos) + t", () => {
    const grid = gridOf(1, 1, () => ({ ...identity("t1"), rotation: 30, translateX: 2 }));
    const item = uniformDrawList(geo(827), grid, 2, 0, assetKey)[0]!;
    const centre = applyMatrix(item.matrix!, item.cx, item.cy);
    expect(centre.x).toBeCloseTo(item.cx, 9);
    expect(item.cx).toBe(item.dx + item.side / 2);
    expect(item.dx).toBe(Math.round(2 * item.side));
  });
  // No test that translation leaves the raster or the box alone: `uniformGeometry`,
  // `domGeometry` and `naturalHeight` take no grid, so no attribute can reach
  // them, and a test comparing a function of the layout with itself cannot fail.
});

describe("the quarter turn needs no transposed rect — blitRect's successor is nothing", () => {
  /**
   * The prediction recorded before it was read, and the reason `blitRect` is gone.
   *
   * `edges.ts` transposed the fill rect under a quarter turn because per-edge
   * snapping made the device rect 133x132, and rotating *that* about its centre
   * yields 132x133 — half a device pixel of the cell left bare down each side,
   * showing as a backdrop hairline beside an unrotated neighbour. A **square** rect
   * quarter-turned is the same rect, so the uniform cell removes the special case
   * rather than needing it.
   */
  it("maps the cell rect onto itself exactly, as a set of integer corners", () => {
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        for (const rotation of [90, -90, 270, 180]) {
          const grid = gridOf(3, 3, () => ({ ...identity("t1"), rotation }));
          for (const item of uniformDrawList(offsetGeo(Wpx), grid, dpr, 0, assetKey)) {
            const m = item.matrix!;
            const corners = [
              [item.dx, item.dy],
              [item.dx + item.side, item.dy],
              [item.dx, item.dy + item.side],
              [item.dx + item.side, item.dy + item.side],
            ].map(([x, y]) => {
              const p = applyMatrix(m, x!, y!);
              return `${Math.round(p.x * 1e9) / 1e9},${Math.round(p.y * 1e9) / 1e9}`;
            });
            const expected = [
              `${item.dx},${item.dy}`,
              `${item.dx + item.side},${item.dy}`,
              `${item.dx},${item.dy + item.side}`,
              `${item.dx + item.side},${item.dy + item.side}`,
            ];
            expect(new Set(corners)).toEqual(new Set(expected));
          }
        }
      }
    }
  });

  it("is exactly axis-aligned, not 6.12e-17 off — sincos", () => {
    const grid = gridOf(1, 1, () => ({ ...identity("t1"), rotation: 90 }));
    const m = uniformDrawList(geo(827), grid, 2, 0, assetKey)[0]!.matrix!;
    for (const v of [m[0], m[1], m[2], m[3]]) expect([0, 1, -1]).toContain(v + 0);
  });

  it("still lets a free angle spill, because a cell is not a clipping boundary", () => {
    const grid = gridOf(1, 1, () => ({ ...identity("t1"), rotation: 45 }));
    const item = uniformDrawList(geo(827), grid, 2, 0, assetKey)[0]!;
    const p = applyMatrix(item.matrix!, item.dx, item.dy);
    expect(p.x < item.dx || p.y < item.dy).toBe(true);
  });
});

describe("domGeometry — the DOM substrate cuts, and never gutters", () => {
  /**
   * The reported defect, and the property that states it.
   *
   * `uniformGeometry`'s `round` leaves the residual's *sign* free, so the grid is
   * sometimes wider than its box (clipped — wanted) and sometimes narrower (a band
   * of page backdrop down each side — the defect). The DOM substrate is the one
   * that feels the sign, because it has no presentation to undo the quantisation
   * with. `ceil` is the smallest integer cell that cannot fall short.
   *
   * `footerGeo` is the reported case exactly: 76 columns and zero bleed, so
   * `originX` is 0 and the residual is the only thing deciding clip vs. gutter.
   */
  const FINE: number[] = [];
  for (let Wpx = 300; Wpx <= 1800; Wpx += 0.5) FINE.push(Wpx);

  it("never leaves a gutter, at any width or DPR — the fix", () => {
    for (const Wpx of FINE) {
      for (const dpr of DPRS) {
        expect(domGeometry(footerGeo(Wpx), dpr).originXDev).toBeLessThanOrEqual(0);
      }
    }
  });

  it("is the assertion the shared geometry fails, so it constrains something", () => {
    // Not a tautology. Under `round` about half of these widths gutter, which is
    // what was seen on the demo's width slider.
    const guttered = FINE.filter((Wpx) => uniformGeometry(footerGeo(Wpx), 1).originXDev > 0);
    expect(guttered.length).toBeGreaterThan(FINE.length / 3);
  });

  it("covers the box on the horizontal axis — the same claim, on the grid", () => {
    for (const Wpx of FINE) {
      for (const dpr of DPRS) {
        const g = footerGeo(Wpx);
        const d = domGeometry(g, dpr);
        expect(g.columns * d.cellDev).toBeGreaterThanOrEqual(Wpx * dpr);
      }
    }
  });

  it("gives the box a height that is the grid's own extent — the bottom row", () => {
    // The second reading, and the reason `gridHeightDev` exists. The box used to
    // declare `naturalRatio` -- the *ideal* height -- while the grid inside it was
    // quantised, and since the grid is top-anchored the whole disagreement landed on
    // the bottom edge: up to `rows` device px shaved off the bottom row, which on a
    // 10-row 15px-cell grid is most of it.
    //
    // **The claim is not that this height covers `naturalHeight`.** It does not
    // always: at a fractional `yOffset` the rounded y origin can leave it up to half
    // a device pixel *short* of the ideal, which is the same half pixel the canvas
    // wrapper stops declaring a ratio for. The claim is that the box's height is the
    // grid's own extent, so there is no independent height for the bottom row to be
    // cut by. Its departure from the ideal is a layout fact, and it is bounded on
    // both sides: up to `rows` device px taller (the `ceil` cell) and up to half a
    // device pixel shorter (the rounded origin).
    for (const { g: mk } of ALL) {
      for (const Wpx of FINE) {
        for (const dpr of DPRS) {
          const g = mk(Wpx);
          const d = domGeometry(g, dpr);
          const delta = d.gridHeightDev - naturalHeight(g) * dpr;
          expect(delta).toBeGreaterThanOrEqual(-0.5 - 1e-9);
          expect(delta).toBeLessThan(g.rows + 1);
        }
      }
    }
  });

  it("is only ever short by the y origin's rounding, and only with a yOffset", () => {
    // The direction matters, and it identifies the cause. With `yOffset` 0 there is
    // no origin to round and the height can only exceed the ideal; the shortfall
    // exists solely at a fractional `yOffset`, and it is exactly the rounding.
    for (const Wpx of FINE) {
      for (const dpr of DPRS) {
        for (const mk of [geo, footerGeo]) {
          expect(domGeometry(mk(Wpx), dpr).gridHeightDev).toBeGreaterThanOrEqual(
            naturalHeight(mk(Wpx)) * dpr - 1e-9,
          );
        }
      }
    }
    const shortfalls = FINE.flatMap((Wpx) =>
      DPRS.map((dpr) => domGeometry(offsetGeo(Wpx), dpr).gridHeightDev - naturalHeight(offsetGeo(Wpx)) * dpr),
    );
    expect(Math.min(...shortfalls)).toBeLessThan(0);
    expect(Math.min(...shortfalls)).toBeGreaterThanOrEqual(-0.5 - 1e-9);
  });

  it("reads that height off the last horizontal edge, not off yOffset", () => {
    // `(rows - yOffset) * cellDev` looks equivalent and is not -- `originYDev` is
    // rounded, so at a fractional yOffset the two differ by up to half a device
    // pixel and the last row lands just inside or just outside the box. A height
    // that comes from the same expression as the cell placement cannot disagree
    // with the cell placement.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = offsetGeo(Wpx);
        const d = domGeometry(g, dpr);
        expect(d.gridHeightDev).toBe(d.originYDev + g.rows * d.cellDev);
        expect(Number.isInteger(d.gridHeightDev)).toBe(true);
      }
    }
  });

  it("differs from the naive product exactly where the naive product is wrong", () => {
    // Not a tautology: it shows the two formulas actually disagree, so the test
    // above is constraining something.
    const deltas = WIDTHS.flatMap((Wpx) =>
      DPRS.map((dpr) => {
        const g = offsetGeo(Wpx);
        const d = domGeometry(g, dpr);
        return d.gridHeightDev - (g.rows - g.layout.yOffset) * d.cellDev;
      }),
    );
    expect(deltas.some((v) => Math.abs(v) > 1e-9)).toBe(true);
    for (const v of deltas) expect(Math.abs(v)).toBeLessThanOrEqual(0.5);
  });

  it("keeps the y origin on `round`, so it agrees with uniformGeometry's", () => {
    // The vertical axis needs no guarantee once the box measures the grid, so this
    // is `round` and the two functions differ in exactly one thing: the cell.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = offsetGeo(Wpx);
        const d = domGeometry(g, dpr);
        expect(d.originYDev).toBe(-Math.round(g.layout.yOffset * d.cellDev));
        expect(d.originYDev).toBeLessThan(0);
        expect(Number.isInteger(d.originYDev)).toBe(true);
      }
    }
  });

  it("keeps the cell square, integral and at least one device pixel", () => {
    for (const { g: mk } of ALL) {
      for (const Wpx of [...WIDTHS, 1, 4, 12]) {
        for (const dpr of DPRS) {
          const d = domGeometry(mk(Wpx), dpr);
          expect(Number.isInteger(d.cellDev)).toBe(true);
          expect(d.cellDev).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(d.originXDev)).toBe(true);
          expect(Number.isInteger(d.originYDev)).toBe(true);
        }
      }
    }
  });

  it("keeps R6's shared edge — one number serves both neighbours", () => {
    for (const { g: mk } of ALL) {
      for (const Wpx of WIDTHS) {
        for (const dpr of DPRS) {
          const g = mk(Wpx);
          const d = domGeometry(g, dpr);
          for (let k = 0; k < g.columns; k++) {
            expect(d.originXDev + k * d.cellDev + d.cellDev).toBe(
              d.originXDev + (k + 1) * d.cellDev,
            );
          }
        }
      }
    }
  });

  it("bounds the overshoot at under one device pixel per column, plus the bleed", () => {
    // What keeps `ceil` from being unbounded clipping. The grid exceeds the box by
    // the author's designed bleed -- which is not this function's doing -- plus the
    // quantisation, and the quantisation is under one device pixel per column.
    for (const { g: mk } of ALL) {
      for (const Wpx of FINE) {
        for (const dpr of DPRS) {
          const g = mk(Wpx);
          const d = domGeometry(g, dpr);
          const bleedDev =
            scaleFactor(g) * (g.columns * g.layout.cellSize - g.layout.referenceWidth) * dpr;
          const overshoot = g.columns * d.cellDev - Wpx * dpr;
          expect(overshoot).toBeLessThan(bleedDev + g.columns + 1e-9);
        }
      }
    }
  });

  it("agrees with uniformGeometry exactly where nothing has to be rounded", () => {
    // The control: the two quantisations differ only where one of them rounds. At a
    // width whose ideal cell is already a whole number of device pixels they are the
    // same geometry, and the grid fits the box exactly.
    for (const dpr of DPRS) {
      // cellSize 100, referenceWidth 1000, so idealCell = Wpx * dpr / 10.
      const Wpx = 100 / dpr;
      const g = geo(Wpx);
      const u = uniformGeometry(g, dpr);
      const d = domGeometry(g, dpr);
      expect(d.cellDev).toBe(u.cellDev);
      expect(d.originXDev).toBe(u.originXDev);
      expect(d.originYDev).toBe(u.originYDev);
      expect(d.gridHeightDev).toBe(u.rasterHeightDev);
    }
  });

  it("puts the top of row 0 above the box for a non-zero yOffset — R9", () => {
    expect(domGeometry(offsetGeo(1280), 2).originYDev).toBeLessThan(0);
    // Compared with ==, not Object.is: `-Math.round(0 * cellDev)` is negative zero,
    // and the sign of zero is not observable in any rendered output.
    expect(domGeometry(geo(1280), 2).originYDev === 0).toBe(true);
  });
});
