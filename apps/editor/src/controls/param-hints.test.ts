import { sources } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { SOURCE_PARAM_HINTS, sourceParamHints } from "./param-hints.js";

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
