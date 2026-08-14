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
  import { selection, type TilesetConfig } from "@tileset/core";
  import { naturalHeight, snappedGrid, type GridGeometry } from "@tileset/core/render";

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
   * recompute (`07` §5.3) — but taken from the **snapped** edges the renderer
   * draws, not from `cellBox` directly (ADR-006).
   *
   * **R1** is the reason. `cellBox` is the ideal fractional geometry; since
   * ADR-006 the picture is drawn on the device pixel grid, up to half a device
   * pixel away from it. An overlay drawn from `cellBox` while the tiles are drawn
   * from `snappedGrid` is exactly §6.1's failure — "the picture is right, the
   * selection boxes are a few pixels off, and nothing anywhere reports it" —
   * smaller than before but reintroduced by hand. One mapping, so: the same one.
   */
  const height = $derived(naturalHeight(g));
  const dpr = $derived(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const edges = $derived(snappedGrid(g, dpr));

  function styleOf([x, y]: [number, number]): string {
    const pct = (n: number, total: number): number => (total > 0 ? (n / total) * 100 : 0);
    const left = edges.x[x]! / dpr;
    const top = edges.y[y]! / dpr;
    return (
      `left: ${pct(left, g.Wpx)}%; width: ${pct(edges.x[x + 1]! / dpr - left, g.Wpx)}%; ` +
      `top: ${pct(top, height)}%; height: ${pct(edges.y[y + 1]! / dpr - top, height)}%;`
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
