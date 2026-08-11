/**
 * The draft's Blend — `09-editor.md` §7.7, `04` §7.2, ADR-001.
 *
 * What is asserted here is the **inversion**, not the five rows. `04` §7.2's
 * table is the package's, tested in `packages/tileset`; these are the editor's
 * two obligations against it:
 *
 * 1. every Target arrives with its declared default, so §7.7's "show the default
 *    Blend" has something to show;
 * 2. a `(target, blend)` pair outside the accepted set is never reachable, which
 *    is **O7** held by **E5** rather than by validation.
 */

import { acceptedBlends, blends, TARGETS, type TargetName } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { isComplete, newDraft, retarget, toOperation } from "./draft.svelte.js";

const filled = () => {
  const draft = newDraft("op1");
  draft.selectionType = "all";
  draft.sourceType = "random";
  return draft;
};

describe("the Blend a Target arrives with — 09 §7.7", () => {
  it("is null before any Target, because a Blend belongs to a Target", () => {
    expect(newDraft("op1").blend).toBeNull();
  });

  it.each(Object.keys(TARGETS) as TargetName[])(
    "is %s's declared default — 04 §7.2's table, not a guess",
    (target) => {
      const draft = newDraft("op1");
      retarget(draft, target);
      expect(draft.blend).toBe(TARGETS[target].default);
    },
  );

  it("leaves the four steps' other three unanswered — Q7's no-invented-default", () => {
    // The Blend is the one step a Target answers for the author, because the
    // spec supplies its default and supplies none for the others.
    const draft = newDraft("op1");
    retarget(draft, "opacity");
    expect(draft.selectionType).toBeNull();
    expect(draft.sourceType).toBeNull();
    expect(isComplete(draft)).toBe(false);
  });
});

describe("retargeting cannot strand a Blend — O7", () => {
  it("keeps a Blend the new Target still accepts", () => {
    const draft = filled();
    retarget(draft, "scaleX");
    draft.blend = "multiply";
    retarget(draft, "opacity");
    expect(draft.blend).toBe("multiply");
  });

  it("falls back to the default when the new Target vetoes it — 04 §7.2", () => {
    // `multiply` on `rotation` is arithmetically defined and has no authoring
    // meaning under a wrapping domain, so it is vetoed rather than left a trap.
    const draft = filled();
    retarget(draft, "scaleY");
    draft.blend = "multiply";
    retarget(draft, "rotation");
    expect(draft.blend).toBe("set");
  });

  it("falls back when the new Target's type accepts nothing else", () => {
    const draft = filled();
    retarget(draft, "opacity");
    draft.blend = "add";
    retarget(draft, "tileId");
    // `add` on a tile palette is meaningless — no Blend but `set` accepts the
    // tile type.
    expect(draft.blend).toBe("set");
    expect(acceptedBlends("tileId")).toEqual(["set"]);
  });
});

describe("the completeness gate checks the pair — 06 §7", () => {
  it("refuses a Blend outside the Target's accepted set", () => {
    const draft = filled();
    retarget(draft, "rotation");
    // Not reachable from any gesture the editor has; asserted because this is
    // the gate standing between the draft and a file, not a second opinion.
    draft.blend = "multiply";
    expect(isComplete(draft)).toBe(false);
    expect(toOperation(draft)).toBeNull();
  });

  it("refuses an unregistered Blend", () => {
    const draft = filled();
    retarget(draft, "scaleX");
    draft.blend = "overlay";
    expect(isComplete(draft)).toBe(false);
  });

  it("carries the Blend into the Operation", () => {
    const draft = filled();
    retarget(draft, "scaleX");
    draft.blend = "add";
    expect(toOperation(draft)!.blend).toBe("add");
  });
});

describe("the accepted set is derived, never listed — ADR-001", () => {
  /**
   * **Registers into the shared registry, so this block is deliberately last.**
   *
   * There is no `unregister`, and that is `05` §5's design rather than an
   * omission: "there is no public registration API", so a registration is a
   * source file and a commit. The same shape as `packages/tileset`'s own X2
   * test, which is last in its file for the same reason.
   */
  it("offers a later-registered Blend on every numeric Target at once", () => {
    // The editor holds no table, so a Blend registered after it was written
    // reaches the control with nothing edited here. §7.7 names the opposite as
    // the failure: "an editor holding its own table would be the thing that
    // failed to notice."
    blends.register({ name: "__test_screen", params: {}, accepts: ["numeric"], impl: (v) => v });

    expect(acceptedBlends("scaleX")).toContain("__test_screen");
    // X2's obligation from the other side: the tile type is unaffected, so
    // `tileId` still shows no control at all.
    expect(acceptedBlends("tileId")).toEqual(["set"]);

    const draft = filled();
    retarget(draft, "scaleX");
    draft.blend = "__test_screen";
    expect(isComplete(draft)).toBe(true);
  });
});
