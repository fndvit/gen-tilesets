/**
 * The draft's two conversions — `09-editor.md` §4.2, §4.3; `DECISIONS.md` D7.
 *
 * `fromOperation` and `toOperation` are inverses over legal Operations, and that
 * is the property worth testing rather than either one alone: an edit that does
 * not round-trip is an edit that changes something the author did not touch, and
 * the whole reason to edit in place rather than delete-and-rebuild is that
 * nothing else moves.
 *
 * `drafting.svelte.ts` holds the rune and is not importable here — the Svelte
 * plugin is deliberately absent from `vitest.config.ts` — which is why the logic
 * lives in `draft.svelte.ts` and this file can reach it.
 */

import type { Operation } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import {
  activeLayer,
  draftDiffers,
  draftFile,
  fromOperation,
  isComplete,
  newDraft,
  retarget,
  shadowConfig,
  STEPS,
  toOperation,
  toShadowOperation,
  type Draft,
} from "./draft.svelte.js";

const numeric: Operation = {
  id: "op3",
  salt: 7,
  reseedOnLoad: false,
  selection: [{ type: "checkerboard", parity: 1 }],
  source: { type: "random" },
  target: "opacity",
  mapping: { range: [0.25, 0.75], steps: 4 },
  blend: "multiply",
};

const tileTargeted: Operation = {
  id: "op9",
  salt: 0,
  reseedOnLoad: true,
  selection: [{ type: "all" }],
  source: { type: "random" },
  target: "tileId",
  mapping: { palette: [{ tileId: "t1", weight: 2 }, { tileId: null, weight: 1 }] },
  blend: "set",
};

describe("STEPS", () => {
  it("walks Selection, Pattern, Attribute, Blend, starting at Selection", () => {
    // The Pattern decides what the mapping means, so it is asked first (Pol, T0).
    expect(STEPS).toEqual(["selection", "source", "attribute", "blend"]);
    expect(newDraft("op1").step).toBe("selection");
  });
});

describe("fromOperation", () => {
  it("round-trips a numeric Operation unchanged", () => {
    expect(toOperation(fromOperation(numeric))).toEqual(numeric);
  });

  it("round-trips a tile-targeted Operation unchanged", () => {
    expect(toOperation(fromOperation(tileTargeted))).toEqual(tileTargeted);
  });

  /** §4.3 — the id survives, and with it the Operation's hash channels. */
  it("keeps the id", () => {
    expect(fromOperation(numeric).id).toBe("op3");
  });

  /**
   * §8.3's reroll is a gesture on the stack row, not a step of the workflow, so
   * an edit must carry the salt through. Writing 0 here would silently undo a
   * reroll on every parameter change.
   */
  it("carries salt and reseedOnLoad through", () => {
    expect(fromOperation(numeric).salt).toBe(7);
    expect(fromOperation(tileTargeted).reseedOnLoad).toBe(true);
  });

  /** Both are optional in the file (`06` §5.1); absent reads as the default. */
  it("reads an absent salt and flag as 0 and false", () => {
    const { salt: _s, reseedOnLoad: _r, ...bare } = numeric;
    const draft = fromOperation(bare as Operation);
    expect(draft.salt).toBe(0);
    expect(draft.reseedOnLoad).toBe(false);
  });

  /** `06` §7.1 spreads parameters as siblings of `type`; this is that undone. */
  it("un-spreads parameters out of the type", () => {
    const draft = fromOperation(numeric);
    expect(draft.layers[0]!.type).toBe("checkerboard");
    expect(draft.layers[0]!.params).toEqual({ parity: 1 });
    expect(draft.sourceType).toBe("random");
    expect(draft.sourceParams).toEqual({});
  });

  /**
   * **C8** — the mapping's kind is the Target's. The slot the Target does not
   * select holds `newDraft`'s value, so retargeting mid-edit finds a legal
   * mapping waiting rather than one `isComplete` rejects.
   */
  it("seeds the unused mapping slot from a fresh draft", () => {
    const fresh = newDraft("op3");
    expect(fromOperation(numeric).palette).toEqual(fresh.palette);
    expect(fromOperation(tileTargeted).numeric).toEqual(fresh.numeric);
  });

  /**
   * The draft is mutated in place by the controls and the brush. Sharing a
   * container with the file would let a control edit `session.file` with no
   * transition — **E3** and **E6** both defeated by an assignment.
   */
  it("copies every container rather than aliasing the Operation", () => {
    const draft = fromOperation(tileTargeted);
    draft.palette[0]!.weight = 99;
    draft.layers[0]!.params.parity = 0;
    expect(tileTargeted.mapping).toEqual({
      palette: [{ tileId: "t1", weight: 2 }, { tileId: null, weight: 1 }],
    });
    expect(tileTargeted.selection).toEqual([{ type: "all" }]);

    const other = fromOperation(numeric);
    other.numeric.range[0] = -1;
    expect(numeric.mapping).toEqual({ range: [0.25, 0.75], steps: 4 });
  });

  /** A draft built from a legal Operation is whole by construction. */
  it("is complete immediately", () => {
    expect(isComplete(fromOperation(numeric))).toBe(true);
    expect(isComplete(fromOperation(tileTargeted))).toBe(true);
  });
});

describe("toShadowOperation", () => {
  /**
   * `selection()` reaches `salt` through `operationCtx`, whose closure **O4**
   * fixes. An edit-draft's shadow carrying 0 would draw a `random` Selection's
   * overlay against a salt the committed Operation does not have.
   */
  it("carries the real salt, not a placeholder", () => {
    expect(toShadowOperation(fromOperation(numeric))?.salt).toBe(7);
  });

  it("is null before a Selection type is chosen", () => {
    expect(toShadowOperation(newDraft("op1"))).toBeNull();
  });
});

describe("draftDiffers", () => {
  it("leaves a fresh create-draft unchanged until a step is answered", () => {
    const draft = newDraft("op1");
    expect(draftDiffers(draft, null)).toBe(false);
    draft.layers[0]!.type = "all";
    expect(draftDiffers(draft, null)).toBe(true);
  });

  it("sees no change in a reopened Operation, whatever step is open", () => {
    const draft = fromOperation(numeric);
    draft.step = "blend";
    expect(draftDiffers(draft, numeric)).toBe(false);
    expect(draftDiffers(fromOperation(tileTargeted), tileTargeted)).toBe(false);
  });

  it("sees an edited parameter, a new Blend and a new salt", () => {
    const params = fromOperation(numeric);
    params.layers[0]!.params.parity = 0;
    expect(draftDiffers(params, numeric)).toBe(true);

    const blend = fromOperation(numeric);
    blend.blend = "set";
    expect(draftDiffers(blend, numeric)).toBe(true);

    const salt = fromOperation(numeric);
    salt.salt += 1;
    expect(draftDiffers(salt, numeric)).toBe(true);
  });

  it("ignores a retarget there and back, since the unused mapping never commits", () => {
    const draft = fromOperation(tileTargeted);
    retarget(draft, "opacity");
    retarget(draft, "tileId");
    expect(draftDiffers(draft, tileTargeted)).toBe(false);
  });

  it("counts an edit made incomplete as a change", () => {
    const draft = fromOperation(tileTargeted);
    draft.palette = [];
    expect(draftDiffers(draft, tileTargeted)).toBe(true);
  });
});

describe("Constant with Tile (T0)", () => {
  const palette = [
    { tileId: "t0", weight: 0 },
    { tileId: "t1", weight: 2 },
    { tileId: "t2", weight: 1 },
  ];
  const constant: Operation = {
    ...tileTargeted,
    source: { type: "constant" },
    mapping: { palette: [{ tileId: "t1", weight: 1 }] },
  };

  it("saves only the entry t = 0 lands on, the first with a weight", () => {
    const draft = fromOperation({ ...tileTargeted, mapping: { palette } });
    draft.sourceType = "constant";
    draft.sourceParams = {};
    expect(toOperation(draft)?.mapping).toEqual({ palette: [{ tileId: "t1", weight: 1 }] });
  });

  it("keeps the whole list in the draft, so switching back before Save restores it", () => {
    const draft = fromOperation({ ...tileTargeted, mapping: { palette } });
    draft.sourceType = "constant";
    draft.sourceType = "valueNoise";
    draft.sourceParams = { cellsPerFeature: 5, octaves: 2 };
    expect(toOperation(draft)?.mapping).toEqual({ palette });
  });

  it("reopens a saved Constant operation unchanged", () => {
    expect(draftDiffers(fromOperation(constant), constant)).toBe(false);
  });

  it("opens a file's multi-entry palette under constant on its first non-zero entry", () => {
    const old: Operation = { ...constant, mapping: { palette } };
    const draft = fromOperation(old);
    expect(draft.palette).toEqual(palette);
    expect(toOperation(draft)?.mapping).toEqual({ palette: [{ tileId: "t1", weight: 1 }] });
  });

  it("leaves a numeric mapping alone, whose collapse is the control's", () => {
    const draft = fromOperation({ ...numeric, source: { type: "constant" } });
    expect(toOperation(draft)?.mapping).toEqual(numeric.mapping);
  });
});

describe("shadowConfig", () => {
  const config = { ...newDocument().config, operations: [tileTargeted] };

  it("appends a create-draft and replaces an edit-draft by id", () => {
    const created = newDraft("op1");
    created.layers[0]!.type = "all";
    expect(shadowConfig(config, created)?.config.operations.map((o) => o.id)).toEqual(["op9", "op1"]);

    const edited = fromOperation(tileTargeted);
    edited.layers[0]!.type = "checkerboard";
    edited.layers[0]!.params = { parity: 0 };
    const ops = shadowConfig(config, edited)!.config.operations;
    expect(ops).toHaveLength(1);
    expect(ops[0]!.selection[0]!.type).toBe("checkerboard");
  });

  it("carries the draft's own Pattern, which coverage evaluates", () => {
    const draft = fromOperation(tileTargeted);
    draft.sourceType = "gradient";
    draft.sourceParams = { angle: 45 };
    expect(shadowConfig(config, draft)?.config.operations[0]!.source).toEqual({ type: "gradient", angle: 45 });
  });

  it("is null before a Selection type is chosen", () => {
    expect(shadowConfig(config, newDraft("op1"))).toBeNull();
  });
});

describe("draftFile", () => {
  const file = { ...newDocument(), config: { ...newDocument().config, operations: [numeric, tileTargeted] } };

  /** A complete create-draft: what "Add" would append. */
  const created = (): Draft => fromOperation({ ...tileTargeted, id: "op1" });

  it("appends a create-draft, as Add does", () => {
    const drawn = draftFile(file, created())!;
    expect(drawn.config.operations.map((o) => o.id)).toEqual([numeric.id, "op9", "op1"]);
  });

  it("replaces an edit-draft in place, keeping its index", () => {
    const edited = fromOperation(numeric);
    edited.blend = "set";
    const ops = draftFile(file, edited)!.config.operations;
    expect(ops.map((o) => o.id)).toEqual([numeric.id, "op9"]);
    expect(ops[0]).toEqual(toOperation(edited));
  });

  it("is null while the draft cannot paint", () => {
    const draft = created();
    draft.palette = [];
    expect(draftFile(file, draft)).toBeNull();
    expect(draftFile(file, newDraft("op1"))).toBeNull();
  });

  it("draws what Save writes: one entry under Constant", () => {
    const draft = created();
    draft.sourceType = "constant";
    draft.sourceParams = {};
    expect(draftFile(file, draft)!.config.operations.at(-1)!.mapping).toEqual({
      palette: [{ tileId: "t1", weight: 1 }],
    });
  });

  it("changes only the operations, so the preview's shape is the saved file's", () => {
    // App measures the frame and overlays from the saved file while a draft is
    // drawn; that is right only while nothing but `operations` differs.
    const drawn = draftFile(file, created())!;
    for (const key of Object.keys(file) as (keyof typeof file)[]) {
      if (key !== "config") expect(drawn[key]).toBe(file[key]);
    }
    for (const key of Object.keys(file.config) as (keyof typeof file.config)[]) {
      if (key !== "operations") expect(drawn.config[key]).toBe(file.config[key]);
    }
  });

  it("never writes to the file it is given (E3)", () => {
    const before = JSON.stringify(file);
    draftFile(file, created());
    expect(JSON.stringify(file)).toBe(before);
  });
});

describe("selection layers (B-033)", () => {
  const layered: Operation = {
    ...numeric,
    selection: [
      { type: "cellList", cells: [[1, 1], [2, 2]] },
      { type: "random", density: 0.3 },
      { type: "rect", x: 0, y: 0, width: 2, height: 2 },
    ],
  };

  it("round-trips one layer and three, in order", () => {
    expect(toOperation(fromOperation(numeric))!.selection).toEqual(numeric.selection);
    const draft = fromOperation(layered);
    expect(draft.layers.map((l) => l.type)).toEqual(["cellList", "random", "rect"]);
    expect(draft.activeLayer).toBe(0);
    expect(toOperation(draft)!.selection).toEqual(layered.selection);
  });

  it("copies nested layer data, so painting a layer never edits the file", () => {
    const draft = fromOperation(layered);
    (draft.layers[0]!.params.cells as number[][]).push([9, 9]);
    (draft.layers[0]!.params.cells as number[][])[0]![0] = 5;
    draft.layers[1]!.params.density = 1;
    expect(layered.selection[0]).toEqual({ type: "cellList", cells: [[1, 1], [2, 2]] });
    expect(layered.selection[1]).toEqual({ type: "random", density: 0.3 });
  });

  it("edits through the active layer, never a copy", () => {
    const draft = fromOperation(layered);
    draft.activeLayer = 2;
    activeLayer(draft).params.width = 5;
    expect(draft.layers[2]!.params.width).toBe(5);
  });

  it("is incomplete while any layer has no type, but the shadow shows the typed ones", () => {
    const draft = fromOperation(layered);
    draft.layers.push({ type: null, params: {} });
    expect(isComplete(draft)).toBe(false);
    expect(toOperation(draft)).toBeNull();
    expect(toShadowOperation(draft)!.selection).toEqual(layered.selection);
  });

  it("has no shadow until some layer has a type", () => {
    expect(toShadowOperation(newDraft("op1"))).toBeNull();
  });
});
