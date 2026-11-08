import { describe, expect, it } from "vitest";
import { STEPS } from "../../draft.svelte.js";
import { STEP_LABELS } from "../operations/labels.js";
import { OPERATIONS_EXPLAINER } from "./operations-explainer.js";

describe("OPERATIONS_EXPLAINER", () => {
  it("explains each step of an operation, in order, named as the card names it", () => {
    expect(OPERATIONS_EXPLAINER.params.map((p) => p.name)).toEqual(STEPS.map((s) => STEP_LABELS[s]));
  });

  it("has no measured figures, so the popover draws no bars", () => {
    expect(OPERATIONS_EXPLAINER.shares).toEqual([]);
  });

  it("says that a later tile operation draws a rotated cell rotated (B-010)", () => {
    expect(OPERATIONS_EXPLAINER.advice).toMatch(/new tile is drawn rotated/);
  });
});
