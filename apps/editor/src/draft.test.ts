/**
 * The draft's two conversions — `09-editor.md` §4.2, §4.3; `DECISIONS.md` Q7.
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

import type { Operation } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { fromOperation, isComplete, newDraft, toOperation, toShadowOperation } from "./draft.svelte.js";

const numeric: Operation = {
  id: "op3",
  salt: 7,
  reseedOnLoad: false,
  selection: { type: "checkerboard", parity: 1 },
  source: { type: "random" },
  target: "opacity",
  mapping: { range: [0.25, 0.75], steps: 4 },
  blend: "multiply",
};

const tileTargeted: Operation = {
  id: "op9",
  salt: 0,
  reseedOnLoad: true,
  selection: { type: "all" },
  source: { type: "random" },
  target: "tileId",
  mapping: { palette: [{ tileId: "t1", weight: 2 }, { tileId: null, weight: 1 }] },
  blend: "set",
};

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
    expect(draft.selectionType).toBe("checkerboard");
    expect(draft.selectionParams).toEqual({ parity: 1 });
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
    draft.selectionParams.parity = 0;
    expect(tileTargeted.mapping).toEqual({
      palette: [{ tileId: "t1", weight: 2 }, { tileId: null, weight: 1 }],
    });
    expect(tileTargeted.selection).toEqual({ type: "all" });

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
