/**
 * Breakpoints — `./breakpoints.ts`. The cost table in its header is the claim;
 * these assert it rather than believe it.
 */

import { describe, expect, it } from "vitest";
import { activeRules, ruleOverride } from "../responsive.js";
import { reshape } from "../shape.js";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import { FlipFlop, GridCache, inertCellSizeRules, reservationCss } from "./breakpoints.js";
import { naturalRatio } from "./geometry.js";
import type { HostRule } from "./options.js";

const hero = (): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 8,
    columns: 25,
    defaultSeed: "s",
    tiles: [{ id: "t", name: "t", assets: [{ id: "a", weight: 1 }] }],
    operations: [
      {
        id: "fill",
        selection: { type: "all" },
        source: { type: "random" },
        target: "tileId",
        mapping: { palette: [{ tileId: "t", weight: 1 }, { tileId: null, weight: 1 }] },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 60, referenceWidth: 1440, yOffset: 0, horizontalAlignment: "column" },
});

const RULES: HostRule[] = [
  { maxWidth: 900, columns: 15 },
  { maxWidth: 500, columns: 9, rows: 14 },
];

const FLUID = { sizing: "fluid", alignX: "center", alignY: "top" } as const;

describe("GridCache", () => {
  const at = (cache: GridCache, file: TilesetFile, width: number, seed = "s") => {
    const f = reshape(file, ruleOverride(activeRules(RULES, width)));
    return cache.get(file.config, f.config, seed, 0);
  };

  it("generates once per shape, however often a breakpoint is crossed", () => {
    const cache = new GridCache();
    const file = hero();
    for (const w of [1200, 700, 400, 700, 1200, 400, 1000, 300]) at(cache, file, w);
    expect(cache.generations).toBe(3);
  });

  it("hands back the identical grid for a shape it has seen", () => {
    const cache = new GridCache();
    const file = hero();
    expect(at(cache, file, 400)).toBe(at(cache, file, 450));
  });

  it("does not regenerate for a density-only change", () => {
    // `reshape` keeps `config` by reference when rows and columns are unchanged,
    // so the key and the grid are the same.
    const cache = new GridCache();
    const file = hero();
    const a = cache.get(file.config, file.config, "s", 0);
    const b = cache.get(file.config, reshape(file, { cellSize: 30, bleed: 0 }).config, "s", 0);
    expect(b).toBe(a);
    expect(cache.generations).toBe(1);
  });

  it("starts over when the base config, seed or loadSalt changes", () => {
    const cache = new GridCache();
    const file = hero();
    at(cache, file, 400);
    at(cache, file, 400, "other");
    expect(cache.generations).toBe(2);
    cache.get(file.config, file.config, "other", 7);
    expect(cache.generations).toBe(3);
    const edited = hero();
    cache.get(edited.config, edited.config, "other", 7);
    expect(cache.generations).toBe(4);
  });
});

describe("reservationCss", () => {
  const css = reservationCss("t1", hero(), RULES, FLUID);
  const ratio = (f: TilesetFile) => naturalRatio(f.layout, f.config.rows);

  it("reserves the base unconditionally, first", () => {
    expect(css.startsWith(`[data-tileset-wrapper="t1"]>[data-tileset-box]:not([data-measured]){aspect-ratio:${ratio(hero())}}`)).toBe(true);
  });

  it("gives each band the ratio the cascade resolves there", () => {
    const phone = reshape(hero(), { columns: 9, rows: 14 });
    const tablet = reshape(hero(), { columns: 15 });
    expect(css).toContain(`@container (width < 500px){`);
    expect(css).toContain(`aspect-ratio:${ratio(phone)}`);
    expect(css).toContain(`@container (500px < width < 900px){`);
    expect(css).toContain(`aspect-ratio:${ratio(tablet)}`);
    // Inclusive bounds are bands of their own.
    expect(css).toContain(`@container (width: 500px){`);
    expect(css).toContain(`@container (width > 900px){`);
  });

  it("reserves a height, not a ratio, where a rule makes the tileset fixed", () => {
    const fixed = reservationCss("t2", hero(), [{ maxWidth: 600, sizing: "fixed", cellSize: 44, bleed: 0 }], FLUID);
    expect(fixed).toContain(`height:${8 * 44}px`);
  });

  it("retires itself at the first measurement", () => {
    for (const rule of css.split("}")) {
      if (rule.includes("[data-tileset-box]")) expect(rule).toContain(":not([data-measured])");
    }
  });
});

describe("FlipFlop", () => {
  it("fires once for an oscillation between two keys", () => {
    const f = new FlipFlop();
    const seen = ["0", "", "0", "", "0", ""].map((k, i) => f.record(k, i * 16));
    expect(seen.filter(Boolean)).toHaveLength(1);
  });

  it("stays quiet for an ordinary drag across two breakpoints", () => {
    const f = new FlipFlop();
    const seen = ["", "0", "0,1", "0", ""].map((k, i) => f.record(k, i * 400));
    expect(seen.some(Boolean)).toBe(false);
  });

  it("ignores a repeated key", () => {
    const f = new FlipFlop();
    expect([0, 1, 2, 3, 4, 5].map((i) => f.record("0", i)).some(Boolean)).toBe(false);
  });
});

describe("inertCellSizeRules", () => {
  it("flags a fluid rule that only changes cellSize", () => {
    expect(inertCellSizeRules([{ maxWidth: 500, cellSize: 24 }], FLUID)).toEqual([0]);
  });

  it("does not flag it where a rule makes the tileset fixed", () => {
    const rules: HostRule[] = [
      { maxWidth: 500, cellSize: 24 },
      { maxWidth: 600, sizing: "fixed" },
    ];
    expect(inertCellSizeRules(rules, FLUID)).toEqual([]);
    expect(inertCellSizeRules([{ maxWidth: 500, cellSize: 24 }], { ...FLUID, sizing: "fixed" })).toEqual([]);
  });

  it("does not flag a rule that changes columns too", () => {
    expect(inertCellSizeRules([{ maxWidth: 500, cellSize: 24, columns: 9 }], FLUID)).toEqual([]);
  });
});
