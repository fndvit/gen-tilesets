/**
 * Shape — `./shape.ts`.
 *
 * Properties, never fixed expected values (`ARCHITECTURE.md`'s *Testing*): the
 * five vector tables `05` §11 requires do not exist yet and nothing here is one.
 *
 * Four of these carry more weight than the rest and are worth naming:
 *
 * - **the derived file validates clean.** `reshape` writes a `Layout`, and a
 *   `Layout` has bounds. Running `validate()` over the *output* is the one
 *   assertion that catches a bad derivation, at every shape, without restating
 *   the arithmetic.
 * - **identity is kept where nothing changed.** `<Tileset>` tells a density
 *   change from a size change by whether `config` is the same object, so a
 *   reshape that cloned it for tidiness would regenerate on every breakpoint.
 * - **the decoration preset's exactnesses are asserted, not believed.** Zero
 *   bleed buys `originX === 0`, `scaleFactor === 1` and `presentScale === 1` at
 *   integer DPR. Strict equality, not `toBeCloseTo` — `SUBPIXEL-GEOMETRY.md`
 *   records four confident claims about geometry that turned out to be false.
 * - **resizing disturbs no cell that was already there**, except under
 *   `gradient`, which is the documented exception and is pinned as one.
 *
 * These were `decoration.test.ts` until 0.7.0; every assertion it made is here,
 * against `reshape` with the decoration preset.
 */

import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import { originX, scaleFactor, naturalRatio, type GridGeometry } from "./render/geometry.js";
import { uniformGeometry } from "./render/uniform.js";
import {
  coordinateBoundOperations,
  reshape,
  reshapeErrors,
  shapeFieldProblem,
  shapeOf,
} from "./shape.js";
import { tileStateAt, type Operation, type Shape, type TilesetFile } from "./types.js";
import { SCHEMA_VERSION, validate } from "./validate.js";

/**
 * A style: procedural Selections only, and a `{tileId: null}` palette entry so
 * emptiness is generated.
 *
 * **Its `layout` is deliberately hostile** — a bleed (`76 * 175` against a
 * `referenceWidth` of 1280) and a non-zero `yOffset` — so a test that passes
 * because the transform forgot to override something cannot pass by accident.
 */
const style = (ops?: Operation[]): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 40,
    columns: 76,
    defaultSeed: "opal-ridge-80",
    assetSalt: 7,
    reseedAssetsOnLoad: true,
    tiles: [
      { id: "solid", name: "solid", assets: [{ id: "a1", weight: 1 }, { id: "a2", weight: 1 }] },
      { id: "wedge", name: "wedge", assets: [{ id: "a1", weight: 1 }] },
    ],
    operations: ops ?? [
      {
        id: "fill",
        salt: 0,
        reseedOnLoad: false,
        selection: { type: "all" },
        source: { type: "random" },
        target: "tileId",
        mapping: {
          palette: [
            { tileId: "solid", weight: 2 },
            { tileId: "wedge", weight: 1 },
            { tileId: null, weight: 3 },
          ],
        },
        blend: "set",
      },
      {
        id: "spin",
        salt: 1,
        reseedOnLoad: false,
        selection: { type: "random", density: 0.5 },
        source: { type: "random" },
        target: "rotation",
        mapping: { range: [0, 270], steps: 4 },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 175, referenceWidth: 1280, yOffset: 0.25, horizontalAlignment: "gutter" },
});

/** An ordinary page-scale file: 1440 design px, 60px cells, 25 columns, one of bleed. */
const hero = (ops?: Operation[]): TilesetFile => ({
  ...style(ops),
  config: { ...style(ops).config, rows: 8, columns: 25 },
  layout: { cellSize: 60, referenceWidth: 1440, yOffset: 0, horizontalAlignment: "column" },
});

const coordinateBound = (type: string, params: Record<string, unknown>): Operation => ({
  id: `op-${type}`,
  salt: 0,
  reseedOnLoad: false,
  selection: { type, ...params },
  source: { type: "constant" },
  target: "tileId",
  mapping: { palette: [{ tileId: "solid", weight: 1 }] },
  blend: "set",
});

/** `<TileDecoration>`'s preset. */
interface Spot {
  rows: number;
  columns: number;
  cellSize: number;
}
const decoration = (d: Spot): Partial<Shape> => ({ ...d, bleed: 0, yOffset: 0 });

const spot: Spot = { rows: 3, columns: 2, cellSize: 60 };

/** The sizes swept wherever a property must hold at more than one. */
const SPOTS: Spot[] = [
  { rows: 1, columns: 1, cellSize: 60 },
  { rows: 2, columns: 2, cellSize: 60 },
  { rows: 3, columns: 2, cellSize: 60 },
  { rows: 2, columns: 4, cellSize: 40 },
  { rows: 4, columns: 3, cellSize: 96 },
  { rows: 3, columns: 3, cellSize: 12.5 },
];

const geoFor = (file: TilesetFile, Wpx: number): GridGeometry => ({
  layout: file.layout,
  rows: file.config.rows,
  columns: file.config.columns,
  Wpx,
});

describe("shapeOf", () => {
  it("reads bleed back out of referenceWidth, in cells", () => {
    expect(shapeOf(hero())).toEqual({ rows: 8, columns: 25, cellSize: 60, bleed: 1, yOffset: 0 });
  });

  it("round-trips through reshape at the same shape, to the last bit", () => {
    // The bleed is read back as a float, and a derivation from it need not give
    // `referenceWidth` back exactly — which is why `reshape` keeps the file's
    // value verbatim when neither `columns` nor `cellSize` moved. Asserted on the
    // hostile layout, whose bleed is not a round number.
    const s = style();
    const { bleed: _bleed, ...rest } = shapeOf(s);
    expect(reshape(s, rest).layout.referenceWidth).toBe(1280);
  });
});

describe("reshape — the derivations", () => {
  it("takes every named field from the override", () => {
    const out = reshape(hero(), { rows: 3, columns: 11, cellSize: 44, bleed: 2, yOffset: 0.5 });
    expect(out.config.rows).toBe(3);
    expect(out.config.columns).toBe(11);
    expect(out.layout.cellSize).toBe(44);
    expect(out.layout.referenceWidth).toBe((11 - 2) * 44);
    expect(out.layout.yOffset).toBe(0.5);
  });

  it("keeps the base's bleed in cells when columns change and bleed is not named", () => {
    for (const columns of [5, 9, 24, 25, 40]) {
      expect(shapeOf(reshape(hero(), { columns })).bleed).toBe(1);
    }
  });

  it("keeps the base's bleed in cells when cellSize changes", () => {
    const out = reshape(hero(), { cellSize: 30 });
    expect(out.layout.referenceWidth).toBe(720);
    expect(shapeOf(out).bleed).toBe(1);
  });

  it("carries horizontalAlignment through untouched", () => {
    expect(reshape(style(), decoration(spot)).layout.horizontalAlignment).toBe("gutter");
  });

  it("drops the file's responsive rules, which were written for the base it replaces", () => {
    const f: TilesetFile = { ...hero(), responsive: [{ maxWidth: 500, rows: 14 }] };
    expect(reshape(f, { rows: 3 }).responsive).toBeUndefined();
    expect("responsive" in reshape(f, { rows: 3 })).toBe(false);
    // Even with nothing to change: the result is a new base either way.
    expect("responsive" in reshape(f, {})).toBe(false);
  });
});

describe("reshape — what is shared", () => {
  it("returns the file itself for an empty override", () => {
    const f = hero();
    expect(reshape(f, {})).toBe(f);
  });

  it("returns the file itself for an override equal to its own shape", () => {
    const f = hero();
    expect(reshape(f, { rows: 8, columns: 25, cellSize: 60, bleed: 1 })).toBe(f);
  });

  it("keeps config by reference when rows and columns are unchanged", () => {
    // What `<Tileset>` reads a density-only breakpoint by: same config object,
    // no regeneration.
    const f = hero();
    const out = reshape(f, { cellSize: 44, bleed: 0, yOffset: 0.5 });
    expect(out).not.toBe(f);
    expect(out.config).toBe(f.config);
  });

  it("keeps layout by reference when only rows change", () => {
    const f = hero();
    const out = reshape(f, { rows: 3 });
    expect(out.layout).toBe(f.layout);
    expect(out.config).not.toBe(f.config);
  });

  it("shares tiles and operations by reference rather than cloning them", () => {
    // Twelve reshapes hold one `tiles` array between them, so there is nothing
    // to drift. Asserted because a later `structuredClone` added for tidiness
    // would silently cost exactly the thing this exists for.
    const s = style();
    const a = reshape(s, decoration({ rows: 1, columns: 1, cellSize: 60 }));
    const b = reshape(s, decoration({ rows: 2, columns: 4, cellSize: 40 }));
    expect(a.config.tiles).toBe(s.config.tiles);
    expect(a.config.operations).toBe(s.config.operations);
    expect(b.config.tiles).toBe(a.config.tiles);
  });

  it("passes every other field through", () => {
    const s = style();
    const file = reshape(s, decoration(spot));
    expect(file.schemaVersion).toBe(s.schemaVersion);
    expect(file.engineVersion).toBe(s.engineVersion);
    expect(file.config.defaultSeed).toBe(s.config.defaultSeed);
    expect(file.config.assetSalt).toBe(s.config.assetSalt);
    expect(file.config.reseedAssetsOnLoad).toBe(s.config.reseedAssetsOnLoad);
  });

  it("does not mutate its input", () => {
    const s: TilesetFile = { ...style(), responsive: [{ maxWidth: 500, columns: 9 }] };
    const before = structuredClone(s);
    reshape(s, decoration(spot));
    expect(s).toEqual(before);
  });
});

describe("reshape — the output is a valid file", () => {
  it("validates clean at every decoration size", () => {
    for (const d of SPOTS) expect(validate(reshape(style(), decoration(d)))).toEqual([]);
  });

  it("validates clean at page-scale shapes", () => {
    for (const s of [{ rows: 3 }, { columns: 9, rows: 14 }, { cellSize: 30 }, { columns: 40, bleed: -2 }]) {
      expect(validate(reshape(hero(), s))).toEqual([]);
    }
  });
});

describe("the decoration preset — the exactnesses zero bleed buys", () => {
  it("derives referenceWidth as columns * cellSize, so the bleed is zero", () => {
    for (const d of SPOTS) {
      expect(reshape(style(), decoration(d)).layout.referenceWidth).toBe(d.columns * d.cellSize);
    }
  });

  it("zeroes yOffset, whatever the style declared", () => {
    expect(style().layout.yOffset).toBe(0.25);
    expect(reshape(style(), decoration(spot)).layout.yOffset).toBe(0);
  });

  it("puts originX at exactly 0 at the decoration's own width", () => {
    for (const d of SPOTS) {
      const file = reshape(style(), decoration(d));
      expect(originX(geoFor(file, d.columns * d.cellSize))).toBe(0);
    }
  });

  it("puts scaleFactor at exactly 1 at the decoration's own width", () => {
    for (const d of SPOTS) {
      const file = reshape(style(), decoration(d));
      expect(scaleFactor(geoFor(file, d.columns * d.cellSize))).toBe(1);
    }
  });

  it("leaves no presentation residual at integer DPR", () => {
    for (const d of SPOTS.filter((s) => Number.isInteger(s.cellSize))) {
      const file = reshape(style(), decoration(d));
      const g = geoFor(file, d.columns * d.cellSize);
      for (const dpr of [1, 2, 3]) {
        const u = uniformGeometry(g, dpr);
        expect(u.presentScale).toBe(1);
        expect(u.cellDev).toBe(d.cellSize * dpr);
        expect(u.gridWidthDev).toBe(d.columns * d.cellSize * dpr);
      }
    }
  });

  it("gives the box the ratio columns : rows", () => {
    for (const d of SPOTS) {
      const file = reshape(style(), decoration(d));
      expect(naturalRatio(file.layout, file.config.rows)).toBe(d.columns / d.rows);
    }
  });
});

describe("reshape — variation and determinism", () => {
  const gridFor = (file: TilesetFile, s: Partial<Shape>, seed: string) =>
    generate(reshape(file, s).config, seed);

  it("is deterministic in (file, override, seed)", () => {
    expect(gridFor(style(), decoration(spot), "board-tl")).toEqual(gridFor(style(), decoration(spot), "board-tl"));
  });

  it("gives two placements of the same size different pictures under different seeds", () => {
    const bigger = decoration({ rows: 8, columns: 8, cellSize: 60 });
    expect(gridFor(style(), bigger, "board-tl")).not.toEqual(gridFor(style(), bigger, "board-br"));
  });

  it("gives two placements of the same size and seed the same picture", () => {
    const a = decoration({ rows: 4, columns: 3, cellSize: 60 });
    const b = decoration({ rows: 4, columns: 3, cellSize: 12 });
    expect(gridFor(style(), a, "same")).toEqual(gridFor(style(), b, "same"));
  });

  it("leaves every existing cell untouched when the grid grows or shrinks", () => {
    // Positional hashing's dividend: randomness is addressed by `(x, y)` rather
    // than drawn from a stream, so a breakpoint that adds or removes columns
    // extends or trims the picture instead of reshuffling it.
    const small = gridFor(hero(), { rows: 3, columns: 9 }, "grow");
    const large = gridFor(hero(), { rows: 14, columns: 25 }, "grow");
    for (let y = 0; y < small.rows; y++) {
      for (let x = 0; x < small.columns; x++) {
        expect(tileStateAt(large, x, y)).toEqual(tileStateAt(small, x, y));
      }
    }
  });

  it("does not hold for gradient, which stretches to the new grid — the documented exception", () => {
    const ramp: Operation = {
      id: "ramp",
      selection: { type: "all" },
      source: { type: "gradient", angle: 0 },
      target: "opacity",
      mapping: { range: [0, 1] },
      blend: "set",
    };
    const small = gridFor(hero([ramp]), { columns: 5 }, "g");
    const large = gridFor(hero([ramp]), { columns: 25 }, "g");
    // Both reach the top of the range at their own last column.
    expect(tileStateAt(small, 4, 0)!.opacity).toBe(1);
    expect(tileStateAt(large, 24, 0)!.opacity).toBe(1);
    // So column 4 is at the end of one ramp and a sixth of the way along the other.
    expect(tileStateAt(large, 4, 0)!.opacity).not.toBe(tileStateAt(small, 4, 0)!.opacity);
  });

  it("generates emptiness, so a spot has a silhouette of its own", () => {
    const grid = gridFor(style(), decoration({ rows: 6, columns: 6, cellSize: 60 }), "silhouette");
    const empty = grid.cells.filter((c) => c.tileId === null).length;
    expect(empty).toBeGreaterThan(0);
    expect(empty).toBeLessThan(grid.cells.length);
  });
});

describe("shapeFieldProblem", () => {
  it("accepts the domain and names what is outside it", () => {
    expect(shapeFieldProblem("rows", 1)).toBeNull();
    expect(shapeFieldProblem("rows", 0)?.code).toBe("OUT_OF_RANGE");
    expect(shapeFieldProblem("columns", 2.5)?.code).toBe("NOT_AN_INTEGER");
    expect(shapeFieldProblem("cellSize", 0)?.code).toBe("OUT_OF_RANGE");
    expect(shapeFieldProblem("cellSize", Number.NaN)?.code).toBe("NOT_FINITE");
    expect(shapeFieldProblem("yOffset", 1)?.code).toBe("OUT_OF_RANGE");
    expect(shapeFieldProblem("yOffset", "0")?.code).toBe("TYPE_MISMATCH");
    expect(shapeFieldProblem("bleed", -3)).toBeNull();
  });
});

describe("reshapeErrors", () => {
  it("passes a procedural file at any shape", () => {
    expect(reshapeErrors(style(), decoration(spot))).toEqual([]);
    expect(reshapeErrors(hero(), { rows: 14, columns: 9 })).toEqual([]);
  });

  it("flags rect and cellList when rows or columns are named, naming the Operation", () => {
    for (const op of [
      coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 }),
      coordinateBound("cellList", { cells: [[0, 0], [1, 2]] }),
    ]) {
      for (const s of [{ rows: 3 }, { columns: 3, bleed: 0 }, decoration(spot)]) {
        const errors = reshapeErrors(style([op]), s);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(op.id);
        expect(errors[0]).toContain(op.selection.type as string);
      }
    }
  });

  it("lets a pinned file change cellSize, bleed and yOffset", () => {
    // The restriction is on the cells, and these three move no cell.
    const pinned = hero([coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 })]);
    expect(reshapeErrors(pinned, { cellSize: 44, bleed: 0, yOffset: 0.5 })).toEqual([]);
  });

  it("checks by name, not by value — an unchanged rows still pins", () => {
    const pinned = hero([coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 })]);
    expect(reshapeErrors(pinned, { rows: 8 })).toHaveLength(1);
  });

  it("reports one message per offending Operation, in stack order", () => {
    const errors = reshapeErrors(
      style([
        coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 }),
        { ...coordinateBound("cellList", { cells: [[0, 0]] }), id: "second" },
      ]),
      { rows: 2 },
    );
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("op-rect");
    expect(errors[1]).toContain("second");
  });

  it("agrees with the registry rather than with a list of names", () => {
    const ops = [
      coordinateBound("rect", { x: 0, y: 0, width: 1, height: 1 }),
      { ...coordinateBound("all", {}), id: "procedural" },
    ];
    expect(coordinateBoundOperations(ops).map((op) => op.id)).toEqual(["op-rect"]);
    expect(reshapeErrors(style(ops), { rows: 2 })).toHaveLength(1);
  });

  it("leaves an unknown Selection type to validate()", () => {
    const unknown = style([coordinateBound("noSuchSelection", {})]);
    expect(() => reshapeErrors(unknown, { rows: 2 })).not.toThrow();
    expect(reshapeErrors(unknown, { rows: 2 })).toEqual([]);
    expect(validate(unknown).map((e) => e.code)).toContain("UNKNOWN_TYPE_NAME");
  });

  it("reports bad values, unknown keys, and a bleed that leaves no box", () => {
    expect(reshapeErrors(hero(), { rows: 0 })).toHaveLength(1);
    expect(reshapeErrors(hero(), { cellSize: -1 })).toHaveLength(1);
    const unknown = reshapeErrors(hero(), { referenceWidth: 1000 } as Partial<Shape>);
    expect(unknown).toHaveLength(1);
    expect(unknown[0]).toContain("bleed");
    expect(reshapeErrors(hero(), { columns: 4, bleed: 4 })).toHaveLength(1);
  });

  it("reports an inherited bleed that no longer fits, rather than drawing nothing", () => {
    // The hostile style overhangs its box by ~69 of its 76 columns. Keeping that
    // bleed in cells at 3 columns leaves a negative box — loud here, instead of a
    // picture that silently vanishes.
    const errors = reshapeErrors(style(), { columns: 3 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("columns - bleed");
  });
});
