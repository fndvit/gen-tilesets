// @vitest-environment happy-dom
/**
 * `renderImage` and `imageSize` — `./image.ts`.
 *
 * happy-dom has no real canvas, so the 2D context is stubbed and records what
 * it is asked to draw. What the pixels look like is the editor probe's job
 * (X3b-3); this file checks the size, where the raster lands, the wait for
 * pictures, and that a failure names every one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import { imageSize, loadAll, renderImage, settleDrawables } from "./image.js";
import { ImageBank, NaturalSizeChecks } from "./images.js";
import type { AssetProvider, Drawable } from "./provider.js";

const file = (layout: Partial<TilesetFile["layout"]> = {}, columns = 10): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns,
    defaultSeed: "s",
    tiles: ["t", "u"].map((id) => ({ id, name: id, assets: [{ id: "a", weight: 1 }] })),
    operations: [
      {
        id: "fill",
        selection: [{ type: "all" }],
        source: { type: "random" },
        target: "tileId",
        mapping: { palette: ["t", "u"].map((tileId) => ({ tileId, weight: 1 })) },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 60, referenceWidth: 600, yOffset: 0, horizontalAlignment: "column", ...layout },
});

const provider: AssetProvider = (ref) => ({ src: `/${ref.tileId}/${ref.assetId}.png` });

interface Call {
  canvas: HTMLCanvasElement;
  args: unknown[];
}
let draws: Call[];
let fills: Array<{ canvas: HTMLCanvasElement; style: unknown }>;

beforeEach(() => {
  draws = [];
  fills = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    const ctx = {
      fillStyle: "" as unknown,
      drawImage: (...args: unknown[]) => void draws.push({ canvas, args }),
      fillRect: () => void fills.push({ canvas, style: ctx.fillStyle }),
      save() {},
      restore() {},
      transform() {},
    };
    return ctx as never;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback) {
    cb(new Blob(["png"], { type: "image/png" }));
  });
});

afterEach(() => vi.restoreAllMocks());

/** Pictures decode, unless their src says otherwise, and are large enough to skip the SVG probe. */
function pictures(behaviour: (src: string) => Promise<void> = async () => {}) {
  vi.spyOn(HTMLImageElement.prototype, "decode").mockImplementation(function (this: HTMLImageElement) {
    return behaviour(this.src);
  });
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(400);
}

/** The one draw of a canvas onto another: the raster composed into the image. */
const compose = () => draws.find((d) => d.args[0] instanceof HTMLCanvasElement)!;

describe("imageSize — the PNG's pixels", () => {
  it("is the box at the width, times the density, as tall as the grid (fluid)", () => {
    expect(imageSize(file(), { width: 600, density: 1 })).toEqual({ width: 600, height: 240 });
    expect(imageSize(file(), { width: 600, density: 2 })).toEqual({ width: 1200, height: 480 });
    expect(imageSize(file(), { width: 300, density: 2 })).toEqual({ width: 600, height: 240 });
  });

  it("keeps the design height under fixed sizing, whatever the width", () => {
    expect(imageSize(file(), { width: 900, density: 1, sizing: "fixed" })).toEqual({ width: 900, height: 240 });
    expect(imageSize(file(), { width: 300, density: 2, sizing: "fixed" })).toEqual({ width: 600, height: 480 });
  });

  it("lays out with the responsive rule that holds at the width", () => {
    const responsive = [{ maxWidth: 400, rows: 2 }];
    // 300 px of a 600 px design: s = 0.5, so 2 rows of 30 px.
    expect(imageSize(file(), { width: 300, density: 1, responsive })).toEqual({ width: 300, height: 60 });
    expect(imageSize(file(), { width: 600, density: 1, responsive })).toEqual({ width: 600, height: 240 });
  });

  it("takes the height from the snapped raster, not the unrounded natural height", () => {
    // yOffset 0.3 at a 7 px cell: the origin rounds to -2 device px, not -2.1,
    // so the raster is 4 * 7 - 2 = 26 px tall where (4 - 0.3) * 7 is 25.9.
    expect(imageSize(file({ yOffset: 0.3 }), { width: 70, density: 1 }).height).toBe(26);
  });

  it("refuses a width or density that is not a positive number", () => {
    expect(() => imageSize(file(), { width: 0, density: 1 })).toThrow(RangeError);
    expect(() => imageSize(file(), { width: 600, density: Number.NaN })).toThrow(RangeError);
  });
});

describe("renderImage — composing the PNG", () => {
  it("draws every tile onto the raster, then the raster into the image", async () => {
    pictures();
    const blob = await renderImage(file(), { width: 600, density: 2, provider });
    expect(blob.type).toBe("image/png");
    const c = compose();
    expect(c.canvas.width).toBe(1200);
    expect(c.canvas.height).toBe(480);
    expect(c.args.slice(1)).toEqual([0, 0, 1200, 480]);
    // 40 cells on the raster, and the one compose.
    expect(draws.filter((d) => d.canvas !== c.canvas)).toHaveLength(40);
  });

  it("places a wider grid with its bleed off the left edge, clipped by the image", async () => {
    pictures();
    // 11 columns of 60 px in a 600 px design: 30 px of bleed each side, so the
    // edge columns are half in the box. (Wholly hidden columns are culled from
    // the raster, as on the live canvas.)
    await renderImage(file({}, 11), { width: 600, density: 1, provider });
    const [, x, y, w] = compose().args as number[];
    expect(x).toBe(-30);
    expect(y).toBe(0);
    expect(w).toBe(660);
    expect(compose().canvas.width).toBe(600);
  });

  it("keeps the grid at the top under a bottom alignment: the box is as tall as the grid", async () => {
    pictures();
    await renderImage(file(), { width: 600, density: 1, provider, align: { y: "bottom" } });
    expect(compose().args[2]).toBe(0);
  });

  it("fills the background only when one is given", async () => {
    pictures();
    await renderImage(file(), { width: 600, density: 1, provider, background: "#f0e8d8" });
    expect(fills).toEqual([{ canvas: compose().canvas, style: "#f0e8d8" }]);
    fills = [];
    await renderImage(file(), { width: 600, density: 1, provider });
    expect(fills).toEqual([]);
  });

  it("requests the pictures with CORS", async () => {
    pictures();
    const set = vi.spyOn(HTMLImageElement.prototype, "crossOrigin", "set");
    await renderImage(file(), { width: 600, density: 1, provider });
    expect(set).toHaveBeenCalledWith("anonymous");
  });

  it("rejects naming every picture that failed, resolved or loaded, and draws nothing", async () => {
    pictures(async (src) => {
      if (src.includes("broken")) throw new Error("decode failed");
    });
    const failing: AssetProvider = (ref) =>
      ref.tileId === "t" ? Promise.reject(new Error("no such asset")) : { src: "/broken.png" };
    await expect(renderImage(file(), { width: 600, density: 1, provider: failing })).rejects.toThrow(
      "2 pictures could not be loaded, so no image was made: t/a, u/a.",
    );
    expect(draws).toEqual([]);
  });

  it("rejects when the browser cannot encode the PNG", async () => {
    pictures();
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: BlobCallback) => cb(null));
    await expect(renderImage(file(), { width: 600, density: 1, provider })).rejects.toThrow(/encode/);
  });
});

describe("settleDrawables — waiting for every drawable", () => {
  it("waits for a late one, and reports a rejection without ending the wait", async () => {
    let resolveLate!: (d: Drawable) => void;
    const late = new Promise<Drawable>((r) => (resolveLate = r));
    const rejected = Promise.reject(new Error("gone"));
    rejected.catch(() => {});
    const drawables = new Map<string, Drawable | Promise<Drawable>>([
      ["now", { src: "/now.png" }],
      ["soon", Promise.resolve({ src: "/soon.png" })],
      ["late", late],
      ["gone", rejected],
    ]);
    const fail = vi.fn();
    const settled = settleDrawables(drawables, fail);
    setTimeout(() => resolveLate({ src: "/late.png" }), 5);
    expect(await settled).toEqual(
      new Map([
        ["now", "/now.png"],
        ["soon", "/soon.png"],
        ["late", "/late.png"],
      ]),
    );
    expect(fail).toHaveBeenCalledOnce();
    expect(fail.mock.calls[0]![0]).toBe("gone");
  });
});

describe("loadAll — every key decoded or failed", () => {
  it("resolves only once the last picture lands, with each failure reported", async () => {
    let finishLate!: () => void;
    pictures((src) => {
      if (src.includes("bad")) return Promise.reject(new Error("bad"));
      if (src.includes("late")) return new Promise<void>((r) => (finishLate = r));
      return Promise.resolve();
    });
    const bank = new ImageBank(new NaturalSizeChecks(async () => {}));
    const fail = vi.fn();
    let done = false;
    const loading = loadAll(
      bank,
      new Map([
        ["a", "/a.png"],
        ["bad", "/bad.png"],
        ["late", "/late.png"],
      ]),
      fail,
    ).then(() => (done = true));
    await new Promise((r) => setTimeout(r, 0));
    expect(done).toBe(false);
    finishLate();
    await loading;
    expect([...bank.ready.keys()].sort()).toEqual(["a", "late"]);
    expect(fail.mock.calls.map((c) => c[0])).toEqual(["bad"]);
  });

  it("resolves at once when nothing is wanted", async () => {
    await expect(loadAll(new ImageBank(), new Map(), vi.fn())).resolves.toBeUndefined();
  });

  it("leaves crossOrigin off unless the bank asks for it", async () => {
    pictures();
    const set = vi.spyOn(HTMLImageElement.prototype, "crossOrigin", "set");
    await loadAll(new ImageBank(new NaturalSizeChecks(async () => {})), new Map([["a", "/a.png"]]), vi.fn());
    expect(set).not.toHaveBeenCalled();
  });
});
