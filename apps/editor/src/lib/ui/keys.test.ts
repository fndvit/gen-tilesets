import { describe, expect, it } from "vitest";
import { rovingIndex, sliderStep } from "./keys.js";

describe("rovingIndex", () => {
  it("wraps Left and Right", () => {
    expect(rovingIndex("ArrowRight", 2, 3)).toBe(0);
    expect(rovingIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(rovingIndex("ArrowRight", 0, 3)).toBe(1);
  });

  it("treats Up and Down as Left and Right in a single row", () => {
    expect(rovingIndex("ArrowDown", 2, 3)).toBe(0);
    expect(rovingIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("moves by a row in a grid and stops at the edge", () => {
    // 7 cells in rows of 5: 0-4, 5-6.
    expect(rovingIndex("ArrowDown", 1, 7, 5)).toBe(6);
    expect(rovingIndex("ArrowDown", 4, 7, 5)).toBe(6);
    expect(rovingIndex("ArrowDown", 6, 7, 5)).toBe(6);
    expect(rovingIndex("ArrowUp", 6, 7, 5)).toBe(1);
    expect(rovingIndex("ArrowUp", 3, 7, 5)).toBe(0);
  });

  it("jumps to the ends with Home and End", () => {
    expect(rovingIndex("Home", 3, 5)).toBe(0);
    expect(rovingIndex("End", 0, 5)).toBe(4);
  });

  it("returns null for keys the group does not handle, and for an empty group", () => {
    expect(rovingIndex("Enter", 0, 3)).toBeNull();
    expect(rovingIndex("Tab", 0, 3)).toBeNull();
    expect(rovingIndex("ArrowRight", 0, 0)).toBeNull();
  });
});

describe("sliderStep", () => {
  it("is the step, or ten steps with Shift", () => {
    expect(sliderStep(0.01, false)).toBe(0.01);
    expect(sliderStep(0.01, true)).toBeCloseTo(0.1);
  });
});
