/**
 * `TilesetModel` — the renderer's derivations, tested without a DOM.
 *
 * These are the claims `Tileset.svelte` made in comments and could not test:
 * what regenerates the grid and what does not (**R12**), that the per-field
 * unpacking stops an inline options object at the door, that the mask keeps its
 * identity, and that a stage nobody reads never runs.
 */
import { describe, expect, it } from "vitest";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import {
  affineCellStyle,
  cellStyle,
  domBoxStyle,
  extentStyle,
  Memo,
  TilesetModel,
  type ModelInputs,
} from "./model.js";
import type { HostRule, TilesetOptions } from "./options.js";
import type { AssetProvider } from "./provider.js";

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

const provider: AssetProvider = (ref) => ({ src: `/${ref.tileId}/${ref.assetId}.png` });

const model = (over: Partial<ModelInputs> = {}): TilesetModel =>
  new TilesetModel("t1", {
    file: hero(),
    options: { provider },
    width: 0,
    height: 0,
    rects: null,
    dpr: 1,
    ...over,
  });

describe("Memo", () => {
  it("recomputes only when a dependency changes by Object.is", () => {
    let a = 1;
    let b: object = {};
    const m = new Memo(() => [a, b], (x, y) => ({ x, y }));
    const first = m.get();
    expect(m.get()).toBe(first);
    a = 2;
    const second = m.get();
    expect(second).not.toBe(first);
    b = {};
    expect(m.get()).not.toBe(second);
    expect(m.runs).toBe(3);
  });

  it("on a clock, validates its dependencies at most once per tick", () => {
    let tick = 0;
    let walks = 0;
    const up = new Memo(() => [1], (x) => x, () => tick);
    const m = new Memo(
      () => {
        walks++;
        return [up.get()];
      },
      (x) => x + 1,
      () => tick,
    );
    m.get();
    m.get();
    m.get();
    expect(walks).toBe(1);
    tick++;
    m.get();
    expect(walks).toBe(2);
    expect(m.runs).toBe(1);
  });

  it("does not cache a throw, so the next read retries", () => {
    let bad = true;
    const m = new Memo(
      () => [bad],
      (b) => {
        if (b) throw new Error("no");
        return "ok";
      },
    );
    expect(() => m.get()).toThrow("no");
    expect(() => m.get()).toThrow("no");
    bad = false;
    expect(m.get()).toBe("ok");
  });
});

describe("TilesetModel: what regenerates (R12)", () => {
  it("does not regenerate on a width change inside a band", () => {
    const m = model({ width: 1200 });
    const grid = m.grid;
    const geometry = m.uniform;
    m.set({ width: 1100 });
    expect(m.grid).toBe(grid);
    expect(m.uniform).not.toBe(geometry);
    expect(m.gridCache.generations).toBe(1);
  });

  it("regenerates on a seed change and on a loadSalt change", () => {
    const m = model({ width: 1200 });
    const g0 = m.grid;
    m.set({ options: { provider, seed: "other" } });
    const g1 = m.grid;
    expect(g1).not.toBe(g0);
    m.set({ options: { provider, seed: "other", loadSalt: 7 } });
    expect(m.grid).not.toBe(g1);
    expect(m.gridCache.generations).toBe(3);
  });

  it("does not regenerate on a provider change, but re-resolves the drawables", () => {
    const m = model({ width: 1200 });
    const grid = m.grid;
    const drawables = m.drawables;
    const other: AssetProvider = (ref) => ({ src: `/other/${ref.assetId}.png` });
    m.set({ options: { provider: other } });
    expect(m.grid).toBe(grid);
    expect(m.drawables).not.toBe(drawables);
    expect([...m.drawables.values()][0]).toEqual({ src: "/other/a.png" });
  });

  it("stops an inline options object rebuilt with equal values at the unpacking", () => {
    const m = model({ width: 1200 });
    const grid = m.grid;
    const items = m.items;
    const before = m.runs;
    // A new object every time, as `options={{ ... }}` in a template is.
    m.set({ options: { provider } });
    expect(m.grid).toBe(grid);
    expect(m.items).toBe(items);
    expect(m.runs.resolved).toBe(before.resolved + 1);
    expect(m.runs.geometry).toBe(before.geometry);
    expect(m.runs.drawables).toBe(before.drawables);
  });

  it("treats a push that changes nothing as no push at all", () => {
    const options = { provider };
    const m = model({ options, width: 1200 });
    void m.items;
    const before = m.runs;
    m.set({ options, width: 1200, dpr: 1 });
    void m.items;
    expect(m.runs).toEqual(before);
  });

  it("does not resolve an asset again on a reseed (DrawableCache)", () => {
    let calls = 0;
    const counting: AssetProvider = (ref) => {
      calls++;
      return { src: `/${ref.assetId}.png` };
    };
    const m = model({ options: { provider: counting }, width: 1200 });
    void m.drawables;
    m.set({ options: { provider: counting, seed: "again" } });
    void m.drawables;
    expect(calls).toBe(1);
  });
});

describe("TilesetModel: the keep-out mask", () => {
  const avoid: TilesetOptions = { provider, avoid: { targets: "h1" } };

  it("is null without avoid, and pending is false", () => {
    const m = model({ width: 1200, rects: null });
    expect(m.mask).toBeNull();
    expect(m.pending).toBe(false);
  });

  it("builds nothing a mask needs for a tileset without avoid", () => {
    const m = model({ width: 1200 });
    void m.items;
    void m.pending;
    void m.mask;
    expect(m.runs.drawn).toBe(0);
  });

  it("holds the picture (pending) until a mask exists", () => {
    const m = model({ options: avoid });
    expect(m.pending).toBe(true);
    m.set({ width: 1200, rects: [] });
    expect(m.mask).not.toBeNull();
    expect(m.pending).toBe(false);
  });

  it("keeps its identity while the hidden cells do not change, and never rebuilds the draw list", () => {
    const m = model({ options: avoid, width: 1200, rects: [{ left: 0, top: 0, right: 10, bottom: 10 }] });
    const mask = m.mask;
    const items = m.items;
    m.set({ rects: [{ left: 1, top: 1, right: 11, bottom: 11 }] });
    expect(m.mask).toBe(mask);
    m.set({ rects: [{ left: 0, top: 0, right: 400, bottom: 200 }] });
    expect(m.mask).not.toBe(mask);
    expect(m.items).toBe(items);
  });

  it("re-runs only the mask when the padding changes", () => {
    const m = model({ options: { ...avoid }, width: 1200, rects: [{ left: 0, top: 0, right: 100, bottom: 100 }] });
    void m.items;
    const before = m.runs;
    m.set({ options: { provider, avoid: { targets: "h1", padding: 40 } } });
    void m.items;
    void m.mask;
    expect(m.runs.mask).toBe(before.mask + 1);
    expect(m.runs.geometry).toBe(before.geometry);
    expect(m.runs.items).toBe(before.items);
  });
});

describe("TilesetModel: responsive rules", () => {
  it("keys the active rules on the measured width, and is the base shape before measurement", () => {
    const m = model({ options: { provider, responsive: RULES } });
    expect(m.ruleKey).toBe("");
    expect(m.pending).toBe(true);
    m.set({ width: 1200 });
    expect(m.ruleKey).toBe("");
    expect(m.grid.columns).toBe(25);
    m.set({ width: 800 });
    expect(m.ruleKey).toBe("0");
    expect(m.grid.columns).toBe(15);
    m.set({ width: 400 });
    expect(m.ruleKey).toBe("0,1");
    expect(m.grid.columns).toBe(9);
    expect(m.grid.rows).toBe(14);
    expect(m.pending).toBe(false);
  });

  it("emits a reservation stylesheet only when there are rules", () => {
    expect(model().reservation).toBe("");
    expect(model({ options: { provider, responsive: RULES } }).reservation).toContain(
      '[data-tileset-wrapper="t1"]',
    );
  });

  it("generates once per band when the width crosses back and forth (GridCache)", () => {
    const m = model({ options: { provider, responsive: RULES }, width: 1200 });
    for (const w of [800, 1200, 800, 1200]) {
      m.set({ width: w });
      void m.grid;
    }
    expect(m.gridCache.generations).toBe(2);
  });
});

describe("TilesetModel: substrates", () => {
  it("never builds the draw list under dom, and never builds the uniform cell", () => {
    const m = model({ options: { provider, substrate: "dom" }, width: 1200, dpr: 2 });
    expect(m.shownCells.length).toBeGreaterThan(0);
    expect(m.domCell).not.toBeNull();
    expect(m.uniform).toBeNull();
    expect(m.items).toEqual([]);
    expect(m.runs.items).toBe(1);
  });

  it("has no geometry for either substrate before measurement", () => {
    const m = model();
    expect(m.uniform).toBeNull();
    expect(m.presentation).toBeNull();
    expect(m.items).toEqual([]);
    const d = model({ options: { provider, substrate: "dom" } });
    expect(d.domCell).toBeNull();
  });

  it("keeps the shown cells by identity across a resize that culls the same columns", () => {
    const m = model({ options: { provider, substrate: "dom" }, width: 1200 });
    const shown = m.shownCells;
    m.set({ width: 1150 });
    expect(m.domCell).not.toBeNull();
    expect(m.shownCells).toBe(shown);
  });

  it("mounts every column before measurement and culls after, under fixed", () => {
    const m = model({ options: { provider, substrate: "dom", sizing: "fixed" } });
    const all = m.shownCells.length;
    m.set({ width: 300 });
    expect(m.shownCells.length).toBeLessThan(all);
  });
});

describe("cellStyle", () => {
  it("places by affine CSS lengths before measurement and by px after", () => {
    const m = model({ options: { provider, substrate: "dom" } });
    const { cell, x, y } = m.shownCells[0]!;
    const before = cellStyle(m.placement, cell, x, y);
    expect(before).toBe(affineCellStyle(m.placement, cell, x, y) + extras(cell));
    expect(before).toContain("%");
    m.set({ width: 1200 });
    const after = cellStyle(m.placement, cell, x, y);
    expect(after).toMatch(/^width: [\d.]+px; height: [\d.]+px; margin-left: [-\d.]+px; margin-top: [-\d.]+px;/);
  });
});

// What `cellStyle` appends after placement, for a cell from the fixture (identity
// transform, full opacity, so nothing).
function extras(cell: { opacity: number }): string {
  return cell.opacity < 1 ? ` opacity: ${cell.opacity};` : "";
}

describe("TilesetModel: development-build checks", () => {
  it("throws on a file that skipped loadTilesetFile, and recovers when it is fixed", () => {
    const bad = { ...hero(), schemaVersion: 999 } as unknown as TilesetFile;
    const m = model({ file: bad });
    expect(() => m.grid).toThrow(/loadTilesetFile/);
    m.set({ file: hero() });
    expect(m.grid.columns).toBe(25);
  });

  it("throws on invalid options", () => {
    const m = model({ options: { provider, substrate: "svg" } as unknown as TilesetOptions });
    expect(() => m.substrate).toThrow(/options are not valid/);
  });

  it("throws on host rules the file cannot take", () => {
    // Valid as options — `optionErrors` passes it — and wrong only for this file:
    // a rule naming `rows` under a coordinate-bound `rect`. That is the check only
    // `rulesReshapeErrors` can make.
    const file = hero();
    file.config.operations.push({
      id: "box",
      selection: { type: "rect", x: 0, y: 0, width: 4, height: 2 },
      source: { type: "constant" },
      target: "tileId",
      mapping: { palette: [{ tileId: "t", weight: 1 }] },
      blend: "set",
    });
    const m = model({ file, options: { provider, responsive: [{ maxWidth: 500, rows: 14 }] } });
    expect(() => m.rules).toThrow(/cannot be applied to this file/);
  });
});

describe("TilesetModel.report", () => {
  it("reaches the onAssetError the host holds now, not the one it held at resolution", () => {
    const seen: string[] = [];
    const failing: AssetProvider = () => {
      throw new Error("boom");
    };
    const m = model({ options: { provider: failing, onAssetError: () => seen.push("old") }, width: 1200 });
    void m.drawables;
    m.set({ options: { provider: failing, onAssetError: () => seen.push("new") } });
    m.report({ tileId: "t", assetId: "a", meta: {} }, new Error("later"));
    expect(seen.at(-1)).toBe("new");
  });
});

describe("the DOM box's styles", () => {
  const cell = { gridHeightDev: 481 } as never;

  it("declares the ratio only before measurement, fluid, and without rules", () => {
    const base = { domCell: null, sizing: "fluid" as const, hasRules: false, ratio: 2.5, pending: false };
    expect(domBoxStyle(base)).toBe("aspect-ratio: 2.5;");
    expect(domBoxStyle({ ...base, domCell: cell })).toBe("");
    expect(domBoxStyle({ ...base, sizing: "fixed" })).toBe("");
    expect(domBoxStyle({ ...base, hasRules: true })).toBe("");
  });

  it("hides the box while pending, spelled as the component always has", () => {
    const base = { domCell: null, sizing: "fluid" as const, hasRules: false, ratio: 2.5, pending: true };
    expect(domBoxStyle(base)).toBe("aspect-ratio: 2.5; visibility: hidden;");
    expect(domBoxStyle({ ...base, domCell: cell })).toBe(" visibility: hidden;");
  });

  it("gives the extent the measured grid height, else the fixed height, else none", () => {
    expect(extentStyle(cell, 2, "fluid", 300)).toBe("height: 240.5px");
    expect(extentStyle(null, 1, "fixed", 300)).toBe("height: 300px");
    expect(extentStyle(null, 1, "fluid", 300)).toBeNull();
  });
});
