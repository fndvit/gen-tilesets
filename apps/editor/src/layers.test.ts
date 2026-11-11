/** Selection layers as the editor reads them — B-033. */

import { selections } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { cellsOf, holdsLayers, layersOf, layersParam, withLayer } from "./layers.js";

const rect = { type: "rect", x: 0, y: 0, width: 2, height: 2 };
const painted = { type: "cellList", cells: [[1, 1]] };

describe("layers", () => {
  it("finds the layer-holding Selections by their declared selectionList, not by name", () => {
    expect(selections.all().filter(holdsLayers).map((r) => r.name)).toEqual(["union"]);
    expect(layersParam(selections.get("union"))).toBe("layers");
    expect(layersParam(selections.get("cellList"))).toBeNull();
  });

  it("reads a plain Selection as its own only layer, and a union as its layers", () => {
    expect(layersOf(rect)).toEqual([rect]);
    expect(layersOf(rect)[0]).toBe(rect);
    const union = { type: "union", layers: [rect, painted] };
    expect(layersOf(union)).toBe(union.layers);
  });

  it("reads malformed input as one layer, for validate() to report", () => {
    const odd = { type: "union", layers: "rect" };
    expect(layersOf(odd)).toEqual([odd]);
    expect(layersOf({ type: "lasso" })).toEqual([{ type: "lasso" }]);
  });

  it("replaces one layer without mutating, and a plain Selection whole", () => {
    const union = { type: "union", layers: [rect, painted] };
    const next = withLayer(union, 1, { type: "all" });
    expect(next).toEqual({ type: "union", layers: [rect, { type: "all" }] });
    expect(union.layers[1]).toBe(painted);
    expect(withLayer(rect, 0, painted)).toBe(painted);
  });

  it("reads a painted list, and nothing from a Selection without one", () => {
    expect(cellsOf(painted)).toEqual([[1, 1]]);
    expect(cellsOf(rect)).toBeUndefined();
  });
});
