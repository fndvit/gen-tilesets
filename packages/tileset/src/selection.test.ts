import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import { selection } from "./selection.js";
import { tileStateAt, type Operation, type Selection, type TilesetConfig } from "./types.js";

const ROWS = 6;
const COLUMNS = 8;

/**
 * One Operation whose *effect* reveals its *Selection*, exactly.
 *
 * The grid starts at `tileId: null` (`02` §8.1) and this paints a one-entry
 * palette, so after one Operation a cell is non-null if and only if the
 * Selection included it. That makes `generate()` the oracle for `selection()`
 * without either of them being asked about the other.
 *
 * The Source is `constant`, so the Source channel is not consulted at all and
 * anything the two disagree about is the Selection's doing.
 */
const paint = (id: string, sel: Selection, over: Partial<Operation> = {}): Operation => ({
  id,
  selection: sel,
  source: { type: "constant" },
  target: "tileId",
  mapping: { palette: [{ tileId: "leaf", weight: 1 }] },
  blend: "set",
  ...over,
});

const configWith = (op: Operation): TilesetConfig => ({
  rows: ROWS,
  columns: COLUMNS,
  defaultSeed: "sunset-3",
  tiles: [{ id: "leaf", name: "leaf", assets: [{ id: "a1", weight: 1 }] }],
  operations: [op],
});

/** The cells `generate()` actually painted — the oracle. */
const paintedCells = (config: TilesetConfig, seed: string, loadSalt = 0): boolean[] => {
  const grid = generate(config, seed, loadSalt);
  const out: boolean[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) out.push(tileStateAt(grid, x, y)?.tileId !== null);
  }
  return out;
};

/** The cells `selection()` claims, over the same grid and in the same order. */
const claimedCells = (config: TilesetConfig, seed: string, loadSalt = 0): boolean[] => {
  const test = selection(config, config.operations[0]!.id, seed, loadSalt);
  const out: boolean[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) out.push(test(x, y));
  }
  return out;
};

describe("selection — 09 §6.2, E8", () => {
  /**
   * **E8's whole point.** Every V1 Selection preset, agreeing cell for cell with
   * what the engine did. A drift here is the failure `07` **R1** describes one
   * layer up: the picture right, the overlay wrong, nothing reporting it.
   */
  const presets: [name: string, sel: Selection][] = [
    ["all", { type: "all" }],
    ["rect", { type: "rect", x: 2, y: 1, width: 3, height: 4 }],
    ["checkerboard parity 0", { type: "checkerboard", parity: 0 }],
    ["checkerboard parity 1", { type: "checkerboard", parity: 1 }],
    ["everyNth column", { type: "everyNth", axis: "column", n: 3, offset: 0 }],
    ["everyNth row, offset", { type: "everyNth", axis: "row", n: 2, offset: 1 }],
    ["random", { type: "random", density: 0.3 }],
    [
      "cellList",
      { type: "cellList", cells: [[0, 0], [7, 5], [3, 2], [3, 2]] },
    ],
  ];

  for (const [name, sel] of presets) {
    it(`agrees with generate() cell for cell — ${name}`, () => {
      const config = configWith(paint("op1", sel));
      expect(claimedCells(config, "sunset-3")).toEqual(paintedCells(config, "sunset-3"));
    });
  }

  it("is not vacuous — the presets above do not all select everything", () => {
    // Guards the suite itself: an implementation returning `true` everywhere
    // would pass every `all` comparison above and most of the reasoning too.
    const rect = configWith(paint("op1", { type: "rect", x: 2, y: 1, width: 3, height: 4 }));
    const claimed = claimedCells(rect, "sunset-3");
    expect(claimed.filter(Boolean)).toHaveLength(12); // 3 x 4, wholly inside the grid
    expect(claimed.some((c) => !c)).toBe(true);
  });

  /**
   * `04` §4.3, **O3** — the `random` Selection draws from `operationId + ":selection"`,
   * never the Operation's Source channel. If `selection()` reached for the wrong
   * channel it would still return a plausible ~30% of cells, and only this
   * comparison would notice.
   */
  it("draws a random Selection from the selection channel — 04 §4.3, O3", () => {
    const config = configWith(paint("op1", { type: "random", density: 0.3 }));
    const claimed = claimedCells(config, "sunset-3");
    expect(claimed).toEqual(paintedCells(config, "sunset-3"));
    // Not everything, and not nothing -- the comparison above is worth making.
    const count = claimed.filter(Boolean).length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(ROWS * COLUMNS);
  });

  it("moves with the Operation's salt, as one reroll moves both channels — 02 §6.4", () => {
    const at = (salt: number) =>
      claimedCells(configWith(paint("op1", { type: "random", density: 0.3 }, { salt })), "sunset-3");
    expect(at(0)).not.toEqual(at(1));
  });

  it("moves with the seed", () => {
    const config = configWith(paint("op1", { type: "random", density: 0.3 }));
    expect(claimedCells(config, "sunset-3")).not.toEqual(claimedCells(config, "draft-b"));
  });
});

describe("selection — the effective seed, 02 §6.7", () => {
  const flagged = (reseedOnLoad: boolean) =>
    configWith(paint("op1", { type: "random", density: 0.3 }, { reseedOnLoad }));

  it("follows a flagged Operation across two loadSalt values, agreeing with generate()", () => {
    const config = flagged(true);
    for (const loadSalt of [0, 82931, 15044]) {
      expect(claimedCells(config, "sunset-3", loadSalt)).toEqual(
        paintedCells(config, "sunset-3", loadSalt),
      );
    }
    // And the flag actually does something, or the agreement above is trivial.
    expect(claimedCells(config, "sunset-3", 82931)).not.toEqual(
      claimedCells(config, "sunset-3", 15044),
    );
  });

  it("holds an unflagged Operation still across loadSalt values — 02 §6.7", () => {
    // "An Operation with reseedOnLoad: false hashes against seedU32 on every
    // load, forever, whatever loadSalt happens to be."
    const config = flagged(false);
    expect(claimedCells(config, "sunset-3", 82931)).toEqual(
      claimedCells(config, "sunset-3", 15044),
    );
  });

  it("treats loadSalt 0 as an ordinary value, not an identity — 02 §6.7, ADR-002", () => {
    // mixLoad(s, 0) != s deliberately, so a flagged Operation at loadSalt 0 is
    // pinned to one arbitrary arrangement rather than to the unflagged one.
    expect(claimedCells(flagged(true), "sunset-3", 0)).not.toEqual(
      claimedCells(flagged(false), "sunset-3", 0),
    );
  });

  it("defaults loadSalt to 0 — 02 §4", () => {
    const config = flagged(true);
    expect(claimedCells(config, "sunset-3")).toEqual(claimedCells(config, "sunset-3", 0));
  });
});

describe("selection — total and unbounded in (x, y), 09 §6.2", () => {
  /**
   * `04` §4.2 permits a `rect` to extend past the grid, and `09` §6.2 requires
   * the predicate to be total so an author dragging one "needs to see where it
   * reached". Bounding belongs to the draw site.
   */
  it("answers outside rows x columns rather than throwing or bounding", () => {
    const config = configWith(
      paint("op1", { type: "rect", x: 6, y: 4, width: 6, height: 6 }),
    );
    const test = selection(config, "op1", "sunset-3");

    expect(test(COLUMNS + 2, ROWS + 2)).toBe(true); // inside the rect, outside the grid
    expect(test(11, 9)).toBe(true); // the rect's far corner, x < 12 and y < 10
    expect(test(12, 10)).toBe(false); // half-open on both axes
    expect(test(-1, -1)).toBe(false);
  });

  it("answers at negative coordinates for `all`", () => {
    const config = configWith(paint("op1", { type: "all" }));
    expect(selection(config, "op1", "sunset-3")(-3, -9)).toBe(true);
  });
});

describe("selection — purity and lookup", () => {
  it("returns the same answers for a repeated call — G1's shape", () => {
    const config = configWith(paint("op1", { type: "random", density: 0.5 }));
    expect(claimedCells(config, "sunset-3")).toEqual(claimedCells(config, "sunset-3"));
  });

  it("picks the named Operation out of a stack, not the first", () => {
    const config: TilesetConfig = {
      ...configWith(paint("op1", { type: "all" })),
      operations: [
        paint("op1", { type: "all" }),
        paint("op2", { type: "rect", x: 0, y: 0, width: 1, height: 1 }),
      ],
    };
    const second = selection(config, "op2", "sunset-3");
    expect(second(0, 0)).toBe(true);
    expect(second(1, 0)).toBe(false);
  });

  it("throws on an unresolvable operationId rather than answering false everywhere", () => {
    // An empty overlay is indistinguishable from a Selection that legitimately
    // matches nothing, on the screen where the author is judging exactly that.
    // 05 X7's reasoning applied to an id rather than a type name.
    const config = configWith(paint("op1", { type: "all" }));
    expect(() => selection(config, "nope", "sunset-3")).toThrow(/nope/);
  });

  it("throws on an unknown Selection type name — 05 X7", () => {
    const config = configWith(paint("op1", { type: "spiral" }));
    expect(() => selection(config, "op1", "sunset-3")).toThrow(/spiral/);
  });
});
