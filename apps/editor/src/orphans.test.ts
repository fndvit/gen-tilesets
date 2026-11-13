/**
 * The destructive edit — `09-editor.md` §9.3, §9.4; **E12**, **E6**.
 *
 * Two questions, asked before and after: *which Operations does this put at
 * risk*, and *which of them ended up orphaned*. Neither is answered by an
 * implementation of any Selection's test (**E8**) or by a list of Selection
 * names (`04` §4.4's table is the registry's, not the editor's).
 */

import { selections, type Operation, type Selection, type TilesetConfig } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import { atRisk, cameWithFile, needsConfirmation, orphans, outsideCells } from "./orphans.js";

/** One layer, or several (B-033). */
const op = (id: string, selection: Selection | Selection[]): Operation => ({
  id,
  salt: 0,
  reseedOnLoad: false,
  selection: Array.isArray(selection) ? selection : [selection],
  source: { type: "constant" },
  target: "opacity",
  mapping: { range: [1, 1] },
  blend: "set",
});

const config = (operations: Operation[], over: Partial<TilesetConfig> = {}): TilesetConfig => ({
  ...newDocument().config,
  operations,
  ...over,
});

const SEED = "fixed-seed-1";

describe("which Selections are coordinate-bound — 04 §4.4", () => {
  it("matches the spec's table exactly", () => {
    const bound = selections
      .all()
      .filter((s) => s.coordinateBound)
      .map((s) => s.name)
      .sort();
    expect(bound).toEqual(["cellList", "rect"]);
  });

  it("declares it for every registered Selection, so none is silently procedural", () => {
    // The property the declaration buys: a Selection registered later cannot be
    // classified by omission. `05` X5's reasoning, applied to Selections.
    for (const registration of selections.all()) {
      expect(typeof registration.coordinateBound).toBe("boolean");
    }
  });
});

describe("E12 — confirmation only where something is at risk", () => {
  it("asks for nothing when every Selection is procedural — 09 §9.3", () => {
    // "A dialogue that appears every time teaches the author to dismiss it
    // before reading, which is worse than no dialogue."
    const c = config([
      op("a", { type: "all" }),
      op("b", { type: "checkerboard", parity: 0 }),
      op("c", { type: "rowColumn", axis: "column", n: 3, offset: 0 }),
      op("d", { type: "random", density: 0.5 }),
    ]);
    expect(atRisk(c)).toEqual([]);
    expect(needsConfirmation(c)).toBe(false);
  });

  it("names the Operations that will be affected, and only those", () => {
    const c = config([
      op("keep", { type: "all" }),
      op("box", { type: "rect", x: 0, y: 0, width: 4, height: 2 }),
      op("painted", { type: "cellList", cells: [[1, 1]] }),
    ]);
    expect(atRisk(c).map((o) => o.id)).toEqual(["box", "painted"]);
    expect(needsConfirmation(c)).toBe(true);
  });

  it("asks for nothing on an empty document", () => {
    expect(needsConfirmation(newDocument().config)).toBe(false);
  });
});

describe("§9.4 — orphans are reported, never migrated", () => {
  it("says nothing while every coordinate-bound Selection still fits", () => {
    const c = config([
      op("box", { type: "rect", x: 0, y: 0, width: 4, height: 2 }),
      op("painted", { type: "cellList", cells: [[0, 0], [9, 4]] }),
    ]);
    expect(orphans(c, SEED)).toEqual([]);
  });

  it("reports a rect that now lies wholly outside the grid — 06 §10.4's third", () => {
    // 10 columns, 5 rows in a new document.
    const c = config([op("box", { type: "rect", x: 40, y: 0, width: 4, height: 2 })]);
    const [orphan] = orphans(c, SEED);
    expect(orphan!.operationId).toBe("box");
    expect(orphan!.empty).toBe(true);
    expect(orphan!.reachable).toBe(0);
    // A rect has no countable authored extent: `04` §4.2 lets it extend past the
    // grid on purpose, so "how much is outside" is not a defect to report.
    expect(orphan!.authored).toBeUndefined();
  });

  it("does not report a rect that merely overhangs the edge — 04 §4.2", () => {
    // "An author dragging a rectangle to the grid edge should not have it
    // silently resized", and it is not a defect either.
    const c = config([op("box", { type: "rect", x: 8, y: 0, width: 6, height: 2 })]);
    expect(orphans(c, SEED)).toEqual([]);
  });

  it("counts how many painted cells became unreachable — 09 §9.4", () => {
    // `04` §4.4's distinction survives in the wording: a `rect` can plausibly be
    // re-dragged, a hand-painted `cellList` cannot, so this one is told a number.
    const c = config([
      op("painted", { type: "cellList", cells: [[0, 0], [1, 1], [40, 0], [0, 40]] }),
    ]);
    const [orphan] = orphans(c, SEED);
    expect(orphan!.authored).toBe(4);
    expect(orphan!.reachable).toBe(2);
    expect(orphan!.empty).toBe(false);
  });

  it("reports a cellList whose every entry is now outside", () => {
    const c = config([op("painted", { type: "cellList", cells: [[40, 40]] })]);
    const [orphan] = orphans(c, SEED);
    expect(orphan!.empty).toBe(true);
    expect(orphan!.authored).toBe(1);
    expect(orphan!.reachable).toBe(0);
  });

  it("never modifies the config — E16", () => {
    const c = config([op("painted", { type: "cellList", cells: [[40, 0]] })]);
    const before = JSON.stringify(c);
    orphans(c, SEED);
    expect(JSON.stringify(c)).toBe(before);
  });

  it("ignores procedural Selections however few cells they match", () => {
    // A `random` Selection at density 0 matches nothing and is not orphaned —
    // it is a rule, and it survives a resize by definition (`04` §4.4).
    const c = config([op("none", { type: "random", density: 0 })]);
    expect(orphans(c, SEED)).toEqual([]);
  });
});

describe("selection layers (B-033)", () => {
  const layers = (...list: Selection[]): Selection[] => list;

  it("puts an Operation at risk exactly when one of its layers is coordinate-bound", () => {
    const c = config([
      op("mixed", layers({ type: "checkerboard", parity: 0 }, { type: "rect", x: 0, y: 0, width: 2, height: 2 })),
      op("rules", layers({ type: "checkerboard", parity: 0 }, { type: "random", density: 0.5 })),
    ]);
    expect(atRisk(c).map((o) => o.id)).toEqual(["mixed"]);
  });

  it("counts a Handpick layer's lost cells even when another layer still reaches cells", () => {
    // 10 x 5. The rect layer reaches 4 cells nobody painted, so `authored -
    // reachable` would say nothing was lost; `outside` says two were.
    const c = config([
      op(
        "mixed",
        layers(
          { type: "rect", x: 0, y: 0, width: 2, height: 2 },
          { type: "cellList", cells: [[5, 1], [40, 0], [0, 40]] },
        ),
      ),
    ]);
    const [orphan] = orphans(c, SEED);
    expect(orphan!.authored).toBe(3);
    expect(orphan!.outside).toBe(2);
    expect(orphan!.empty).toBe(false);
  });

  it("says nothing when every layer's painted cells fit", () => {
    const c = config([
      op("mixed", layers({ type: "rect", x: 0, y: 0, width: 2, height: 2 }, { type: "cellList", cells: [[5, 1]] })),
    ]);
    expect(orphans(c, SEED)).toEqual([]);
  });

  it("lists the outside cells of every Handpick layer, in layer order", () => {
    const c = config([], { columns: 4, rows: 3 });
    const o = op(
      "op1",
      layers({ type: "cellList", cells: [[0, 0], [9, 0]] }, { type: "all" }, { type: "cellList", cells: [[0, 9]] }),
    );
    expect(outsideCells(o, c)).toEqual([[9, 0], [0, 9]]);
  });
});

// ---------------------------------------------------------------------------
// Batch 01, T-05 (B-014): painted cells outside the grid
// ---------------------------------------------------------------------------

const painted = (id: string, cells: [number, number][]): Operation => op(id, { type: "cellList", cells });
const fileOf = (c: TilesetConfig) => ({ ...newDocument(), config: c });

describe("outsideCells", () => {
  it("lists the painted cells past either edge of the grid, and nothing else", () => {
    const c = config([], { columns: 4, rows: 3 });
    const list = painted("op1", [[0, 0], [3, 2], [4, 0], [0, 3], [-1, 1]]);
    expect(outsideCells(list, c)).toEqual([[4, 0], [0, 3], [-1, 1]]);
  });

  it("is empty for a Selection with no countable list", () => {
    const c = config([], { columns: 4, rows: 3 });
    expect(outsideCells(op("op1", { type: "rect", x: 10, y: 10, width: 2, height: 2 }), c)).toEqual([]);
  });
});

describe("cameWithFile — whether the notice may offer Undo", () => {
  const opened = fileOf(config([painted("op1", [[0, 0], [9, 0]])], { columns: 4, rows: 3 }));

  it("is false in a session that opened nothing", () => {
    const c = opened.config;
    expect(cameWithFile(c.operations[0]!, c, null)).toBe(false);
  });

  it("is true for cells that were already outside the grid of the opened file", () => {
    const c = opened.config;
    expect(cameWithFile(c.operations[0]!, c, opened)).toBe(true);
  });

  it("stays true after edits that leave those cells as they were", () => {
    const c = config([painted("op1", [[0, 0], [1, 1], [9, 0]])], { columns: 4, rows: 3 });
    expect(cameWithFile(c.operations[0]!, c, opened)).toBe(true);
  });

  it("is false once a resize here pushes a cell out", () => {
    // [3, 0] was inside 4 columns; at 3 columns it is outside, and Undo would bring it back.
    const before = fileOf(config([painted("op1", [[3, 0], [9, 0]])], { columns: 4, rows: 3 }));
    const after = config(before.config.operations, { columns: 3, rows: 3 });
    expect(cameWithFile(after.operations[0]!, after, before)).toBe(false);
  });

  it("does not match another document's operation that only shares its id", () => {
    const other = config([painted("op1", [[5, 5]])], { columns: 4, rows: 3 });
    expect(cameWithFile(other.operations[0]!, other, opened)).toBe(false);
  });

  it("for a rect: true while it and the grid are as opened, false after either changes", () => {
    const rect = op("op1", { type: "rect", x: 10, y: 0, width: 2, height: 2 });
    const asOpened = fileOf(config([rect], { columns: 4, rows: 3 }));
    expect(cameWithFile(rect, asOpened.config, asOpened)).toBe(true);
    const resized = config([rect], { columns: 6, rows: 3 });
    expect(cameWithFile(rect, resized, asOpened)).toBe(false);
    const moved = op("op1", { type: "rect", x: 11, y: 0, width: 2, height: 2 });
    expect(cameWithFile(moved, config([moved], { columns: 4, rows: 3 }), asOpened)).toBe(false);
  });
});
