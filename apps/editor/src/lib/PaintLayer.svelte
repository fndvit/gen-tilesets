<!--
  The `cellList` brush — `09-editor.md` §7.3.

  > The author paints cells on the preview. Pointer events convert to render
  > space and then through `cellAt` (`07` §8.2, `08` **S10**), which the editor
  > never reimplements.

  ## What this layer is, and what it is not

  **Invariant S2** — the preview is `<Tileset>` on the editor's file, and
  overlays draw *over* that output, never instead of it. So this is a sibling
  pinned to the render box, and the picture underneath is untouched.

  **This layer draws no painted cells.** `SelectionOverlay` draws them, because
  **E7** admits exactly one kind of overlay and a `cellList`'s selected set is
  that overlay like any other Selection's — resolved through the package's
  `selection()` export (**E8**) rather than by reading back the list this just
  wrote. Two drawings of the same cells would be the drift **E8** exists to
  prevent, arrived at from inside a single component.

  So what is left here is the **gesture**: the pointer, the stroke, and a hover
  outline for the cell that would be affected. `cellAt` decides which cell that
  is (`07` §8.2), and the editor never reimplements it.
-->
<script lang="ts">
  import {
    cellPlacementPercent,
    naturalHeight,
    type GridGeometry,
  } from "@fndvit/gen-tilesets/render";
  import { addCell, cellUnder, hasCell, metricsOf, removeCell, type Cell } from "../paint.js";

  interface Props {
    g: GridGeometry;
    /** The render box element — `08` §7. Null until `<Tileset>` mounts. */
    box: HTMLElement | null;
    cells: Cell[];
    onChange: (cells: Cell[]) => void;
    /** The parameter's name, so the layer says which control it is writing. */
    param: string;
  }

  let { g, box, cells, onChange, param }: Props = $props();

  /** The cell under the pointer, for a hover outline. Purely a cursor. */
  let hovered = $state<Cell | null>(null);

  /**
   * A stroke.
   *
   * **`painting` is the mode the whole stroke keeps**, decided by the cell the
   * pointer went down on: down on an empty cell adds, down on a painted one
   * erases. A stroke that re-decided per cell would toggle every cell it crossed
   * and make a drag across a half-painted region unpredictable — the author would
   * be inverting rather than painting.
   *
   * Recorded in `DECISIONS.md` D25; §7.3 specifies the conversion and the bound and
   * says nothing about the gesture.
   */
  let stroke: { pointerId: number; painting: boolean } | null = null;

  function at(event: PointerEvent): Cell | null {
    // §7.3's bound, at the call site. `cellAt` itself stays unbounded because
    // `rect` needs the coordinates a drag actually reached (`07` §8.2).
    return box === null ? null : cellUnder(g, metricsOf(box), event.clientX, event.clientY);
  }

  function apply(cell: Cell, painting: boolean): void {
    // `addCell` is idempotent and `removeCell` is total, so a drag re-entering a
    // cell is a no-op rather than a toggle. The length is what changed or did
    // not; both helpers return a fresh array either way.
    const next = painting ? addCell(cells, cell) : removeCell(cells, cell);
    if (next.length !== cells.length) onChange(next);
  }

  function onPointerDown(event: PointerEvent): void {
    const cell = at(event);
    if (cell === null) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    stroke = { pointerId: event.pointerId, painting: !hasCell(cells, cell) };
    apply(cell, stroke.painting);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    const cell = at(event);
    hovered = cell;
    if (stroke === null || event.pointerId !== stroke.pointerId || cell === null) return;
    apply(cell, stroke.painting);
  }

  function onPointerUp(event: PointerEvent): void {
    if (stroke === null || event.pointerId !== stroke.pointerId) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    stroke = null;
  }

  /**
   * Percentages, so the overlay is correct at every `Wpx` with nothing to
   * recompute (`07` §5.3), and taken from **`cellPlacementPercent`** — the ideal
   * fractional geometry, which is where the cells actually land.
   *
   * **This reverted, and the reason is arithmetic rather than taste.** ADR-006
   * made the picture land on the device pixel grid, so an overlay drawn from
   * `cellBox` while the tiles were drawn from `snappedGrid` was §6.1's failure —
   * "the picture is right, the selection boxes are a few pixels off, and nothing
   * anywhere reports it" — and this file read the snapped edges to avoid it.
   *
   * The canvas substrate no longer presents its raster at the snapped width. It
   * presents it at the **ideal** one, and that scale cancels the quantisation
   * exactly. Presented edge `k`, in CSS px:
   *
   *     originX + (k * cellDev / dpr) * presentScale
   *       = originX + (k * cellDev / dpr) * (idealCell / cellDev)
   *       = originX + k * idealCell / dpr
   *       = originX + k * s * cellSize          === cellBox(g, k, .).left
   *
   * The snapping lives entirely inside the raster. So the ideal geometry is once
   * again where the cells are, `dpr` stops being something this file has to track,
   * and **R1** holds with one mapping rather than two that agree.
   *
   * `uniform.test.ts` asserts that identity directly, which is what keeps this
   * comment from becoming a claim nobody checks.
   *
   * **It holds for `substrate="canvas"`, which is what the editor mounts.** The
   * `"dom"` substrate quantises with `ceil` and has no presentation to undo it, so
   * an overlay over *that* would be off by the clip. Nothing here reads the
   * substrate; if the preview ever stops being a canvas, this is the line that
   * breaks.
   *
   * ## `vScale`
   *
   * `topPercent` and `sidePercent` are fractions of the box's **width**, not its
   * height (`07` §5.3) — cells are square, so the vertical pitch is the same
   * quantity as the horizontal one, and a percentage resolved against a height
   * would stretch every cell the moment a host overrode that height (**S8**).
   *
   * This overlay is `inset: 0` on a box whose height is the render box's, so a
   * vertical percentage here resolves against *that* height. `vScale` restates
   * the width fraction as the height fraction it has to become. Zero before the
   * box has a size, which collapses the overlay rather than dividing by zero.
   */
  const height = $derived(naturalHeight(g));
  const vScale = $derived(g.Wpx > 0 && height > 0 ? g.Wpx / height : 0);

  function styleOf(cell: Cell): string {
    const p = cellPlacementPercent(g.layout, g.columns, cell[0], cell[1]);
    return (
      `left: ${p.leftPercent}%; width: ${p.sidePercent}%; ` +
      `top: ${p.topPercent * vScale}%; height: ${p.sidePercent * vScale}%;`
    );
  }
</script>

<!--
  `role="application"` with a label, because this *is* a drawing surface and the
  keyboard equivalent is a genuinely different affordance rather than a missing
  one — a cell is named by coordinates, and §7.3 makes painting the point. `09`
  §3.1 specifies affordances and their obligations, not their appearance.
-->
<div
  class="layer"
  role="application"
  aria-label="Paint {param} cells"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onpointerleave={() => (hovered = null)}
>
  <!--
    The cursor, and the only thing this layer draws. Painted cells are
    `SelectionOverlay`'s, underneath — **E7**.
  -->
  {#if hovered !== null}
    <div class="cell hover" class:erasing={hasCell(cells, hovered)} style={styleOf(hovered)}></div>
  {/if}
</div>

<div class="readout">
  painting <code>{param}</code> · {cells.length}
  {cells.length === 1 ? "cell" : "cells"}
  {#if hovered !== null}<em>({hovered[0]}, {hovered[1]})</em>{/if}
</div>

<style>
  /*
    Pinned to the frame, which is the render box's own size — `08` **S9** gives
    the component's element no padding and no border, so the two coincide and
    this needs no measurement.
  */
  .layer {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    /* A stroke that leaves the box keeps its pointer capture rather than
       selecting the page text underneath. */
    touch-action: none;
    user-select: none;
  }

  .cell {
    position: absolute;
    box-sizing: border-box;
  }

  /*
    The cursor. Solid where the stroke would add, and warm where it would remove,
    so the mode the stroke will take is visible **before** it is committed to —
    the gesture decides on pointer-down and keeps that mode (`DECISIONS.md` D25).
  */
  .hover {
    border: 1px dashed rgba(43, 108, 176, 0.8);
    background: rgba(49, 130, 206, 0.1);
  }

  .hover.erasing {
    border-color: rgba(197, 48, 48, 0.75);
    background: rgba(197, 48, 48, 0.08);
  }

  .readout {
    position: absolute;
    left: 0;
    top: 100%;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    color: #5a6b80;
    white-space: nowrap;
  }

  .readout em {
    font-style: normal;
    color: #a0aec0;
  }

  code {
    font-family: ui-monospace, monospace;
    color: #2b6cb0;
  }
</style>
