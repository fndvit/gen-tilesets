<!--
  The reference image layer — a picture of the destination page, pinned to the
  render box at `Wpx`.

  **Invariant S2 is untouched.** The preview is `<Tileset>` on the editor's file
  and this draws over or under that output, never instead of it. **E11** — it
  writes no field; `reference.ts` carries the reasoning.

  ## Why this layer names a `z-index` when nothing else in the preview does

  The rest of the stack layers by DOM order alone, and that works because every
  overlay is meant to be *above* the picture: a positioned element paints above
  the static `<canvas>` whatever the source order says. This is the one layer
  that wants to go **underneath**, which DOM order cannot express — hence the
  negative index. `.frame` already carries a `transform` and is therefore a
  stacking context, so the negative value stays inside it and still paints above
  the frame's own backdrop colour, which is the order wanted: backdrop, then the
  page picture, then the tiles.
-->
<script lang="ts">
  import type { Reference } from "../reference.js";

  interface Props {
    reference: Reference;
    /** The layer's height in frame px — `layerHeight`, computed by the frame. */
    height: number;
    /** Frame px from the render box's top edge to the image's. May be negative. */
    yOffset: number;
    onOffset: (next: number) => void;
    opacity: number;
    /** Over the tiles rather than under them. */
    inFront: boolean;
    /**
     * The frame's display zoom, for the screen-px → frame-px conversion the drag
     * needs — the same one `PreviewFrame`'s handles and `paint.ts` do (`07`
     * §8.2 assigns it to the caller).
     */
    zoom: number;
    /**
     * `false` while the brush owns the pointer. The grab surface is simply not
     * rendered then, so §7.3's stroke is never shadowed by this.
     */
    draggable: boolean;
  }

  let { reference, height, yOffset, onOffset, opacity, inFront, zoom, draggable }: Props = $props();

  interface Drag {
    pointerId: number;
    startY: number;
    startOffset: number;
  }

  let drag = $state<Drag | null>(null);

  function onPointerDown(event: PointerEvent): void {
    const surface = event.currentTarget as HTMLElement;
    surface.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, startY: event.clientY, startOffset: yOffset };
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) return;
    // The pointer moves in screen px and the offset is in frame px, so under a
    // display zoom the two differ.
    onOffset(Math.round(drag.startOffset + (event.clientY - drag.startY) / (zoom || 1)));
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    drag = null;
  }

  /** Arrow keys, so the layer is not pointer-only. */
  function onKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 100 : 10;
    if (event.key === "ArrowDown") onOffset(yOffset + step);
    else if (event.key === "ArrowUp") onOffset(yOffset - step);
    else return;
    event.preventDefault();
  }

  const rect = $derived(`top: ${yOffset}px; height: ${height}px;`);
</script>

<div class="layer" class:front={inFront} style="{rect} opacity: {opacity};" aria-hidden="true">
  <!--
    Width is the render box's, height follows from the ratio — `reference.ts`.
    `draggable="false"` is the native image drag, which would otherwise start a
    file drag on top of the offset gesture.
  -->
  <img src={reference.url} alt="" draggable="false" />
</div>

{#if draggable}
  <!--
    A separate transparent surface rather than pointer events on the image: when
    the image is behind, the canvas paints over it and hit-testing follows the
    paint order, so the image itself can never be grabbed there. One surface at
    the image's own rect behaves the same whichever side it is drawn on.
  -->
  <button
    type="button"
    class="grab"
    class:dragging={drag !== null}
    style={rect}
    aria-label="Reference image position. Arrow keys move it."
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKeyDown}
  ></button>
{/if}

<style>
  .layer {
    position: absolute;
    left: 0;
    width: 100%;
    /* Under the tiles. See the note above for why this is the one z-index here. */
    z-index: -1;
    pointer-events: none;
  }

  .layer.front {
    z-index: 3;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  /*
    Above the canvas so it can be grabbed, below an in-front image so the picture
    is never dimmed by a control, and narrower than the frame at neither edge —
    the width handles sit outside the frame and are not covered.
  */
  .grab {
    position: absolute;
    left: 0;
    width: 100%;
    z-index: 2;
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
  }

  .grab.dragging {
    cursor: grabbing;
  }

  .grab:focus-visible {
    outline: 2px solid #4299e1;
    outline-offset: -2px;
  }
</style>
