import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, newDocument, setCellSize, setRows, setYOffset, type Transition } from "../../document.js";
import { gridDetails } from "./grid-details.js";

const run = (...transitions: Transition[]) => transitions.reduce((file, t) => t(file), newDocument());
const lookup = (rows: ReturnType<typeof gridDetails>) => new Map(rows);

describe("gridDetails", () => {
  it("lists every value the Derived section showed, in its order", () => {
    expect(gridDetails(newDocument()).map(([term]) => term)).toEqual([
      "Columns",
      "Grid width",
      "Grid height",
      "Visible height",
      "Bleed",
      "Tiles",
      "Operations",
      "Engine",
      "Schema",
    ]);
  });

  it("follows the file's shape", () => {
    const file = run(setCellSize("40"), setRows("7"));
    const rows = lookup(gridDetails(file));
    const { columns } = file.config;
    expect(rows.get("Columns")).toBe(String(columns));
    expect(rows.get("Grid width")).toBe(`${columns * 40} px`);
    expect(rows.get("Grid height")).toBe(`${7 * 40} px`);
    const bleed = columns * 40 - file.layout.referenceWidth;
    expect(rows.get("Bleed")).toBe(bleed > 0 ? `${bleed} px (${bleed / 2} each side)` : `${bleed} px`);
  });

  it("shows what y offset clips, and only when it clips something", () => {
    const flush = lookup(gridDetails(run(setCellSize("40"), setRows("5"), setYOffset("0"))));
    expect(flush.get("Visible height")).toBe("200 px");

    const clipped = lookup(gridDetails(run(setCellSize("40"), setRows("5"), setYOffset("0.25"))));
    expect(clipped.get("Visible height")).toBe("190 px (10 clipped)");
  });

  it("counts and stamps from the file and the engine", () => {
    const file = newDocument();
    const rows = lookup(gridDetails(file));
    expect(rows.get("Tiles")).toBe(String(file.config.tiles.length));
    expect(rows.get("Operations")).toBe(String(file.config.operations.length));
    expect(rows.get("Engine")).toBe(ENGINE_VERSION);
    expect(rows.get("Schema")).toBe(String(file.schemaVersion));
  });
});
