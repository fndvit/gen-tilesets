// @vitest-environment happy-dom
/**
 * `TilesetRenderer` — the lifecycle claims `renderer.ts` makes, against
 * happy-dom with the measurement and the DPR listener faked and the canvas
 * context stubbed. What a picture looks like is the demo's screenshot gate, not
 * this file's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilesetFile } from "../types.js";
import { SCHEMA_VERSION } from "../validate.js";
import type { ImageBank as Bank } from "./images.js";
import type { Measurement } from "./measure.js";
import type { NormalizedTargets, TilesetOptions } from "./options.js";
import type { AssetProvider } from "./provider.js";
import type { TilesetRenderer as Renderer } from "./renderer.js";

// Fresh modules per test: `styles.ts` remembers which documents block inline
// styles, and happy-dom has one document, so a strict-CSP test would otherwise
// send every later test down the adopted-sheet path.
let TilesetRenderer: typeof Renderer;
let ImageBank: typeof Bank;

interface FakeTrack {
  box: HTMLElement;
  targets: NormalizedTargets | null;
  onMeasure: (m: Measurement) => void;
  stop: ReturnType<typeof vi.fn>;
}

const fake = vi.hoisted(() => ({
  tracks: [] as FakeTrack[],
  dprStops: [] as Array<ReturnType<typeof import("vitest").vi.fn>>,
  /** What the fake tracker reports synchronously on `track()`, as the real one does. */
  first: { width: 0, height: 0 } as { width: number; height: number },
  /** Off to model a tracker whose targets have not been measured yet. */
  withRects: true,
}));

vi.mock("./measure.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("./measure.js")>();
  return {
    ...real,
    track: vi.fn((box: HTMLElement, targets: NormalizedTargets | null, onMeasure: (m: Measurement) => void) => {
      const stop = vi.fn();
      fake.tracks.push({ box, targets, onMeasure, stop });
      onMeasure({ ...fake.first, rects: targets === null || !fake.withRects ? null : [] });
      return stop;
    }),
    observeDpr: vi.fn((onDpr: (dpr: number) => void) => {
      const stop = vi.fn();
      fake.dprStops.push(stop);
      onDpr(1);
      return stop;
    }),
  };
});

const hero = (tiles = ["t", "u"]): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns: 10,
    defaultSeed: "s",
    tiles: tiles.map((id) => ({ id, name: id, assets: [{ id: "a", weight: 1 }] })),
    operations: [
      {
        id: "fill",
        selection: { type: "all" },
        source: { type: "random" },
        target: "tileId",
        mapping: { palette: tiles.map((tileId) => ({ tileId, weight: 1 })) },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 60, referenceWidth: 600, yOffset: 0, horizontalAlignment: "column" },
});

const provider: AssetProvider = (ref) => ({ src: `/${ref.tileId}/${ref.assetId}.png` });

/** Lets the queued render, and any settled promise before it, run. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

let clears: number;
let draws: number;

beforeEach(async () => {
  vi.resetModules();
  ({ TilesetRenderer } = await import("./renderer.js"));
  ({ ImageBank } = await import("./images.js"));
  fake.tracks.length = 0;
  fake.dprStops.length = 0;
  fake.first = { width: 600, height: 240 };
  fake.withRects = true;
  clears = 0;
  draws = 0;
  const ctx = {
    setTransform() {},
    clearRect: () => void clears++,
    drawImage: () => void draws++,
    save() {},
    restore() {},
    transform() {},
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
});

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.adoptedStyleSheets = [];
  vi.restoreAllMocks();
});

function mount(options: TilesetOptions = { provider }, file = hero()) {
  const host = document.createElement("div");
  document.body.append(host);
  const r = new TilesetRenderer(host, { file, options });
  return { host, r };
}

describe("TilesetRenderer", () => {
  it("adds its box to the host and renders it before returning", () => {
    const { host, r } = mount();
    expect(host.firstElementChild).toBe(r.box);
    expect(r.box.matches(".tileset[data-tileset-box][aria-hidden=true]")).toBe(true);
    expect(r.box.hasAttribute("data-measured")).toBe(true);
    expect(r.box.querySelector("canvas[data-tileset-canvas]")!.getAttribute("style")).toMatch(/^width: /);
    expect(clears).toBe(1);
  });

  it("declares the natural ratio until it is measured", () => {
    fake.first = { width: 0, height: 0 };
    const { r } = mount();
    expect(r.box.getAttribute("style")).toMatch(/^aspect-ratio: /);
    expect(r.box.hasAttribute("data-measured")).toBe(false);
  });

  it("keeps the box's identity across update(), rules appearing and going included", async () => {
    const { host, r } = mount();
    const box = r.box;
    const canvas = box.firstElementChild;

    r.update({ options: { provider, seed: "b" } });
    await tick();
    expect(r.box).toBe(box);

    r.update({ options: { provider, responsive: [{ maxWidth: 400, columns: 6 }] } });
    await tick();
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.matches(".container[data-tileset-wrapper]")).toBe(true);
    expect(wrapper.firstElementChild!.tagName).toBe("STYLE");
    expect(wrapper.firstElementChild!.textContent).toContain(`[data-tileset-wrapper="${wrapper.getAttribute("data-tileset-wrapper")}"]`);
    expect(wrapper.lastElementChild).toBe(box);

    r.update({ options: { provider } });
    await tick();
    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(box);
    expect(box.firstElementChild).toBe(canvas);
    // Moved, never re-registered: one track for the box's whole life.
    expect(fake.tracks).toHaveLength(1);
  });

  it("re-tracks when the avoid targets change", async () => {
    const { r } = mount();
    const h = document.createElement("h2");
    document.body.append(h);
    r.update({ options: { provider, avoid: { targets: [h] } } });
    await tick();
    expect(fake.tracks).toHaveLength(2);
    expect(fake.tracks[0]!.stop).toHaveBeenCalledOnce();
    expect(fake.tracks[1]!.targets).not.toBeNull();
  });

  it("draws nothing while `avoid` has no rects yet, then draws around them", async () => {
    // Every wanted key decoded at once, so what is drawn is down to the mask.
    vi.spyOn(ImageBank.prototype, "sync").mockImplementation(function (this: Bank, wanted) {
      for (const key of wanted.keys()) {
        this.ready.set(key, { naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
      }
    });
    const { r } = mount();
    expect(draws).toBe(40);

    const h = document.createElement("h2");
    document.body.append(h);
    fake.withRects = false;
    r.update({ options: { provider, avoid: { targets: [h] } } });
    draws = 0;
    await tick();
    expect(draws).toBe(0);

    // The left half of the box, in render space: half the columns are hidden.
    fake.tracks[1]!.onMeasure({ width: 600, height: 240, rects: [{ left: 0, top: 0, right: 300, bottom: 240 }] });
    await tick();
    expect(draws).toBeGreaterThan(0);
    expect(draws).toBeLessThan(40);
  });

  it("coalesces triggers in one tick into one paint", async () => {
    const { r } = mount();
    const t = fake.tracks[0]!;
    clears = 0;
    t.onMeasure({ width: 500, height: 200, rects: null });
    r.update({ options: { provider, seed: "c" } });
    t.onMeasure({ width: 520, height: 208, rects: null });
    expect(clears).toBe(0);
    await tick();
    expect(clears).toBe(1);
  });

  it("does not repaint when nothing it draws changed", async () => {
    const { r } = mount();
    clears = 0;
    r.update({ options: { provider } });
    await tick();
    expect(clears).toBe(0);
  });

  it("destroy() stops the measurement and the DPR listener, and leaves the host as it was", async () => {
    const { host, r } = mount({ provider, responsive: [{ maxWidth: 400, columns: 6 }] });
    const t = fake.tracks[0]!;
    r.destroy();
    expect(t.stop).toHaveBeenCalledOnce();
    expect(fake.dprStops[0]).toHaveBeenCalledOnce();
    expect(host.childNodes).toHaveLength(0);

    clears = 0;
    t.onMeasure({ width: 300, height: 120, rects: null });
    await tick();
    expect(clears).toBe(0);

    r.destroy();
    expect(t.stop).toHaveBeenCalledOnce();
    expect(() => r.update({ options: { provider } })).toThrow(/after `destroy\(\)`/);
  });

  it("nothing in flight paints after destroy()", async () => {
    let resolve!: (d: { src: string }) => void;
    const lazy: AssetProvider = () => new Promise((r) => (resolve = r));
    const sync = vi.spyOn(ImageBank.prototype, "sync");
    const { r } = mount({ provider: lazy });
    const before = sync.mock.calls.length;
    r.destroy();
    resolve({ src: "/late.png" });
    await tick();
    expect(sync.mock.calls.length).toBe(before);
  });

  it("reports a provider rejection once", async () => {
    const onAssetError = vi.fn();
    const failing: AssetProvider = () => Promise.reject(new Error("nope"));
    const { r } = mount({ provider: failing, onAssetError }, hero(["t"]));
    await tick();
    fake.tracks[0]!.onMeasure({ width: 400, height: 160, rects: null });
    r.update({ options: { provider: failing, onAssetError, seed: "b" } });
    await tick();
    expect(onAssetError).toHaveBeenCalledOnce();
    expect(onAssetError.mock.calls[0]![0]).toMatchObject({ tileId: "t", assetId: "a" });
  });

  it("reports to the onAssetError it holds now, not the one it held at mount", async () => {
    const first = vi.fn();
    const second = vi.fn();
    let reject!: (e: unknown) => void;
    const lazy: AssetProvider = () => new Promise((_, no) => (reject = no));
    const { r } = mount({ provider: lazy, onAssetError: first }, hero(["t"]));
    r.update({ options: { provider: lazy, onAssetError: second } });
    reject(new Error("late"));
    await tick();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("drops a deleted Tile's source from the bank", async () => {
    const sync = vi.spyOn(ImageBank.prototype, "sync");
    const { r } = mount({ provider }, hero(["t", "u"]));
    expect([...sync.mock.lastCall![0].values()].sort()).toEqual(["/t/a.png", "/u/a.png"]);
    r.update({ file: hero(["t"]) });
    await tick();
    expect([...sync.mock.lastCall![0].values()]).toEqual(["/t/a.png"]);
  });

  it("lands a lazy provider's src in the bank when it settles", async () => {
    const sync = vi.spyOn(ImageBank.prototype, "sync");
    const lazy: AssetProvider = async (ref) => ({ src: `/lazy/${ref.tileId}.png` });
    mount({ provider: lazy }, hero(["t"]));
    expect(sync.mock.lastCall![0].size).toBe(0);
    await tick();
    expect([...sync.mock.lastCall![0].values()]).toEqual(["/lazy/t.png"]);
  });

  it("drops a source whose new lazy drawable rejects, so the old picture is not drawn", async () => {
    const sync = vi.spyOn(ImageBank.prototype, "sync");
    const { r } = mount({ provider }, hero(["t"]));
    expect([...sync.mock.lastCall![0].values()]).toEqual(["/t/a.png"]);
    const failing: AssetProvider = () => Promise.reject(new Error("gone"));
    r.update({ options: { provider: failing, onAssetError: () => {} } });
    await tick();
    expect(sync.mock.lastCall![0].size).toBe(0);
  });

  it("does not repaint for an update whose responsive rules are equal but new", async () => {
    const rules = () => ({ provider, responsive: [{ maxWidth: 800, columns: 6, align: { x: "left" as const } }] });
    const { r } = mount(rules());
    await tick();
    clears = 0;
    r.update({ options: rules() });
    await tick();
    expect(clears).toBe(0);
  });

  it("re-tracks when a renderer built detached is attached, so `avoid` resolves in the page", async () => {
    const host = document.createElement("div");
    host.setAttribute("data-tileset-wrapper", "");
    const r = new TilesetRenderer(host, { file: hero(), options: { provider, avoid: { targets: "h2" } } });
    expect(fake.tracks).toHaveLength(1);

    const section = document.createElement("section");
    section.append(document.createElement("h2"), host);
    document.body.append(section);
    fake.tracks[0]!.onMeasure({ width: 610, height: 240, rects: [] });
    await tick();
    expect(fake.tracks).toHaveLength(2);
    expect(fake.tracks[1]!.box).toBe(r.box);
    expect(fake.tracks[0]!.stop).toHaveBeenCalledOnce();
  });

  it("leaves nothing behind when the first render throws", () => {
    const host = document.createElement("div");
    const real = fake.first;
    // A measurement the fake cannot report: the first render throws from `track`.
    Object.defineProperty(fake, "first", {
      configurable: true,
      get() {
        throw new Error("measure failed");
      },
    });
    try {
      expect(() => new TilesetRenderer(host, { file: hero(), options: { provider } })).toThrow(/measure failed/);
    } finally {
      Object.defineProperty(fake, "first", { configurable: true, writable: true, value: real });
    }
    expect(host.childNodes).toHaveLength(0);
    expect(fake.dprStops.at(-1)).toHaveBeenCalledOnce();
  });

  it("throws a responsive rule the file cannot take to the caller", () => {
    const file = hero();
    file.config.operations[0]!.selection = { type: "rect", x: 0, y: 0, width: 2, height: 2 } as never;
    const host = document.createElement("div");
    const r = new TilesetRenderer(host, { file, options: { provider } });
    expect(() => r.update({ options: { provider, responsive: [{ maxWidth: 500, rows: 8 }] } })).toThrow(
      /cannot be applied/,
    );
  });

  it("throws on the DOM substrate, which it does not draw yet, without touching the host", () => {
    const host = document.createElement("div");
    expect(() => new TilesetRenderer(host, { file: hero(), options: { provider, substrate: "dom" } })).toThrow(
      /not supported here yet/,
    );
    expect(host.childNodes).toHaveLength(0);
  });

  it("throws an invalid update to the caller, not from the microtask", () => {
    const { r } = mount();
    expect(() => r.update({ options: { provider, substrate: "svg" as never } })).toThrow();
  });

  it("gives each instance its own id, and takes one it is given", () => {
    const rules = { provider, responsive: [{ maxWidth: 400, columns: 6 }] };
    const a = mount(rules).host.firstElementChild!.getAttribute("data-tileset-wrapper");
    const b = mount(rules).host.firstElementChild!.getAttribute("data-tileset-wrapper");
    expect(a).toMatch(/^gts-[a-z0-9]+-\d+$/);
    expect(b).not.toBe(a);

    const host = document.createElement("div");
    new TilesetRenderer(host, { file: hero(), options: rules, id: "s1" });
    expect(host.firstElementChild!.getAttribute("data-tileset-wrapper")).toBe("s1");
  });

  it("moves the reservation to a per-instance sheet under a strict CSP, and removes it on destroy()", () => {
    vi.spyOn(HTMLStyleElement.prototype, "sheet", "get").mockReturnValue(null);
    const host = document.createElement("div");
    document.body.append(host);
    const own = new CSSStyleSheet();
    document.adoptedStyleSheets = [own];
    const r = new TilesetRenderer(host, {
      file: hero(),
      options: { provider, responsive: [{ maxWidth: 400, columns: 6 }] },
    });
    const wrapper = host.firstElementChild!;
    expect(wrapper.querySelector("style")).toBeNull();
    const id = wrapper.getAttribute("data-tileset-wrapper")!;
    const mine = document.adoptedStyleSheets.filter((s) =>
      Array.from(s.cssRules).some((rule) => rule.cssText.includes(id)),
    );
    expect(mine).toHaveLength(1);

    r.destroy();
    expect(document.adoptedStyleSheets).not.toContain(mine[0]);
    expect(document.adoptedStyleSheets[0]).toBe(own);
  });
});
