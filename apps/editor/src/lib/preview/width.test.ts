import type { ResponsiveRule } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { activeBound, boundsOf, holdingLabel, MIN_WIDTH, roomFor, widthFor, zoomFor } from "./width.js";

describe("roomFor", () => {
  it("floors the column and leaves a gutter for each handle", () => {
    expect(roomFor(1000.7)).toBe(1000 - 32);
  });

  it("never goes under the minimum width", () => {
    expect(roomFor(0)).toBe(MIN_WIDTH);
  });
});

describe("widthFor", () => {
  it("fills the room when nothing is requested", () => {
    expect(widthFor(null, 900)).toBe(900);
  });

  it("keeps a request wider than the room, for the zoom to fit", () => {
    expect(widthFor(1440, 900)).toBe(1440);
  });

  it("raises a request under the minimum", () => {
    expect(widthFor(20, 900)).toBe(MIN_WIDTH);
  });
});

describe("zoomFor", () => {
  it("shrinks a width wider than the room", () => {
    expect(zoomFor(1800, 900, 932)).toBe(0.5);
  });

  it("never magnifies", () => {
    expect(zoomFor(360, 900, 932)).toBe(1);
  });

  it("is 1 before the column is measured", () => {
    expect(zoomFor(1440, MIN_WIDTH, 0)).toBe(1);
  });
});

const rules: ResponsiveRule[] = [{ maxWidth: 768 }, { minWidth: 769, maxWidth: 1024 }, { minWidth: 1440 }, { maxWidth: 1024 }];

describe("boundsOf", () => {
  it("lists each distinct bound once, ascending", () => {
    expect(boundsOf(rules)).toEqual([768, 769, 1024, 1440]);
  });

  it("is empty with no rules", () => {
    expect(boundsOf([])).toEqual([]);
  });
});

describe("activeBound", () => {
  const bounds = [768, 1024, 1440];

  it("is the smallest bound at or above the width (Figma: 860 → 1024)", () => {
    expect(activeBound(bounds, 860)).toBe(1024);
    expect(activeBound(bounds, 360)).toBe(768);
  });

  it("is the bound itself when the width lands on it", () => {
    expect(activeBound(bounds, 1024)).toBe(1024);
  });

  it("is none above the largest bound", () => {
    expect(activeBound(bounds, 1441)).toBeNull();
    expect(activeBound([], 800)).toBeNull();
  });
});

describe("holdingLabel", () => {
  it("names the rules that hold, by number", () => {
    expect(holdingLabel(rules, 900)).toBe("rule 2 + 4");
  });

  it("says base when none holds", () => {
    expect(holdingLabel(rules, 1200)).toBe("base");
  });
});
