import { describe, expect, it } from "vitest";
import { TILES_EXPLAINER } from "./tiles-explainer.js";

describe("TILES_EXPLAINER", () => {
  it("explains adding tiles, groups and weights, in that order", () => {
    expect(TILES_EXPLAINER.params.map((p) => p.name)).toEqual(["Adding tiles", "Tile groups", "Weights"]);
  });

  it("has no measured figures, so the popover draws no bars", () => {
    expect(TILES_EXPLAINER.shares).toEqual([]);
  });

  it("says Reroll assets swaps assets only within a group", () => {
    expect(TILES_EXPLAINER.advice).toMatch(/^Reroll assets/);
    expect(TILES_EXPLAINER.advice).toMatch(/never changes which group a cell has/);
  });

  it("names the formats the editor reads back from a zip (import.ts mimeOf)", () => {
    const adding = TILES_EXPLAINER.params[0]!.text;
    for (const format of ["PNG", "JPEG", "WebP", "AVIF", "GIF", "SVG"]) expect(adding).toContain(format);
  });

  it("says asset, never picture (D-01)", () => {
    const all = [
      TILES_EXPLAINER.title,
      TILES_EXPLAINER.intro,
      ...TILES_EXPLAINER.params.map((p) => p.text),
      TILES_EXPLAINER.advice,
    ].join(" ");
    expect(all).not.toMatch(/picture/i);
  });
});
