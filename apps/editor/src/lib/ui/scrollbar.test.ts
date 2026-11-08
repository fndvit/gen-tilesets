import { describe, expect, it } from "vitest";
import { scrollForDrag, thumbFor } from "./scrollbar.js";

describe("thumbFor", () => {
  it("has no handle when the content fits", () => {
    expect(thumbFor(500, 500, 0, 24)).toEqual({ size: 0, offset: 0 });
    expect(thumbFor(500, 300, 0, 24)).toEqual({ size: 0, offset: 0 });
    expect(thumbFor(0, 300, 0, 24)).toEqual({ size: 0, offset: 0 });
  });

  it("sizes the handle to the visible share", () => {
    expect(thumbFor(500, 1000, 0, 24).size).toBe(250);
  });

  it("never makes the handle shorter than the minimum", () => {
    expect(thumbFor(500, 100_000, 0, 24).size).toBe(24);
  });

  it("travels from the top to the bottom of the track", () => {
    expect(thumbFor(500, 1000, 0, 24).offset).toBe(0);
    expect(thumbFor(500, 1000, 250, 24).offset).toBe(125);
    expect(thumbFor(500, 1000, 500, 24).offset).toBe(250);
  });

  it("clamps an overscrolled top", () => {
    expect(thumbFor(500, 1000, 900, 24).offset).toBe(250);
    expect(thumbFor(500, 1000, -20, 24).offset).toBe(0);
  });
});

describe("scrollForDrag", () => {
  it("maps handle movement back to scroll", () => {
    // Travel 250px covers 500px of scroll.
    expect(scrollForDrag(500, 1000, 0, 125, 24)).toBe(250);
  });

  it("clamps to the ends", () => {
    expect(scrollForDrag(500, 1000, 400, 1000, 24)).toBe(500);
    expect(scrollForDrag(500, 1000, 100, -1000, 24)).toBe(0);
  });

  it("does nothing when the content fits", () => {
    expect(scrollForDrag(500, 400, 0, 50, 24)).toBe(0);
  });
});
