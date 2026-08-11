import { applyNumericMapping, ATTRIBUTES, type AttributeName } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { isComplete, mappingOf, newDraft, retarget, toOperation } from "../draft.svelte.js";
import {
  admitsTyped,
  defaultNumericMapping,
  endpointsCoincide,
  isTileTarget,
  MIN_STEPS,
  TRACKS,
  trackFor,
} from "./mapping.js";

const ATTRS: AttributeName[] = ["scaleX", "scaleY", "rotation", "opacity"];

describe("authoring ranges — 09 §7.5, resolving 03 Q4", () => {
  it("matches §7.5's table", () => {
    expect(TRACKS.scaleX).toMatchObject({ min: -2, max: 2, soft: true });
    expect(TRACKS.scaleY).toMatchObject({ min: -2, max: 2, soft: true });
    expect(TRACKS.rotation).toMatchObject({ min: 0, max: 360, soft: false, wraps: true });
    expect(TRACKS.opacity).toMatchObject({ min: 0, max: 1, soft: false });
  });

  it("reaches the negative half on scale, or flip is unreachable by dragging", () => {
    // 03 §5.4 makes flip a negative value rather than a boolean, so §7.5 calls
    // the negative half "load-bearing rather than symmetric".
    expect(TRACKS.scaleX.min).toBeLessThan(0);
    expect(TRACKS.scaleY.min).toBeLessThan(0);
  });

  it("widens a soft track to contain a typed value, and never clamps it", () => {
    // "A typed `4` widens the track; it is not rewritten to `2`."
    const widened = trackFor("scaleX", [-3, 4]);
    expect(widened.min).toBe(-3);
    expect(widened.max).toBe(4);
    expect(admitsTyped("scaleX", 4)).toBe(true);
    expect(admitsTyped("scaleX", -50)).toBe(true);
  });

  it("does not widen a hard track", () => {
    expect(trackFor("opacity", [0, 5])).toMatchObject({ min: 0, max: 1 });
    expect(trackFor("rotation", [0, 900])).toMatchObject({ min: 0, max: 360 });
  });

  it("bounds typed entry only on opacity — its domain is bounded (03 §5.4)", () => {
    expect(admitsTyped("opacity", 1)).toBe(true);
    expect(admitsTyped("opacity", 1.2)).toBe(false);
    expect(admitsTyped("opacity", -0.1)).toBe(false);
    // rotation takes any finite number and wraps (D5).
    expect(admitsTyped("rotation", 900)).toBe(true);
    expect(admitsTyped("rotation", -90)).toBe(true);
  });

  it("rejects non-finite input everywhere — 03 D6", () => {
    for (const attr of ATTRS) {
      expect(admitsTyped(attr, Number.NaN)).toBe(false);
      expect(admitsTyped(attr, Number.POSITIVE_INFINITY)).toBe(false);
    }
  });
});

describe("a new numeric mapping is a no-op", () => {
  it("uses the attribute's own declared default at both ends — 03 D4", () => {
    for (const attr of ATTRS) {
      const mapping = defaultNumericMapping(attr);
      expect(mapping.range).toEqual([ATTRIBUTES[attr].default, ATTRIBUTES[attr].default]);
    }
  });

  it("omits `steps`, because its absence is a meaning — 06 §5.1", () => {
    // "`steps` is the odd row: its absence is a *meaning*, not a default value."
    expect("steps" in defaultNumericMapping("rotation")).toBe(false);
  });

  it("writes each cell the value it already had, whatever the Source returns", () => {
    for (const attr of ATTRS) {
      const mapping = defaultNumericMapping(attr);
      for (const t of [0, 0.25, 0.5, 0.99]) {
        expect(applyNumericMapping(mapping, t)).toBe(ATTRIBUTES[attr].default);
      }
    }
  });
});

describe("the rotation gotcha — 09 §7.4, 04 §6.2, §12.2 advisory 9", () => {
  it("flags a stepped range whose endpoints coincide modulo 360", () => {
    // "[0, 360] with steps: 4 yields 0, 120, 240, 360 and 360 wraps to 0 --
    // three distinct rotations, one twice as likely."
    expect(endpointsCoincide("rotation", { range: [0, 360], steps: 4 })).toBe(true);
    expect(endpointsCoincide("rotation", { range: [90, 450], steps: 3 })).toBe(true);
  });

  it("does not flag the correct quarter turns", () => {
    // "Quarter turns are [0, 270] with steps: 4."
    expect(endpointsCoincide("rotation", { range: [0, 270], steps: 4 })).toBe(false);
  });

  it("does not flag a continuous mapping, or a non-wrapping Target", () => {
    // A continuous mapping never attains `max` (t < 1 strictly), so the
    // duplicate endpoint is unreachable and there is nothing to warn about.
    expect(endpointsCoincide("rotation", { range: [0, 360] })).toBe(false);
    expect(endpointsCoincide("scaleX", { range: [0, 360], steps: 4 })).toBe(false);
  });

  it("confirms the arithmetic the advisory describes", () => {
    const bad = { range: [0, 360] as [number, number], steps: 4 };
    const values = [0.1, 0.3, 0.6, 0.9].map((t) => applyNumericMapping(bad, t));
    expect(values).toEqual([0, 120, 240, 360]);
    // 360 wraps to 0 under D5, so `0` lands on two of the four bands.
    const good = { range: [0, 270] as [number, number], steps: 4 };
    expect([0.1, 0.3, 0.6, 0.9].map((t) => applyNumericMapping(good, t))).toEqual([0, 90, 180, 270]);
  });
});

describe("the draft's mapping — 06 C8", () => {
  it("discriminates the mapping shape by `target`, with no kind tag", () => {
    const draft = newDraft("op1");
    retarget(draft, "tileId");
    expect(mappingOf(draft)).toHaveProperty("palette");
    expect(mappingOf(draft)).not.toHaveProperty("range");

    retarget(draft, "rotation");
    expect(mappingOf(draft)).toHaveProperty("range");
    expect(mappingOf(draft)).not.toHaveProperty("palette");
  });

  it("knows which Targets take a palette, from the package's table", () => {
    expect(isTileTarget("tileId")).toBe(true);
    for (const attr of ATTRS) expect(isTileTarget(attr)).toBe(false);
  });

  it("rebuilds the numeric mapping from the new Target's default", () => {
    const draft = newDraft("op1");
    retarget(draft, "opacity");
    expect(draft.numeric.range).toEqual([1, 1]);
    retarget(draft, "rotation");
    expect(draft.numeric.range).toEqual([0, 0]);
  });

  it("keeps both shapes so changing the Target does not discard the palette", () => {
    const draft = newDraft("op1");
    retarget(draft, "tileId");
    draft.palette = [{ tileId: "t1", weight: 2 }, { tileId: null, weight: 1 }];
    retarget(draft, "scaleX");
    retarget(draft, "tileId");
    expect(draft.palette).toHaveLength(2);
  });
});

describe("completeness — E5's gate before anything reaches the file", () => {
  const filled = () => {
    const draft = newDraft("op1");
    draft.selectionType = "all";
    draft.sourceType = "random";
    draft.blend = "set";
    return draft;
  };

  it("is incomplete until every step has an answer — no default is invented", () => {
    const draft = newDraft("op1");
    expect(isComplete(draft)).toBe(false);
    expect(toOperation(draft)).toBeNull();
  });

  it("is complete once the four steps are answered", () => {
    const draft = filled();
    retarget(draft, "rotation");
    expect(isComplete(draft)).toBe(true);
  });

  it("refuses a palette whose weights sum to zero — 06 §7.3", () => {
    // 04 §6.3's walk is strict, so nothing could ever win it.
    const draft = filled();
    retarget(draft, "tileId");
    draft.palette = [{ tileId: "t1", weight: 0 }];
    expect(isComplete(draft)).toBe(false);
  });

  it("refuses an empty palette — 06 §7.3 requires at least one entry", () => {
    const draft = filled();
    retarget(draft, "tileId");
    draft.palette = [];
    expect(isComplete(draft)).toBe(false);
  });

  it("starts with a legal palette even when the library is empty", () => {
    // `null` is a legal entry meaning *clear this cell*, so a document with no
    // Tiles can still build a tileId Operation (04 §6.3, 02 §8.1).
    const draft = filled();
    retarget(draft, "tileId");
    expect(isComplete(draft)).toBe(true);
    expect(draft.palette[0]!.tileId).toBeNull();
  });

  it("builds an Operation whose parameters are spread siblings of `type` — 06 §7.1", () => {
    const draft = filled();
    draft.selectionType = "everyNth";
    draft.selectionParams = { axis: "column", n: 3, offset: 0 };
    retarget(draft, "scaleX");
    const op = toOperation(draft)!;
    expect(op.selection).toEqual({ type: "everyNth", axis: "column", n: 3, offset: 0 });
    expect(op.id).toBe("op1");
    expect(op.mapping).toEqual({ range: [1, 1] });
  });

  it("writes salt and reseedOnLoad explicitly — 09 §11.3", () => {
    const draft = filled();
    retarget(draft, "opacity");
    const op = toOperation(draft)!;
    expect(op.salt).toBe(0);
    expect(op.reseedOnLoad).toBe(false);
  });
});

describe("steps — 06 §7.3", () => {
  it("requires at least 2, because the formula divides by steps - 1", () => {
    expect(MIN_STEPS).toBe(2);
  });

  it("attains both ends when stepped, which is why flip needs it — 04 §6.2", () => {
    const flip = { range: [-1, 1] as [number, number], steps: 2 };
    expect(applyNumericMapping(flip, 0.1)).toBe(-1);
    expect(applyNumericMapping(flip, 0.9)).toBe(1);
    // Continuous [-1, 1] would produce values near 0 -- "tiles scaled to
    // invisibility -- which is never what 'flip half of them' meant".
    expect(applyNumericMapping({ range: [-1, 1] }, 0.5)).toBe(0);
  });
});
