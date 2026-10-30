// @vitest-environment happy-dom
/**
 * `TileDecorationRenderer` — the claims `decoration.ts` makes: the box and its
 * width, the reshape kept across an options-only update, a development reshape
 * error thrown to the caller, and a host left as it was found. The measurement
 * and the canvas are faked as in `renderer.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import type { TileDecorationRenderer as Decoration } from "./decoration.js";
import type { Measurement } from "./measure.js";
import type { NormalizedTargets } from "./options.js";
import type { AssetProvider } from "./provider.js";

let TileDecorationRenderer: typeof Decoration;

const reshapes = vi.hoisted(() => ({ count: 0 }));

vi.mock("../shape.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../shape.js")>();
  return {
    ...real,
    reshape: (...args: Parameters<typeof real.reshape>) => {
      reshapes.count++;
      return real.reshape(...args);
    },
  };
});

vi.mock("./measure.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("./measure.js")>();
  return {
    ...real,
    track: vi.fn((_box: HTMLElement, targets: NormalizedTargets | null, onMeasure: (m: Measurement) => void) => {
      onMeasure({ width: 240, height: 240, rects: targets === null ? null : [] });
      return vi.fn();
    }),
    observeDpr: vi.fn((onDpr: (dpr: number) => void) => {
      onDpr(1);
      return vi.fn();
    }),
  };
});

const style = (): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns: 10,
    defaultSeed: "s",
    tiles: ["t", "u"].map((id) => ({ id, name: id, assets: [{ id: "a", weight: 1 }] })),
    operations: [
      {
        id: "fill",
        selection: { type: "all" },
        source: { type: "random" },
        target: "tileId",
        mapping: { palette: [{ tileId: "t", weight: 1 }, { tileId: "u", weight: 1 }] },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 60, referenceWidth: 600, yOffset: 0, horizontalAlignment: "column" },
});

const provider: AssetProvider = (ref) => ({ src: `/${ref.tileId}/${ref.assetId}.png` });
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(async () => {
  vi.resetModules();
  ({ TileDecorationRenderer } = await import("./decoration.js"));
  reshapes.count = 0;
  const ctx = { setTransform() {}, clearRect() {}, drawImage() {}, save() {}, restore() {}, transform() {} };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
});

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function mount(s = style()) {
  const host = document.createElement("div");
  document.body.append(host);
  const d = new TileDecorationRenderer(host, { style: s, rows: 2, columns: 3, cellSize: 40, options: { provider } });
  return { host, d, s };
}

describe("TileDecorationRenderer", () => {
  it("puts a marked decoration box of columns x cellSize in the host, with the tileset in it", () => {
    const { host } = mount();
    const el = host.firstElementChild as HTMLElement;
    expect(el.matches(".decoration[data-tileset-decoration][data-tileset-wrapper]")).toBe(true);
    expect(el.getAttribute("style")).toBe("width: 120px;");
    expect(el.querySelector(":scope > .tileset[data-tileset-box]")).not.toBeNull();
    // Zero bleed, no yOffset: the natural ratio is exactly columns / rows.
    expect(host.querySelectorAll("[data-tileset-box]")).toHaveLength(1);
  });

  it("keeps the reshaped file across an options-only update, and reshapes on a shape change", async () => {
    const { host, d } = mount();
    const after = reshapes.count;
    d.update({ options: { provider, seed: "b" } });
    await tick();
    expect(reshapes.count).toBe(after);

    d.update({ columns: 4 });
    await tick();
    expect(reshapes.count).toBeGreaterThan(after);
    expect((host.firstElementChild as HTMLElement).getAttribute("style")).toBe("width: 160px;");
  });

  it("throws a style that cannot be placed to the caller, from the constructor and from update()", () => {
    const bad = style();
    bad.config.operations[0]!.selection = { type: "rect", x: 0, y: 0, width: 2, height: 2 } as never;
    const host = document.createElement("div");
    expect(() => new TileDecorationRenderer(host, { style: bad, rows: 2, columns: 3, cellSize: 40 })).toThrow(
      /cannot be placed at 3 x 2/,
    );
    expect(host.childNodes).toHaveLength(0);

    const { d, host: h } = mount();
    const box = h.querySelector("[data-tileset-box]");
    expect(() => d.update({ style: bad })).toThrow(/cannot be placed/);
    // Nothing changed: the old picture stays.
    expect(h.querySelector("[data-tileset-box]")).toBe(box);
    expect((h.firstElementChild as HTMLElement).getAttribute("style")).toBe("width: 120px;");
  });

  it("destroy() leaves the host as it was found, and is idempotent", () => {
    const { host, d } = mount();
    d.destroy();
    d.destroy();
    expect(host.childNodes).toHaveLength(0);
  });
});
