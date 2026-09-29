import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPTIONS,
  legacyPropErrors,
  normalizeTargets,
  optionErrors,
  resolveOptions,
  sameTargets,
  type TilesetOptions,
} from "./options.js";
import { defaultProvider } from "./provider.js";

/** Stand-ins for elements: `normalizeTargets` only asks for `nodeType`. */
const el = (name: string) => ({ nodeType: 1, name }) as unknown as Element;

describe("resolveOptions", () => {
  it("fills exactly the documented defaults", () => {
    expect(resolveOptions(undefined)).toEqual(DEFAULT_OPTIONS);
    expect(resolveOptions({})).toEqual(DEFAULT_OPTIONS);
    expect(DEFAULT_OPTIONS).toEqual({
      seed: undefined,
      loadSalt: 0,
      substrate: "canvas",
      sizing: "fluid",
      alignX: "center",
      alignY: "top",
      avoid: null,
      provider: defaultProvider,
      onAssetError: undefined,
    });
  });

  it("treats a present-but-undefined field as absent", () => {
    const o: TilesetOptions = { seed: undefined, substrate: undefined, align: { x: undefined } };
    expect(resolveOptions(o)).toEqual(DEFAULT_OPTIONS);
  });

  it("lets each field override on its own", () => {
    const provider = () => ({ src: "x" });
    const onAssetError = () => {};
    const cases: Array<[TilesetOptions, Partial<typeof DEFAULT_OPTIONS>]> = [
      [{ seed: "s" }, { seed: "s" }],
      [{ loadSalt: 7 }, { loadSalt: 7 }],
      [{ substrate: "dom" }, { substrate: "dom" }],
      [{ sizing: "fixed" }, { sizing: "fixed" }],
      [{ align: { x: "left" } }, { alignX: "left" }],
      [{ align: { y: "bottom" } }, { alignY: "bottom" }],
      [{ provider }, { provider }],
      [{ onAssetError }, { onAssetError }],
      [
        { avoid: { targets: "h1" } },
        { avoid: { targets: { kind: "selector", selector: "h1" }, padding: 0 } },
      ],
      [
        { avoid: { targets: "h1", padding: 8 } },
        { avoid: { targets: { kind: "selector", selector: "h1" }, padding: 8 } },
      ],
    ];
    for (const [o, diff] of cases) {
      expect(resolveOptions(o)).toEqual({ ...DEFAULT_OPTIONS, ...diff });
    }
  });
});

describe("normalizeTargets and sameTargets", () => {
  it("decides the shape once", () => {
    const a = el("a");
    expect(normalizeTargets("h1, p")).toEqual({ kind: "selector", selector: "h1, p" });
    expect(normalizeTargets(a)).toEqual({ kind: "elements", elements: [a] });
    expect(normalizeTargets([a, el("b")]).kind).toBe("elements");
  });

  it("treats an iterable element as one element, not as its children", () => {
    // An HTMLSelectElement iterates its options; passed alone it means the select.
    const select = Object.assign(el("select"), {
      *[Symbol.iterator]() {
        yield el("option");
      },
    });
    expect(normalizeTargets(select)).toEqual({ kind: "elements", elements: [select] });
  });

  it("compares by content, so a fresh inline array is the same targets", () => {
    const a = el("a");
    const b = el("b");
    expect(sameTargets(normalizeTargets([a, b]), normalizeTargets([a, b]))).toBe(true);
    expect(sameTargets(normalizeTargets([a, b]), normalizeTargets([b, a]))).toBe(false);
    expect(sameTargets(normalizeTargets("h1"), normalizeTargets("h1"))).toBe(true);
    expect(sameTargets(normalizeTargets("h1"), normalizeTargets("h2"))).toBe(false);
    expect(sameTargets(normalizeTargets("h1"), null)).toBe(false);
    expect(sameTargets(null, null)).toBe(true);
  });
});

describe("optionErrors", () => {
  it("accepts every valid options object", () => {
    const valid: unknown[] = [
      undefined,
      {},
      { seed: "x", loadSalt: 3, substrate: "dom", sizing: "fixed" },
      { align: { x: "right", y: "center" } },
      { avoid: { targets: "h1" } },
      { avoid: { targets: [el("a")], padding: 0 } },
      { avoid: { targets: el("a"), padding: 12.5 } },
      { provider: () => ({ src: "" }), onAssetError: () => {} },
    ];
    for (const o of valid) expect(optionErrors(o)).toEqual([]);
  });

  it("rejects every invalid value with a message naming its path", () => {
    const invalid: Array<[unknown, string]> = [
      [null, "`options`"],
      [{ substrate: "svg" }, "options.substrate"],
      [{ sizing: "responsive" }, "options.sizing"],
      [{ align: { x: "start" } }, "options.align.x"],
      [{ align: { y: "middle" } }, "options.align.y"],
      [{ align: { z: "top" } }, "options.align.z"],
      [{ align: "left" }, "options.align"],
      [{ avoid: { targets: "  " } }, "options.avoid.targets"],
      [{ avoid: { targets: 3 } }, "options.avoid.targets"],
      [{ avoid: {} }, "options.avoid.targets"],
      [{ avoid: { targets: "h1", padding: -1 } }, "options.avoid.padding"],
      [{ avoid: { targets: "h1", padding: Infinity } }, "options.avoid.padding"],
      [{ avoid: { targets: "h1", margin: 4 } }, "options.avoid.margin"],
      [{ seed: 4 }, "options.seed"],
      [{ loadSalt: NaN }, "options.loadSalt"],
      [{ provider: "defaultProvider" }, "options.provider"],
      [{ onAssetError: true }, "options.onAssetError"],
      [{ substrat: "dom" }, "options.substrat"],
    ];
    for (const [o, path] of invalid) {
      const errors = optionErrors(o);
      expect(errors.length, JSON.stringify(o)).toBeGreaterThan(0);
      expect(errors.join(" ")).toContain(path);
    }
  });
});

describe("legacyPropErrors", () => {
  it("names each pre-0.6.0 prop and where it went", () => {
    const errors = legacyPropErrors({ seed: "x", substrate: "dom", unrelated: 1 });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("options={{ seed }}");
    expect(errors[1]).toContain("options={{ substrate }}");
  });

  it("is silent when there are none", () => {
    expect(legacyPropErrors({})).toEqual([]);
  });
});
