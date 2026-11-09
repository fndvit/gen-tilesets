<!--
  The rectangle drag — batch 02 T-01, B-011.

  While the Operation being edited has a rectangle Selection (`rectParams` in
  `paint.ts`: exactly the integers `x`, `y`, `width`, `height`), the author drags
  on the preview to set it. The number fields stay the keyboard path, and still
  accept values past the grid.

  ## What this layer is, and what it is not

  The same split as `PaintLayer`, for the same reasons: **S2** keeps it a sibling
  pinned over the render box, and **E7**/**E8** keep the selected cells
  `SelectionOverlay`'s. Every move writes the four numbers into the draft, so the
  overlay underneath redraws the selection as it now is, through the package's
  `selection()` — this layer never draws "the selected cells" itself.

  What it draws is the **gesture**: a dashed outline of the rectangle the pointer
  traced, which follows the pointer past the grid's edge, and a hover outline
  when no drag is under way. The values it writes are clamped to the grid (Pol,
  batch 02 D-01): past the edge the outline keeps growing and the selection does
  not. The overlay is what shows the difference.
-->
<script lang="ts">
  import {
    cellPlacementPercent,
    naturalHeight,
    type GridGeometry,
  } from "@vit-foundation/gen-tilesets/render";
  import { cellReached, cellUnder, metricsOf, rectFrom, type Cell, type Rect } from "../paint.js";

  interface Props {
    g: GridGeometry;
    /** The render box element — `08` §7. Null until `<Tileset>` mounts. */
    box: HTMLElement | null;
    /** The draft's four values, or `null` while one of them is not a number. */
    rect: Rect | null;
    onChange: (rect: Rect) => void;
  }

  let { g, box, rect, onChange }: Props = $props();

  /** The cell under the pointer while no drag is under way. Purely a cursor. */
  let hovered = $state<Cell | null>(null);

  /**
   * A drag: the cell it started on and the cell the pointer has reached, both
   * unbounded. `$state` because the outline is drawn from it.
   */
  let drag = $state<{ pointerId: number; from: Cell; to: Cell; target: HTMLElement } | null>(null);

  /** The outline: the rectangle the pointer traced, unclamped (D-01's gesture). */
  const traced = $derived(drag === null ? null : rectFrom(drag.from, drag.to));

  function write(): void {
    if (drag === null) return;
    // D-01's result: clamped, so the rectangle never covers a cell the grid
    // does not have. Written on every move, as `paintCells` is, so the fields and
    // the overlay follow live.
    const next = rectFrom(drag.from, drag.to, { columns: g.columns, rows: g.rows });
    if (
      rect === null ||
      next.x !== rect.x ||
      next.y !== rect.y ||
      next.width !== rect.width ||
      next.height !== rect.height
    ) {
      onChange(next);
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (box === null || event.button !== 0) return;
    // A drag starts on a cell the grid has: the layer covers the render box, and
    // under `yOffset` part of it is row 0's clipped top, which is not a cell.
    const start = cellUnder(g, metricsOf(box), event.clientX, event.clientY);
    if (start === null) return;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, from: start, to: start, target };
    hovered = null;
    write();
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    if (box === null) return;
    if (drag === null) {
      hovered = cellUnder(g, metricsOf(box), event.clientX, event.clientY);
      return;
    }
    if (event.pointerId !== drag.pointerId) return;
    // Unbounded: the outline follows the pointer off the grid. `rectFrom`
    // applies the bound to what is written.
    const to = cellReached(g, metricsOf(box), event.clientX, event.clientY);
    if (to[0] === drag.to[0] && to[1] === drag.to[1]) return;
    drag.to = to;
    write();
  }

  /**
   * Ends the drag, keeping what was written. Every move already wrote the
   * values, so ending is only letting go of the pointer. Esc ends it the same
   * way rather than restoring the rectangle from before the drag: the plan
   * (batch 02 T-01) asks that `pointercancel` and Esc *end* the drag, and
   * nothing has reached the file yet — the draft is still open to be cancelled.
   */
  function end(): void {
    if (drag === null) return;
    if (drag.target.hasPointerCapture(drag.pointerId)) {
      drag.target.releasePointerCapture(drag.pointerId);
    }
    drag = null;
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag !== null && event.pointerId === drag.pointerId) end();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (drag !== null && event.key === "Escape") end();
  }

  /**
   * Percentages from `cellPlacementPercent`, with `vScale` restating the width
   * fraction as a height fraction. The same geometry, and the same reasons, as
   * `PaintLayer.styleOf` — read that comment; it is not repeated here.
   * `cellPlacementPercent` is linear in the cell index, so an outline that runs
   * off the grid is placed correctly too.
   */
  const height = $derived(naturalHeight(g));
  const vScale = $derived(g.Wpx > 0 && height > 0 ? g.Wpx / height : 0);

  function styleOf(r: Rect): string {
    const p = cellPlacementPercent(g.layout, g.columns, r.x, r.y);
    return (
      `left: ${p.leftPercent}%; width: ${p.sidePercent * r.width}%; ` +
      `top: ${p.topPercent * vScale}%; height: ${p.sidePercent * r.height * vScale}%;`
    );
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<!--
  `role="application"` with a label, as `PaintLayer`: a drawing surface whose
  keyboard equivalent is the four number fields in the Selection section.
-->
<div
  class="layer"
  role="application"
  aria-label="Drag to draw the selection rectangle"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={end}
  onpointerleave={() => (hovered = null)}
>
  {#if traced !== null}
    <div class="outline" style={styleOf(traced)}></div>
  {:else if hovered !== null}
    <div class="outline hover" style={styleOf({ x: hovered[0], y: hovered[1], width: 1, height: 1 })}></div>
  {/if}
</div>

<div class="readout">
  rectangle
  {#if rect !== null}
    · <em>{rect.x}, {rect.y} · {rect.width} × {rect.height}</em>
  {/if}
</div>

<style>
  /* Pinned to the frame, as `PaintLayer`'s is. */
  .layer {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
    user-select: none;
  }

  /*
    The dragged outline is dashed and unfilled: the fill is `SelectionOverlay`'s,
    underneath, and it stops at the grid's edge while this keeps going (D-01).
    So the one place the two differ is exactly what was not selected.
  */
  .outline {
    position: absolute;
    box-sizing: border-box;
    border: var(--rule-w) dashed var(--color-selection);
    pointer-events: none;
  }

  .outline.hover {
    border-color: color-mix(in srgb, var(--color-selection) 80%, transparent);
    background: color-mix(in srgb, var(--color-selection) 10%, transparent);
  }

  .readout {
    position: absolute;
    left: 0;
    top: 100%;
    margin-top: var(--space-2);
    font-size: var(--text-xs-size);
    color: var(--color-muted);
    white-space: nowrap;
  }

  .readout em {
    font-style: normal;
    font-family: var(--font-mono);
    color: var(--color-ink);
  }
</style>
