<!--
  The selection overlay — `09-editor.md` §6.

  **Invariant E7** — *the editor draws exactly one kind of overlay: a low-opacity
  rectangle over each cell an Operation's Selection includes, shown in the
  Selection section of the Operation being edited. Its geometry comes from
  `cellBox`.*

  `07` §3.1 anticipated a family — selection outlines, hover highlights, per-cell
  badges — and V1 ships the first only. Anything the author needs to know about
  an Operation's *effect* they read from the picture itself, which is the point
  of **S2**: the preview is not a diagram of the stack, it is the stack.

  ## Two invariants, and neither is optional

  **E8 — the editor evaluates no Selection.** The cell set comes from the
  package's `selection()` export (§6.2). The editor contains no implementation of
  `checkerboard`'s parity, `everyNth`'s remainder, `rect`'s half-open bounds, or
  `random`'s channel draw. A second implementation "drifts silently in the one
  place the author is looking directly at it".

  **R1 — the geometry is `cellBox`, never recomputed.** §6.1 gives the failure
  exactly: the picture is right, the selection boxes are a few pixels off, and
  nothing anywhere reports it.

  ## Why not diff two grids

  §6.2 answers it: a diff shows *effect*, not *selection*. An Operation can
  select a cell and write a value identical to what was there — `multiply` by
  one, a palette entry matching the tile already present, a `set` of the default
  — and those cells would vanish from an overlay meant to show what the Operation
  acts on. It also costs two generations per frame where one suffices.
-->
<script lang="ts">
  import { selection, type TilesetConfig } from "@fndvit/gen-tilesets";
  import {
    cellPlacementPercent,
    naturalHeight,
    type GridGeometry,
  } from "@fndvit/gen-tilesets/render";

  interface Props {
    g: GridGeometry;
    /**
     * The **shadow** config — `{ ...config, operations: [...operations, draft] }`
     * where the Operation being edited is a draft (`DECISIONS.md` D7). A pure
     * local value; it touches nothing.
     */
    config: TilesetConfig;
    operationId: string;
    seed: string;
    /** `07` **R12**'s per-session value, so a flagged Operation's overlay matches. */
    loadSalt?: number;
  }

  let { g, config, operationId, seed, loadSalt = 0 }: Props = $props();

  /**
   * The cells the Operation acts on.
   *
   * **Bounded here, at the draw site** — §6.2: `selection()` is "total and
   * unbounded in `(x, y)`" because `04` §4.2 permits a `rect` to extend past the
   * grid and an author dragging one to the edge needs to see where it reached.
   * Only cells within `rows × columns` have a `cellBox` worth drawing, so the
   * bound is this loop's own extent rather than a test.
   *
   * The predicate is resolved once per config change and called per cell, which
   * is what `selection()` is shaped for: it fixes the effective seed and the
   * selection channel outside the closure.
   *
   * `selection()` **throws** on an unresolvable id (`DECISIONS.md` D11), which is the
   * answer this component wants: the alternative, a predicate answering `false`
   * everywhere, draws an empty overlay indistinguishable from a Selection that
   * legitimately matches nothing — on the one screen where the author is judging
   * exactly that.
   */
  const cells = $derived.by(() => {
    const includes = selection(config, operationId, seed, loadSalt);
    const out: [number, number][] = [];
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.columns; x++) if (includes(x, y)) out.push([x, y]);
    }
    return out;
  });

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

  function styleOf([x, y]: [number, number]): string {
    const p = cellPlacementPercent(g.layout, g.columns, x, y);
    return (
      `left: ${p.leftPercent}%; width: ${p.sidePercent}%; ` +
      `top: ${p.topPercent * vScale}%; height: ${p.sidePercent * vScale}%;`
    );
  }
</script>

<!--
  Purely decorative and never interactive: the brush layer above it takes the
  pointer where there is one, and **S2** puts the picture underneath untouched.
-->
<div class="overlay" aria-hidden="true">
  {#each cells as cell (`${cell[0]},${cell[1]}`)}
    <div class="cell" style={styleOf(cell)}></div>
  {/each}
</div>

<div class="readout">
  {cells.length} of {g.rows * g.columns}
  {cells.length === 1 ? "cell" : "cells"} selected
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /*
    §6.1's "low-opacity rectangle". Low enough that the tile underneath is still
    the thing being judged — the overlay says *which cells*, and the picture says
    what they look like.
  */
  .cell {
    position: absolute;
    box-sizing: border-box;
    background: rgba(49, 130, 206, 0.18);
    border: 1px solid rgba(49, 130, 206, 0.45);
  }

  .readout {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    color: #5a6b80;
    white-space: nowrap;
  }
</style>
