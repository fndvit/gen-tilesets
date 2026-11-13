import { selections, sources } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import {
  SELECTION_PARAM_HINTS,
  SOURCE_PARAM_HINTS,
  selectionParamHints,
  sourceParamHints,
} from "./param-hints.js";

describe("SOURCE_PARAM_HINTS", () => {
  it("names only registered Sources and their real params, so a rename fails here", () => {
    for (const [type, hints] of Object.entries(SOURCE_PARAM_HINTS)) {
      const params = sources.get(type).params;
      for (const name of Object.keys(hints)) expect(Object.keys(params)).toContain(name);
    }
  });

  it("explains both of Noise's params (Pol, N0)", () => {
    expect(Object.keys(sourceParamHints("valueNoise")).sort()).toEqual(["cellsPerFeature", "octaves"]);
  });

  it("gives nothing for a Source with no entry, or none chosen", () => {
    expect(sourceParamHints("gradient")).toEqual({});
    expect(sourceParamHints(null)).toEqual({});
  });
});

describe("SELECTION_PARAM_HINTS", () => {
  it("names only registered Selections and their real params, so a rename fails here", () => {
    for (const [type, hints] of Object.entries(SELECTION_PARAM_HINTS)) {
      const params = selections.get(type).params;
      for (const name of Object.keys(hints)) expect(Object.keys(params)).toContain(name);
    }
  });

  it("says on Every Nth's N that the picture depends on the column count (B-009)", () => {
    expect(Object.keys(selectionParamHints("everyNth"))).toEqual(["n"]);
    expect(selectionParamHints("everyNth").n).toMatch(/column count/);
  });

  it("gives nothing for Row/Column, or none chosen", () => {
    expect(selectionParamHints("rowColumn")).toEqual({});
    expect(selectionParamHints(null)).toEqual({});
  });
});
