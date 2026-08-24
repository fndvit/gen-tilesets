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
  import { naturalHeight, snappedGrid, type GridGeometry } from "@fndvit/gen-tilesets/render";
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
   * Percentages, not pixels.
   *
   * `07` §5.3 makes every horizontal quantity a fixed fraction of `Wpx`, so a box
   * expressed as a percentage of the layer is correct at every width and under
   * the display zoom with nothing to recompute on a resize. The same reason
   * `<Tileset>` places its own cells this way.
   *
   * From the **snapped** edges since ADR-006, not from `cellBox` directly — the
   * hover box has to land on the cell the author is about to paint, and the
   * renderer now draws on the device pixel grid. `07` **R1** wants one mapping;
   * `SelectionOverlay` carries the longer note.
   */
  const height = $derived(naturalHeight(g));
  const dpr = $derived(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const edges = $derived(snappedGrid(g, dpr));

  function styleOf(cell: Cell): string {
    const pct = (n: number, total: number): number => (total > 0 ? (n / total) * 100 : 0);
    const left = edges.x[cell[0]]! / dpr;
    const top = edges.y[cell[1]]! / dpr;
    return (
      `left: ${pct(left, g.Wpx)}%; width: ${pct(edges.x[cell[0] + 1]! / dpr - left, g.Wpx)}%; ` +
      `top: ${pct(top, height)}%; height: ${pct(edges.y[cell[1] + 1]! / dpr - top, height)}%;`
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
