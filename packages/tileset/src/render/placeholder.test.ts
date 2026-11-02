// @vitest-environment happy-dom
/**
 * `placeholder()` — the server's reserved box must be the renderer's own box
 * before its first measurement, or the swap from one to the other would move
 * the page (**S8**). Each case builds a `TilesetRenderer` whose tracker reports
 * nothing measured, and compares its tree to the placeholder's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import type { Measurement } from "./measure.js";
import type { NormalizedTargets, TilesetOptions } from "./options.js";
import type { placeholder as Make } from "./placeholder.js";
import type { AssetProvider } from "./provider.js";
import type { TilesetRenderer as Renderer } from "./renderer.js";

let TilesetRenderer: typeof Renderer;
let placeholder: typeof Make;

vi.mock("./measure.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("./measure.js")>();
  return {
    ...real,
    // Nothing measured, and no rects: the renderer stays in its pre-measurement state.
    track: vi.fn((_box: HTMLElement, _t: NormalizedTargets | null, onMeasure: (m: Measurement) => void) => {
      onMeasure({ width: 0, height: 0, rects: null });
      return vi.fn();
    }),
    observeDpr: vi.fn(() => vi.fn()),
  };
});

const file = (yOffset = 0.25): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns: 10,
    defaultSeed: "s",
    tiles: [{ id: "t", name: "t", assets: [{ id: "a", weight: 1 }] }],
    operations: [
      {
        id: "fill",
        selection: { type: "all" },
        source: { type: "random" },
        target: "tileId",
        mapping: { palette: [{ tileId: "t", weight: 1 }] },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 60, referenceWidth: 640, yOffset, horizontalAlignment: "column" },
});

const provider: AssetProvider = (ref) => ({ src: `/${ref.tileId}/${ref.assetId}.png` });

beforeEach(async () => {
  vi.resetModules();
  ({ TilesetRenderer } = await import("./renderer.js"));
  ({ placeholder } = await import("./placeholder.js"));
});

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

/** The parts of a render box that reserve space, as the renderer left them. */
function rendered(options: TilesetOptions) {
  const host = document.createElement("div");
  document.body.append(host);
  const r = new TilesetRenderer(host, { id: "p1", file: file(), options });
  const wrapper = r.box.parentElement === host ? null : r.box.parentElement!;
  return {
    wrapper: wrapper === null ? null : { id: wrapper.getAttribute("data-tileset-wrapper"), css: wrapper.querySelector("style")!.textContent },
    substrate: r.box.querySelector("canvas") === null ? "dom" : "canvas",
    className: r.box.className,
    style: r.box.getAttribute("style") ?? "",
    extent: r.box.querySelector(".extent")?.getAttribute("style") ?? null,
    measured: r.box.hasAttribute("data-measured"),
  };
}

const CASES: Array<[string, TilesetOptions]> = [
  ["canvas, fluid", { provider }],
  ["canvas, fixed", { provider, sizing: "fixed", align: { y: "bottom" } }],
  ["canvas, rules", { provider, responsive: [{ maxWidth: 500, columns: 6 }, { minWidth: 900, sizing: "fixed", cellSize: 40 }] }],
  ["dom, fluid", { provider, substrate: "dom" }],
  ["dom, fixed", { provider, substrate: "dom", sizing: "fixed" }],
  ["dom, rules", { provider, substrate: "dom", responsive: [{ maxWidth: 500, rows: 6 }] }],
  ["dom, avoid, overflow", { provider, substrate: "dom", overflow: "visible", avoid: { targets: "h2" } }],
];

describe("placeholder", () => {
  it.each(CASES)("reserves what the renderer's box reserves before measuring: %s", (_name, options) => {
    const r = rendered(options);
    expect(r.measured).toBe(false);
    const { measured: _, ...box } = r;
    expect(placeholder("p1", file(), options)).toEqual(box);
  });

  it.each(CASES)("generates no grid: %s", async (_name, options) => {
    const generate = await import("../generate.js");
    const spy = vi.spyOn(generate, "generate");
    placeholder("p1", file(), { ...options, avoid: { targets: "h2" } });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("setAside", () => {
  it("takes what the host holds out of layout, so the renderer's first measurement is of its own box", async () => {
    const { setAside: aside } = await import("./placeholder.js");
    const host = document.createElement("div");
    host.innerHTML = '<div class="tileset-container"><div class="tileset" data-tileset-box data-tileset-placeholder></div></div>';
    document.body.append(host);
    aside(host);
    expect((host.firstElementChild as HTMLElement).style.display).toBe("none");
    const r = new TilesetRenderer(host, { id: "p1", file: file(), options: { provider } });
    expect(r.box.style.display).toBe("");
  });
});
