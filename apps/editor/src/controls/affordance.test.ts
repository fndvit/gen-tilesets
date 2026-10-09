import { selections, sources, type ParamSpec } from "@fndvit/gen-tilesets";
import { describe, expect, it } from "vitest";
import { defaultParams } from "../draft.svelte.js";
import { admits, affordanceFor, defaultFor, rangeLabel } from "./affordance.js";

/**
 * **Invariant E9** — the `ParamSpec` → affordance mapping is total. A registered
 * type declaring only a `ParamSchema` gets a working control with no editor code
 * written for it.
 *
 * The sweep at the bottom is the one that matters: it walks the **real
 * registries**, so registering a Source tomorrow either produces a control or
 * fails here. A mapping with holes would make `05` §3.1's "a source file, a
 * table entry, a commit" false in practice.
 */

describe("affordanceFor — 09 §7.1's table", () => {
  it("number with both bounds → a slider", () => {
    // `density` from the `random` Selection.
    expect(affordanceFor({ type: "number", min: 0, max: 1 })).toEqual({
      kind: "slider",
      min: 0,
      max: 1,
      step: 0.01,
      integer: false,
    });
  });

  it("number with one bound or none → a numeric field", () => {
    // `cellsPerFeature` is `{ exclusiveMin: 0 }`; `angle` is unbounded.
    expect(affordanceFor({ type: "number", exclusiveMin: 0 }).kind).toBe("number");
    expect(affordanceFor({ type: "number" }).kind).toBe("number");
    expect(affordanceFor({ type: "number", max: 10 }).kind).toBe("number");
  });

  it("integer with one bound or none → a numeric field with integer steps", () => {
    // `n` is `>= 1`; `offset` and `rect`'s four are unbounded.
    expect(affordanceFor({ type: "integer", min: 1 })).toEqual({ kind: "number", integer: true });
    expect(affordanceFor({ type: "integer" })).toEqual({ kind: "number", integer: true });
  });

  it("integer with both bounds → a slider with integer steps, or a stepper where narrow", () => {
    // `octaves` is 1-3 and is the only V1 parameter the threshold decides.
    expect(affordanceFor({ type: "integer", min: 1, max: 3 })).toEqual({
      kind: "segmented",
      values: [1, 2, 3],
    });
    const wide = affordanceFor({ type: "integer", min: 0, max: 100 });
    expect(wide).toEqual({ kind: "slider", min: 0, max: 100, step: 1, integer: true });
  });

  it("enum → a segmented control over `values`", () => {
    expect(affordanceFor({ type: "enum", values: [0, 1] })).toEqual({
      kind: "segmented",
      values: [0, 1],
    });
    expect(affordanceFor({ type: "enum", values: ["column", "row"] })).toEqual({
      kind: "segmented",
      values: ["column", "row"],
    });
  });

  it("cellList → not generated, and that is not a hole — §7.3", () => {
    // "Permitted because the schema names it explicitly rather than because the
    // mapping ran out."
    expect(affordanceFor({ type: "cellList" })).toEqual({ kind: "cellList" });
  });
});

describe("admits — refuse, never coerce", () => {
  it("honours inclusive and exclusive bounds separately — 05 §5.1", () => {
    const exclusive: ParamSpec = { type: "number", exclusiveMin: 0 };
    expect(admits(exclusive, 0)).toBe(false);
    expect(admits(exclusive, 0.001)).toBe(true);

    const inclusive: ParamSpec = { type: "number", min: 0, max: 1 };
    expect(admits(inclusive, 0)).toBe(true);
    expect(admits(inclusive, 1)).toBe(true);
    expect(admits(inclusive, 1.0001)).toBe(false);
  });

  it("rejects non-finite values wherever they appear — 06 §10", () => {
    for (const spec of [
      { type: "number" },
      { type: "integer" },
      { type: "number", min: 0, max: 1 },
    ] satisfies ParamSpec[]) {
      expect(admits(spec, Number.NaN)).toBe(false);
      expect(admits(spec, Number.POSITIVE_INFINITY)).toBe(false);
    }
  });

  it("rejects a fraction where the spec says integer — 06 §5.2", () => {
    expect(admits({ type: "integer", min: 1 }, 1.5)).toBe(false);
    expect(admits({ type: "integer", min: 1 }, 2)).toBe(true);
  });

  it("accepts only the enum's own values", () => {
    const spec: ParamSpec = { type: "enum", values: [0, 1] };
    expect(admits(spec, 0)).toBe(true);
    expect(admits(spec, 2)).toBe(false);
    expect(admits(spec, "0")).toBe(false);
  });

  it("accepts a cellList of integer pairs and nothing else — 05 §5.1", () => {
    const spec: ParamSpec = { type: "cellList" };
    expect(admits(spec, [])).toBe(true);
    expect(admits(spec, [[0, 0], [3, 7]])).toBe(true);
    expect(admits(spec, [[0.5, 0]])).toBe(false);
    expect(admits(spec, [[0]])).toBe(false);
    expect(admits(spec, "nope")).toBe(false);
  });
});

describe("defaults — 05 §5.1, 06 §5.1", () => {
  it("prefers the schema's own default", () => {
    expect(defaultFor({ type: "integer", default: 0 })).toBe(0);
    expect(defaultFor({ type: "enum", values: ["column", "row"], default: "row" })).toBe("row");
  });

  it("falls back to the first value the spec admits, and never to an excluded bound", () => {
    expect(defaultFor({ type: "enum", values: ["column", "row"] })).toBe("column");
    expect(defaultFor({ type: "integer", min: 1 })).toBe(1);
    expect(admits({ type: "number", exclusiveMin: 0 }, defaultFor({ type: "number", exclusiveMin: 0 }))).toBe(
      true,
    );
  });
});

/**
 * **The sweep.** Every registered Selection and Source, walked from the real
 * registry rather than from a list written here.
 */
describe("E9 — totality over the actual registries", () => {
  const registered = [
    ...selections.all().map((r) => ["selection", r.name, r.params] as const),
    ...sources.all().map((r) => ["source", r.name, r.params] as const),
  ];

  it("covers every V1 registered type", () => {
    // Guards the sweep itself: an empty registry would pass everything below.
    expect(selections.names().sort()).toEqual([
      "all",
      "cellList",
      "checkerboard",
      "everyNth",
      "random",
      "rect",
    ]);
    // `04` §5.2 lists five Sources; `vignette` is not registered. Flagged as an
    // engine gap, not worked around -- when it lands, this line changes and the
    // control for it already exists.
    expect(sources.names().sort()).toEqual(["constant", "gradient", "random", "valueNoise"]);
  });

  for (const [kind, name, schema] of registered) {
    it(`${kind} "${name}" gets a control for every parameter, with no code written for it`, () => {
      for (const [param, spec] of Object.entries(schema)) {
        const affordance = affordanceFor(spec);
        expect(affordance.kind, `${name}.${param}`).toMatch(
          /^(slider|number|segmented|cellList)$/,
        );
      }
    });

    it(`${kind} "${name}" defaults to parameters its own schema admits`, () => {
      const params = defaultParams(schema);
      // Every declared parameter is materialized -- §7.1: "the editor writes it
      // explicitly on save", so the control shows what the file will contain.
      expect(Object.keys(params).sort()).toEqual(Object.keys(schema).sort());
      for (const [param, spec] of Object.entries(schema)) {
        expect(admits(spec, params[param]), `${name}.${param} = ${String(params[param])}`).toBe(
          true,
        );
      }
    });
  }

  it("reserves `type` in the parameter namespace — 06 §7.1", () => {
    // "No registered type may declare a parameter called `type`." The spread
    // shape of `{ type, ...params }` makes the collision unstateable rather than
    // merely unlikely, and this is what keeps it that way.
    for (const [, name, schema] of registered) {
      expect(Object.keys(schema), name).not.toContain("type");
    }
  });
});

describe("rangeLabel — each end says whether it is admitted", () => {
  it("brackets inclusive ends and parenthesises exclusive or absent ones", () => {
    expect(rangeLabel({ type: "number", min: 0, max: 1 })).toBe("[0, 1]");
    expect(rangeLabel({ type: "number", exclusiveMin: 0 })).toBe("(0, ∞)");
    // The case it used to get wrong: an exclusive upper end read as closed.
    expect(rangeLabel({ type: "number", min: 0, exclusiveMax: 1 })).toBe("[0, 1)");
    expect(rangeLabel({ type: "number", exclusiveMin: 0, exclusiveMax: 1 })).toBe("(0, 1)");
    expect(rangeLabel({ type: "integer", max: 4 })).toBe("(−∞, 4]");
  });

  it("names a bare integer and says nothing for enum or cellList", () => {
    expect(rangeLabel({ type: "integer" })).toBe("integer");
    expect(rangeLabel({ type: "number" })).toBe("");
    expect(rangeLabel({ type: "enum", values: ["a"] } as ParamSpec)).toBe("");
  });

  it("agrees with admits at every end it calls closed", () => {
    const spec: ParamSpec = { type: "number", min: 0, exclusiveMax: 1 };
    expect(admits(spec, 0)).toBe(true);
    expect(admits(spec, 1)).toBe(false);
  });
});
