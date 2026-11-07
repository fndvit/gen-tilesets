import type { ResponsiveRule, TilesetFile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import { fileName, pixelSize, rememberedSize, sizeRows } from "./image-export.js";

describe("sizeRows", () => {
  it("is Design width alone with no breakpoints", () => {
    expect(sizeRows([], 1000)).toEqual([{ key: "design", width: 1000, label: "Design width", detail: "1000 px" }]);
  });

  it("names both bounds of a min+max rule with the same rule number", () => {
    const rows = sizeRows([{ minWidth: 600 }, { minWidth: 768, maxWidth: 1024 }], 1000);
    expect(rows.map((r) => [r.key, r.label, r.detail])).toEqual([
      ["design", "Design width", "1000 px"],
      ["bound:600", "Breakpoint 1", "600 px"],
      ["bound:768", "Breakpoint 2", "768 px"],
      ["bound:1024", "Breakpoint 2", "1024 px"],
    ]);
  });

  it("lists every rule that names a shared bound", () => {
    const rules: ResponsiveRule[] = [{ maxWidth: 500 }, { maxWidth: 1024 }, { minWidth: 1024 }];
    expect(sizeRows(rules, 800).find((r) => r.width === 1024)?.label).toBe("Breakpoint 2 + 3");
  });

  it("keeps a bound equal to the design width as its own row, told apart by key", () => {
    const rows = sizeRows([{ maxWidth: 1000 }], 1000);
    expect(rows.map((r) => [r.key, r.width])).toEqual([
      ["design", 1000],
      ["bound:1000", 1000],
    ]);
  });

  it("orders the bounds ascending, whatever the rule order", () => {
    const rows = sizeRows([{ minWidth: 1440 }, { maxWidth: 360 }, { minWidth: 768 }], 1000);
    expect(rows.slice(1).map((r) => [r.width, r.label])).toEqual([
      [360, "Breakpoint 2"],
      [768, "Breakpoint 3"],
      [1440, "Breakpoint 1"],
    ]);
  });
});

describe("rememberedSize", () => {
  const rows = sizeRows([{ maxWidth: 768 }], 1000);

  it("keeps the size used last while it exists", () => {
    expect(rememberedSize(rows, "bound:768")).toBe("bound:768");
  });

  it("falls back to Design width when that bound is gone, or nothing was used yet", () => {
    expect(rememberedSize(rows, "bound:1024")).toBe("design");
    expect(rememberedSize(rows, null)).toBe("design");
  });
});

describe("fileName", () => {
  it("names the width and density", () => {
    expect(fileName(1000, 2)).toBe("tileset-1000px@2x.png");
  });

  it("writes a fractional design width as it is", () => {
    expect(fileName(1000.5, 1)).toBe("tileset-1000.5px@1x.png");
  });
});

describe("pixelSize", () => {
  it("is the package's image size: a 600px design of 4 rows of 60 at 2×", () => {
    const base = newDocument();
    const file: TilesetFile = {
      ...base,
      config: { ...base.config, rows: 4, columns: 10 },
      layout: { ...base.layout, cellSize: 60, referenceWidth: 600, yOffset: 0 },
    };
    expect(pixelSize(file, 600, 2)).toEqual({ width: 1200, height: 480 });
  });
});
