import { sources } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { PATTERN_ORDER, patternSvg } from "./pattern-art.js";

describe("patternSvg", () => {
  it("draws every registered Source that has art, as sixteen cells", () => {
    const registered = sources.all().map((r) => r.name);
    for (const name of PATTERN_ORDER) {
      expect(registered).toContain(name);
      expect(patternSvg(name)?.match(/<rect /g)).toHaveLength(16);
    }
  });

  it("uses tokens, never literal colours", () => {
    expect(patternSvg("gradient")).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("returns null for a Source with no art, which stays label-only (E9)", () => {
    expect(patternSvg("vignette")).toBeNull();
  });
});
