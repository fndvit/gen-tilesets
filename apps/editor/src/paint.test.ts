/**
 * The brush — `09-editor.md` §7.3, `07` §8.2.
 *
 * `07` §8.2 names the client-to-render-space conversion "the single most likely
 * place to get this wrong", which is the whole reason `paint.ts` keeps it as a
 * function of a plain record rather than of an element.
 *
 * What is **not** tested here is `cellAt` itself: `08` **S10** exports it and
 * `07` **R15** covers it with the geometry vector table. These tests are about
 * the two things the editor owns — the conversion into its input space, and
 * §7.3's bound on its output.
 */

import type { GridGeometry } from "@fndvit/gen-tilesets/render";
import type { Layout } from "@fndvit/gen-tilesets";
import { describe, expect, it } from "vitest";
import {
  addCell,
  cellUnder,
  hasCell,
  removeCell,
  strandedCells,
  toRenderSpace,
  type BoxMetrics,
} from "./paint.js";

const layout: Layout = {
  cellSize: 100,
  referenceWidth: 1000,
  yOffset: 0,
  horizontalAlignment: "gutter",
};

/** `s = 1000 / 1000 = 1`, no bleed, so render px are design px and the sums are readable. */
const g: GridGeometry = { layout, rows: 5, columns: 10, Wpx: 1000 };

/** Unzoomed: the box is on screen at exactly its laid-out width. */
const box = (over: Partial<BoxMetrics> = {}): BoxMetrics => ({
  clientLeft: 0,
  clientTop: 0,
  clientWidth: 1000,
  layoutWidth: 1000,
  ...over,
});

describe("client coordinates to render space — 07 §8.2", () => {
  it("subtracts the box's position, so the space is relative to its top-left", () => {
    const metrics = box({ clientLeft: 120, clientTop: 40 });
    expect(toRenderSpace(metrics, 120, 40)).toEqual({ px: 0, py: 0 });
    expect(toRenderSpace(metrics, 420, 240)).toEqual({ px: 300, py: 200 });
  });

  it("undoes the display zoom, because a rect is post-transform and offsetWidth is not", () => {
    // The frame is laid out at Wpx = 1000 and scaled to 60% to fit the column
    // (`DECISIONS.md` D18).
    const metrics = box({ clientWidth: 600 });
    expect(toRenderSpace(metrics, 300, 150)).toEqual({ px: 500, py: 250 });
  });

  it("applies the same ratio vertically — the zoom is uniform (08 S8)", () => {
    const metrics = box({ clientWidth: 500, clientTop: 100 });
    expect(toRenderSpace(metrics, 0, 100).py).toBe(0);
    expect(toRenderSpace(metrics, 0, 350).py).toBe(500);
  });

  it("survives a zero-sized box, which is the state one frame after mount", () => {
    const metrics = box({ clientWidth: 0, layoutWidth: 0 });
    expect(toRenderSpace(metrics, 30, 40)).toEqual({ px: 30, py: 40 });
  });
});

describe("the cell under the pointer, bounded — 09 §7.3", () => {
  it("finds the cell the point falls in", () => {
    expect(cellUnder(g, box(), 550, 250)).toEqual([5, 2]);
  });

  it("puts a shared edge in the higher-indexed cell — R11, half-open", () => {
    expect(cellUnder(g, box(), 300, 200)).toEqual([3, 2]);
  });

  it("returns null outside the grid, because a painted cell there is unremovable by eye", () => {
    // §7.3's table: the brush bounds where the `rect` drag does not. `cellAt`
    // itself stays total and unbounded (`07` §8.2) — this is the call site.
    expect(cellUnder(g, box(), -10, 100)).toBeNull();
    expect(cellUnder(g, box(), 100, -10)).toBeNull();
    expect(cellUnder(g, box(), 1200, 100)).toBeNull();
    expect(cellUnder(g, box(), 100, 900)).toBeNull();
  });

  it("bounds against columns and rows, not against the render box", () => {
    // A bleeding grid extends past the box on both sides (`02` §7.2), so its
    // first and last columns are partly clipped by **R9** and partly visible.
    // The bound is the *grid's*, because §7.3's reason is that a painted cell
    // "can never be drawn, seen, or clicked to remove" — which is false of a
    // half-visible column and true of column 11.
    const bleeding: GridGeometry = { ...g, columns: 11 };
    // originX = (1000 - 1100) / 2 = -50, so column 10 spans render x 950..1050.
    expect(cellUnder(bleeding, box(), 990, 100)).toEqual([10, 1]);
    expect(cellUnder(bleeding, box(), 1060, 100)).toBeNull(); // column 11: absent
    expect(cellUnder(bleeding, box(), -40, 100)).toEqual([0, 1]); // clipped, still real
  });

  it("accounts for yOffset, because originY is negative and row 0 is clipped", () => {
    // `02` §7.4: yOffset shifts the grid up. originY = -0.5 * 100 = -50, so the
    // top of the box is halfway down row 0.
    const shifted: GridGeometry = { ...g, layout: { ...layout, yOffset: 0.5 } };
    expect(cellUnder(shifted, box(), 50, 0)).toEqual([0, 0]);
    expect(cellUnder(shifted, box(), 50, 60)).toEqual([0, 1]);
  });

  it("converts through the zoom before bounding, not after", () => {
    // The failure this guards: at 60% zoom a click at screen x=300 is render
    // x=500, cell 5. Skipping the conversion gives cell 3 — wrong at every zoom
    // but 100%, which is the one an author is least often at.
    expect(cellUnder(g, box({ clientWidth: 600 }), 300, 150)).toEqual([5, 2]);
  });
});

describe("the list — 04 §4.4", () => {
  it("adds idempotently, so a drag re-entering a cell does not duplicate it", () => {
    // A duplicate is legal and invisible — the predicate is a membership test —
    // which is exactly why it must not accumulate.
    const once = addCell([], [2, 3]);
    expect(addCell(once, [2, 3])).toEqual([[2, 3]]);
  });

  it("removes by value, and removing an absent cell is a no-op", () => {
    expect(removeCell([[1, 1], [2, 2]], [1, 1])).toEqual([[2, 2]]);
    expect(removeCell([[1, 1]], [9, 9])).toEqual([[1, 1]]);
  });

  it("does not confuse (x, y) with (y, x)", () => {
    expect(hasCell([[1, 4]], [4, 1])).toBe(false);
    expect(hasCell([[1, 4]], [1, 4])).toBe(true);
  });

  it("never mutates its input — E5's whole-value discipline", () => {
    const cells: [number, number][] = [[0, 0]];
    addCell(cells, [1, 1]);
    removeCell(cells, [0, 0]);
    expect(cells).toEqual([[0, 0]]);
  });
});

describe("cells stranded by a design-width change — 09 §9.4", () => {
  it("names them rather than repairing them, because nothing is migrated", () => {
    // §9.4: "nothing is migrated, ever" — undo is the repair (**E6**). A
    // stranded cell is by definition one the author can no longer see or click.
    const cells: [number, number][] = [[0, 0], [9, 4], [10, 0], [0, 5]];
    expect(strandedCells(cells, 10, 5)).toEqual([[10, 0], [0, 5]]);
  });

  it("finds nothing while the grid contains every painted cell", () => {
    expect(strandedCells([[0, 0], [9, 4]], 10, 5)).toEqual([]);
  });
});
