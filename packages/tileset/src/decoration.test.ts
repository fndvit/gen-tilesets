/**
 * Decorations — `./decoration.ts`.
 *
 * Properties, never fixed expected values (`ARCHITECTURE.md`'s *Testing*): the
 * five vector tables `05` §11 requires do not exist yet and nothing here is one.
 *
 * Three of these carry more weight than the rest and are worth naming:
 *
 * - **the derived file validates clean.** `decorationFile` writes a `Layout`,
 *   and a `Layout` has bounds (`cellSize`/`referenceWidth` `> 0`, `yOffset` in
 *   `[0, 1)`). Running `validate()` over the *output* is the one assertion that
 *   catches a bad derivation, at every size, without restating the arithmetic.
 * - **the exactnesses are asserted, not believed.** `decoration.ts` claims zero
 *   bleed buys `originX === 0`, `scaleFactor === 1` and `presentScale === 1` at
 *   integer DPR. `uniform.test.ts` established the habit of pinning such an
 *   identity rather than trusting it, and `SUBPIXEL-GEOMETRY.md` records four
 *   confident claims about geometry that turned out to be false. Strict
 *   equality, not `toBeCloseTo`.
 * - **growing a decoration disturbs no cell that was already there.** That is
 *   positional hashing's dividend (`hash.test.ts` — "is positional, not
 *   sequential") and it is the property that makes one style serve every size
 *   rather than merely typecheck at every size.
 */

import { describe, expect, it } from "vitest";
import { decorationFile, decorationStyleErrors, type Decoration } from "./decoration.js";
import { generate } from "./generate.js";
import { originX, scaleFactor, naturalRatio, type GridGeometry } from "./render/geometry.js";
import { uniformGeometry } from "./render/uniform.js";
import { tileStateAt, type Operation, type TilesetFile } from "./types.js";
import { SCHEMA_VERSION, validate } from "./validate.js";

/**
 * A decoration style: procedural Selections only, and a `{tileId: null}` palette
 * entry so emptiness is generated.
 *
 * **Its `layout` is deliberately hostile** — a bleed (`6 * 175 = 1050` against a
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
            // The convention: emptiness is generated, so each spot gets its own
            // silhouette from its own seed rather than from a painted mask.
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

const spot: Decoration = { rows: 3, columns: 2, cellSize: 60 };

/** The sizes swept wherever a property must hold at more than one. */
const SPOTS: Decoration[] = [
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

describe("decorationFile — the four overrides", () => {
  it("takes rows, columns and cellSize from the decoration", () => {
    const file = decorationFile(style(), spot);
    expect(file.config.rows).toBe(3);
    expect(file.config.columns).toBe(2);
    expect(file.layout.cellSize).toBe(60);
  });

  it("derives referenceWidth as columns * cellSize, so the bleed is zero", () => {
    for (const d of SPOTS) {
      const file = decorationFile(style(), d);
      expect(file.layout.referenceWidth).toBe(d.columns * d.cellSize);
    }
  });

  it("zeroes yOffset, whatever the style declared", () => {
    // The style's is 0.25, which would shave the top of a decoration whose top
    // edge the page can see.
    expect(style().layout.yOffset).toBe(0.25);
    expect(decorationFile(style(), spot).layout.yOffset).toBe(0);
  });

  it("carries horizontalAlignment through untouched", () => {
    // Authoring metadata read by neither engine nor renderer (`02` §7.3), and at
    // zero bleed there is no parity for it to describe.
    expect(decorationFile(style(), spot).layout.horizontalAlignment).toBe("gutter");
  });
});

describe("decorationFile — what is shared", () => {
  it("passes every other field through, by value", () => {
    const s = style();
    const file = decorationFile(s, spot);
    expect(file.schemaVersion).toBe(s.schemaVersion);
    expect(file.engineVersion).toBe(s.engineVersion);
    expect(file.config.defaultSeed).toBe(s.config.defaultSeed);
    expect(file.config.assetSalt).toBe(s.config.assetSalt);
    expect(file.config.reseedAssetsOnLoad).toBe(s.config.reseedAssetsOnLoad);
    expect(file.config.tiles).toEqual(s.config.tiles);
    expect(file.config.operations).toEqual(s.config.operations);
  });

  it("shares tiles and operations by reference rather than cloning them", () => {
    // The point of the module: twelve decorations hold one `tiles` array between
    // them, so there is nothing to drift. Asserted because a later `structuredClone`
    // added for tidiness would silently cost exactly the thing this exists for.
    const s = style();
    const a = decorationFile(s, { rows: 1, columns: 1, cellSize: 60 });
    const b = decorationFile(s, { rows: 2, columns: 4, cellSize: 40 });
    expect(a.config.tiles).toBe(s.config.tiles);
    expect(a.config.operations).toBe(s.config.operations);
    expect(b.config.tiles).toBe(a.config.tiles);
  });

  it("does not mutate the style", () => {
    const s = style();
    const before = structuredClone(s);
    decorationFile(s, spot);
    expect(s).toEqual(before);
  });
});

describe("decorationFile — the output is a valid file", () => {
  it("validates clean at every size", () => {
    // The real guard: `decorationFile` writes a `Layout`, and a `Layout` has
    // bounds. This catches a bad derivation without restating the arithmetic.
    for (const d of SPOTS) {
      expect(validate(decorationFile(style(), d))).toEqual([]);
    }
  });

  it("stays loadable by the plain consumer's door", () => {
    for (const d of SPOTS) {
      expect(() => generate(decorationFile(style(), d).config, "s")).not.toThrow();
    }
  });
});

describe("decorationFile — the exactnesses zero bleed buys", () => {
  it("puts originX at exactly 0 at the decoration's own width", () => {
    for (const d of SPOTS) {
      const file = decorationFile(style(), d);
      expect(originX(geoFor(file, d.columns * d.cellSize))).toBe(0);
    }
  });

  it("puts scaleFactor at exactly 1 at the decoration's own width", () => {
    for (const d of SPOTS) {
      const file = decorationFile(style(), d);
      expect(scaleFactor(geoFor(file, d.columns * d.cellSize))).toBe(1);
    }
  });

  it("leaves no presentation residual at integer DPR", () => {
    // `SUBPIXEL-GEOMETRY.md`'s whole subject is *absent* here rather than small:
    // `idealCell = 1 * cellSize * dpr` is already an integer, so `round` changes
    // nothing and the canvas is presented at exactly its own size. Strict
    // equality, in `uniform.test.ts`'s style.
    for (const d of SPOTS.filter((s) => Number.isInteger(s.cellSize))) {
      const file = decorationFile(style(), d);
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
    // With zero bleed and no yOffset the grid *is* the box, so the ratio the
    // component declares before measurement is the cell count itself.
    for (const d of SPOTS) {
      const file = decorationFile(style(), d);
      expect(naturalRatio(file.layout, file.config.rows)).toBe(d.columns / d.rows);
    }
  });
});

describe("decorationFile — variation and determinism", () => {
  const gridFor = (d: Decoration, seed: string) =>
    generate(decorationFile(style(), d).config, seed);

  it("is deterministic in (style, decoration, seed)", () => {
    expect(gridFor(spot, "board-tl")).toEqual(gridFor(spot, "board-tl"));
  });

  it("gives two spots of the same size different pictures under different seeds", () => {
    // Variation is the seed, which is already a `<Tileset>` prop — no salt is
    // rewritten anywhere in this module.
    const bigger = { rows: 8, columns: 8, cellSize: 60 };
    expect(gridFor(bigger, "board-tl")).not.toEqual(gridFor(bigger, "board-br"));
  });

  it("gives two spots of the same size and seed the same picture", () => {
    // The consequence of "instances are independent": each decoration starts at
    // cell (0, 0) in its own coordinate space, so identity of inputs is identity
    // of output. Stated as a test so it is a decision rather than a surprise.
    const a = { rows: 4, columns: 3, cellSize: 60 };
    const b = { rows: 4, columns: 3, cellSize: 12 };
    expect(gridFor(a, "same")).toEqual(gridFor(b, "same"));
  });

  it("leaves every existing cell untouched when a decoration grows", () => {
    // Positional hashing's dividend: randomness is addressed by `(x, y)` rather
    // than drawn from a stream, so enlarging a spot extends the picture instead
    // of reshuffling it. This is what makes one style serve every size.
    const small = gridFor({ rows: 3, columns: 3, cellSize: 60 }, "grow");
    const large = gridFor({ rows: 6, columns: 5, cellSize: 60 }, "grow");
    for (let y = 0; y < small.rows; y++) {
      for (let x = 0; x < small.columns; x++) {
        expect(tileStateAt(large, x, y)).toEqual(tileStateAt(small, x, y));
      }
    }
  });

  it("generates emptiness, so a spot has a silhouette of its own", () => {
    // Not a property of the transform but of the convention it documents: with a
    // `{tileId: null}` palette entry some cells clear. A style without one is a
    // solid block, which is why this is a convention rather than a check.
    const grid = gridFor({ rows: 6, columns: 6, cellSize: 60 }, "silhouette");
    const empty = grid.cells.filter((c) => c.tileId === null).length;
    expect(empty).toBeGreaterThan(0);
    expect(empty).toBeLessThan(grid.cells.length);
  });
});

describe("decorationStyleErrors", () => {
  it("passes a style built from procedural Selections", () => {
    expect(decorationStyleErrors(style())).toEqual([]);
  });

  it("flags rect and cellList, naming the Operation", () => {
    for (const op of [
      coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 }),
      coordinateBound("cellList", { cells: [[0, 0], [1, 2]] }),
    ]) {
      const errors = decorationStyleErrors(style([op]));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(op.id);
      expect(errors[0]).toContain(op.selection.type as string);
    }
  });

  it("reports one message per offending Operation, in stack order", () => {
    const errors = decorationStyleErrors(
      style([
        coordinateBound("rect", { x: 0, y: 0, width: 4, height: 2 }),
        { ...coordinateBound("cellList", { cells: [[0, 0]] }), id: "second" },
      ]),
    );
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("op-rect");
    expect(errors[1]).toContain("second");
  });

  it("agrees with the registry rather than with a list of names", () => {
    // The registry is open, so a hard-coded name list here would silently
    // misclassify anything registered later — and in the safe-looking direction.
    // `selections.ts` gives that reason on the declaration itself.
    const flagged = style([
      coordinateBound("rect", { x: 0, y: 0, width: 1, height: 1 }),
      { ...coordinateBound("all", {}), id: "procedural" },
    ]);
    expect(decorationStyleErrors(flagged)).toHaveLength(1);
  });

  it("leaves an unknown Selection type to validate()", () => {
    // `06` §10.3 raises UNKNOWN_TYPE_NAME and that is the whole of X7's
    // enforcement; a second voice here would give one defect two reports, and
    // `selections.get` would throw where this function must return findings.
    const unknown = style([coordinateBound("noSuchSelection", {})]);
    expect(() => decorationStyleErrors(unknown)).not.toThrow();
    expect(decorationStyleErrors(unknown)).toEqual([]);
    expect(validate(unknown).map((e) => e.code)).toContain("UNKNOWN_TYPE_NAME");
  });
});
