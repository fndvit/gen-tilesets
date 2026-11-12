/** Selection layers as the editor reads them — B-033. */

import { describe, expect, it } from "vitest";
import { cellsOf, selectionTypes } from "./layers.js";

describe("layers", () => {
  it("reads a painted list, and nothing from a layer without one", () => {
    expect(cellsOf({ type: "cellList", cells: [[1, 1]] })).toEqual([[1, 1]]);
    expect(cellsOf({ type: "rect", x: 0, y: 0, width: 2, height: 2 })).toBeUndefined();
    expect(cellsOf({ type: "cellList", cells: "no" })).toBeUndefined();
  });

  it("names a selection by its layer types, in order", () => {
    expect(selectionTypes([{ type: "rect" }])).toBe("rect");
    expect(selectionTypes([{ type: "rect" }, { type: "random", density: 0.2 }])).toBe("rect + random");
  });
});
