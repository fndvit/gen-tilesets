/**
 * The reference image's geometry — the two numbers the preview frame lays out
 * from.
 *
 * `loadReference` is not tested here: it is `URL.createObjectURL` plus
 * `measure`, both of which need a DOM and a decoder, and `measure`'s refusals
 * are **E13**'s and belong to the asset store. What is testable is the part the
 * frame depends on being exactly right — that the picture keeps its aspect ratio
 * at every `Wpx`, and that the viewport reserves the whole of it.
 */

import { describe, expect, it } from "vitest";
import { frameExtent, layerHeight, type Reference } from "./reference.js";

const shot: Reference = { url: "blob:x", name: "home.png", width: 1440, height: 3200 };

describe("layerHeight", () => {
  it("is the intrinsic height at the image's own width", () => {
    expect(layerHeight(1440, shot)).toBe(3200);
  });

  it("keeps the aspect ratio at any other width", () => {
    expect(layerHeight(720, shot)).toBe(1600);
    expect(layerHeight(360, shot)).toBe(800);
  });

  it("is zero for a reference with no width, rather than infinite", () => {
    expect(layerHeight(1440, { ...shot, width: 0 })).toBe(0);
  });
});

describe("frameExtent", () => {
  it("is the render box alone when there is no image", () => {
    expect(frameExtent(500, 0, 0)).toEqual({ top: 0, bottom: 500 });
  });

  it("reaches past the render box for a taller image", () => {
    expect(frameExtent(500, 3200, 0)).toEqual({ top: 0, bottom: 3200 });
  });

  it("keeps the render box's own bottom when the image is shorter", () => {
    expect(frameExtent(500, 200, 0)).toEqual({ top: 0, bottom: 500 });
  });

  it("follows a positive offset down", () => {
    expect(frameExtent(500, 200, 900)).toEqual({ top: 0, bottom: 1100 });
  });

  /** The case the translate exists for: without it this is clipped away. */
  it("opens room above for a negative offset", () => {
    expect(frameExtent(500, 3200, -1200)).toEqual({ top: -1200, bottom: 2000 });
  });

  it("never reports a top below the render box's own", () => {
    expect(frameExtent(500, 100, 50).top).toBe(0);
  });
});
