<!--
  The preview width control — `09-editor.md` §9.2, **E11**.

  **Invariant E11** — *the preview width control sets `Wpx` on the render box and
  writes no field. It is not destructive and requires no confirmation.*

  §9.2 is a correction to a premise rather than to a rule. `02` §7.5 opened:
  "Because `columns` derives from a page width the author can drag at any time,
  resizing the editor preview after operations exist is a destructive edit." The
  premise is that the draggable page width **is** the design width. That premise
  is what §9.2 overturns; the destructive rule survives untouched and attaches to
  the numeric design-width field instead.

  `07` §9.1 has exactly two rows, and this is the second:

  | | What changes | Cost |
  | **Authoring resize** | `referenceWidth`, `columns` re-derived | destructive |
  | **Viewport resize**  | `Wpx`, hence `s`                       | pure scale, no regeneration |

  **Nothing new is required to make this work.** `07` §5.3 makes every ratio
  `Wpx`-independent and **R12** forbids regeneration on a width change, so
  dragging the handle shows the author the true responsive behaviour of the file
  at that width, exactly and with no approximation. `08` **S8** gives the render
  box a natural ratio and no height, so the height follows.

  **The design principle, which is the whole of the fix (§9.2):** the destructive
  edit must not be the one that is easy to do by accident. A page edge that can be
  dragged reads as a viewport, and a viewport does not destroy work.

  **Since 0.7.0 this is also the breakpoint preview**, and still writes no field.
  The file's `responsive` rules select a shape by render-box width, and the
  preview is `<Tileset>` on the file (**S2**), so dragging across a breakpoint
  shows the rule taking over with nothing added here.

  Since Stage 2 the width, the backdrop and the zoom live in `view.svelte.ts`,
  shared with `PreviewTopBar` (readout, breakpoints, presets, swatch).
  This component measures the column, owns the handles and draws at `Wpx`.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { preview } from "./view.svelte.js";

  interface Props {
    /**
     * The render box's natural aspect ratio at a width, from the package's
     * `naturalRatio`. A function of `Wpx` since 0.7.0, because a breakpoint can
     * change `rows` — still computed rather than measured, for the reason below.
     *
     * Passed in rather than measured. `07` §5.3: "the render box's natural
     * aspect ratio is a constant" of `Layout` and `rows`, with `Wpx` cancelled
     * out, and "**no measurement is required**". So the frame's height is
     * `width / ratio` exactly, which is both cheaper than observing the element
     * and the only version that cannot form a measurement cycle — see the
     * `align-items` note in the styles below.
     */
    ratio: (Wpx: number) => number;

    /**
     * Rendered with the current **`Wpx`**.
     *
     * This control is what sets `Wpx` (**E11**), so it is the one place that
     * number exists, and §7.3's brush needs it to build the `GridGeometry` its
     * overlay draws from. Handing it down is what keeps `07` **R1** true across
     * the boundary: the overlay computes its cell boxes from the same width the
     * component drew with, rather than from a second measurement that agrees
     * with it at most widths.
     */
    children: Snippet<[number]>;
  }

  let { ratio, children }: Props = $props();
  const width = $derived(preview.width);
  const zoom = $derived(preview.zoom);

  /**
   * The frame's laid-out height, computed rather than observed (`07` §5.3).
   *
   * `<Tileset>` declares this ratio and no explicit height (**S8**), so its
   * element resolves to exactly this. The viewport below reserves the *zoomed*
   * figure, because a transform does not affect layout and the frame would
   * otherwise leave its full-size gap behind.
   */
  const frameHeight = $derived.by(() => {
    const r = ratio(width);
    return r > 0 ? width / r : 0;
  });

  interface Drag {
    pointerId: number;
    startX: number;
    startWidth: number;
    /** `+1` dragging the right edge outward, `-1` the left. */
    direction: number;
  }

  let drag: Drag | null = null;

  function onPointerDown(event: PointerEvent, direction: number): void {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, startX: event.clientX, startWidth: width, direction };
  }

  /**
   * **The frame stays centred, so both edges move.** Dragging one edge outward
   * by `d` moves the other outward by `d` as well, and the width changes by
   * `2d` — which is what keeps the centre fixed and makes the control read as a
   * viewport rather than as a box with a left edge nailed down.
   *
   * The centring matters beyond feel: `07` §5.2 centres the grid on the render
   * box's centre axis, and that axis is what `horizontalAlignment`'s parity is
   * about. A frame that grew from one side would move the axis under the author
   * while they were judging the alignment.
   */
  function onPointerMove(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) return;
    // The pointer moves in screen px and `requested` is in `Wpx`, so under a
    // display zoom the two differ. Dividing here is the same conversion `07`
    // §8.2 assigns to the caller for pointer events, and Step 7's brush will
    // need it for exactly the same reason.
    const delta = ((event.clientX - drag.startX) * drag.direction) / zoom;
    preview.requested = drag.startWidth + 2 * delta;
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    drag = null;
  }

  /** Keyboard equivalent, so the control is not pointer-only. */
  function onKeyDown(event: KeyboardEvent, direction: number): void {
    const step = event.shiftKey ? 100 : 10;
    if (event.key === "ArrowRight") preview.requested = width + 2 * step * direction;
    else if (event.key === "ArrowLeft") preview.requested = width - 2 * step * direction;
    else return;
    event.preventDefault();
  }
</script>

<!--
  The track measures the room available; the viewport reserves the zoomed height
  so the page below does not jump; the frame is laid out at the true `Wpx` and
  scaled down for display only.
-->
<div class="track" bind:clientWidth={preview.available}>
  <div class="viewport" style="height: {frameHeight * zoom}px;">
    <div
      class="frame"
      style="width: {width}px; transform: scale({zoom});
             --zoom: {zoom};"
    >
    <!--
      Two handles, one per edge, just outside it. They are siblings of the render
      box, not inside it: `08` **S9** gives the component's own element no
      padding and no border so that `Wpx` is unambiguously its width.
    -->
    <button
      type="button"
      class="handle left"
      aria-label="Preview width, left edge. Arrow keys resize."
      onpointerdown={(e) => onPointerDown(e, -1)}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onkeydown={(e) => onKeyDown(e, -1)}
    ><span class="mark" aria-hidden="true"></span></button>

    {@render children(width)}

    <button
      type="button"
      class="handle right"
      aria-label="Preview width, right edge. Arrow keys resize."
      onpointerdown={(e) => onPointerDown(e, 1)}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onkeydown={(e) => onKeyDown(e, 1)}
    ><span class="mark" aria-hidden="true"></span></button>
    </div>
  </div>
</div>

<style>
  /* The frame is centred in the track, so dragging either edge keeps the
     render box's centre axis where it was. */
  /* Not clipped here: the grid reaches past the frame on purpose, and the
     picture area (`App.svelte`'s `.preview-body`) clips both it and a frame
     wider than the column before the zoom brings it back inside, so neither
     can reach the sidebar. The gutter the handles need is reserved by `room`
     rather than by padding here, because `clientWidth` includes padding and
     measuring it would hand that space straight back. */
  .track {
    min-width: 0;
  }

  /*
    A transform does not affect layout, so the frame still occupies its unscaled
    height and would leave a gap below. This reserves the zoomed height instead,
    and centres the frame within it.
  */
  .viewport {
    display: flex;
    justify-content: center;
    /*
      **`flex-start`, not the default `stretch`.** The viewport carries an
      explicit height, and stretching would impose it on the frame — overriding
      the aspect ratio `<Tileset>` declares (**S8**), which is the one thing that
      must decide the frame's height.

      An earlier version measured the frame instead of computing it, and this
      closed a cycle: the frame was stretched to the viewport's initial height of
      0, measured 0, and the viewport stayed 0 forever. `07` §5.3's "no
      measurement is required" is not only an optimisation.
    */
    align-items: flex-start;
    /* Room for the handles, whose squares and hit areas reach past the top
       and bottom of the box. Content-box, so the inline height stays the
       frame's own. */
    box-sizing: content-box;
    padding-block: var(--handle-hit-reach);
  }

  .frame {
    position: relative;
    /*
      No background and no outline of its own: the backdrop is the whole
      column's (`preview.background`, set in `App.svelte`), so the picture is
      judged against one colour everywhere. The handles mark the sides and the
      grid shows the cells; nothing marks top and bottom, as in Figma (Pol,
      Stage 2 P3b).
    */
    /* Scaled about the top centre, so the frame stays centred and the top edge
       stays put as the zoom changes. */
    transform-origin: top center;
    flex: none;
  }

  /*
    A native <button> rather than a `role="separator"` div. The ARIA window
    splitter pattern would be more descriptive, but a focusable separator reads
    as non-interactive to the linter, and a button gives focus, keyboard, and
    activation semantics with nothing suppressed. `09` §3.1 specifies affordances
    and their obligations, not their appearance, and this control's obligation is
    the one E11 states: it writes no field.
  */
  .handle {
    /*
      Counter-scaled, so the handle stays the same size on screen whatever the
      display zoom is. Every length below is divided by the zoom for the same
      reason.
    */
    --sq: calc(var(--handle-square) / var(--zoom, 1));
    --cap: calc(var(--handle-cap) / var(--zoom, 1));
    --cap-w: calc(var(--handle-cap-w) / var(--zoom, 1));
    --reach: calc(var(--handle-reach) / var(--zoom, 1));
    --hit: calc(var(--handle-hit-reach) / var(--zoom, 1));
    --line: calc(var(--handle-dot) / var(--zoom, 1));
    --gap: calc(var(--handle-dot-gap) / var(--zoom, 1));
    --mark-color: var(--color-ink);

    position: absolute;
    top: calc(-1 * var(--hit));
    bottom: calc(-1 * var(--hit));
    /* Above every layer inside the frame: the width control must not become
       the one thing an overlay can cover. */
    z-index: 4;
    width: calc(var(--handle-w) / var(--zoom, 1));
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    cursor: ew-resize;
    touch-action: none;
  }

  /*
    The hit area lies wholly outside the box edge, so it never covers a cell
    the Handpick brush paints (Pol, P4), and it reaches past the squares, so
    the ends are as easy to grab as the line (Pol, P3b review). It is the
    gutter `HANDLE` reserves.
  */
  .handle.left {
    left: calc(-1 * var(--handle-w) / var(--zoom, 1));
  }

  .handle.right {
    right: calc(-1 * var(--handle-w) / var(--zoom, 1));
  }

  .handle:focus-visible {
    outline-width: calc(var(--focus-w) / var(--zoom, 1));
    outline-offset: calc(var(--focus-offset) / var(--zoom, 1));
  }

  /* Hover and focus: the dotted line turns solid and doubles (Block F). */
  .handle:hover,
  .handle:focus-visible {
    --line: var(--cap-w);
    --gap: 0px;
  }

  .handle:active {
    --mark-color: var(--color-pressed);
  }

  /*
    Figma's *Handle*, drawn rather than downloaded so it stretches with the box:
    a square at each end, a solid cap from each square to the box edge, and a
    dotted line along the edge. Centred on the edge, the hit area's inner side;
    it draws over the box but takes no pointer.
  */
  .mark {
    position: absolute;
    top: calc(var(--hit) - var(--reach));
    bottom: calc(var(--hit) - var(--reach));
    left: calc(100% - var(--sq) / 2);
    width: var(--sq);
    pointer-events: none;
    background:
      linear-gradient(var(--mark-color), var(--mark-color)) center top / var(--sq) var(--sq) no-repeat,
      linear-gradient(var(--mark-color), var(--mark-color)) center bottom / var(--sq) var(--sq) no-repeat,
      linear-gradient(var(--mark-color), var(--mark-color)) left 50% top calc(var(--reach) - var(--cap)) /
        var(--cap-w) var(--cap) no-repeat,
      linear-gradient(var(--mark-color), var(--mark-color)) left 50% bottom calc(var(--reach) - var(--cap)) /
        var(--cap-w) var(--cap) no-repeat,
      repeating-linear-gradient(
          var(--mark-color) 0 var(--line),
          transparent var(--line) calc(var(--line) + var(--gap))
        )
        left 50% top var(--reach) / var(--line) calc(100% - 2 * var(--reach)) no-repeat;
  }

  .handle.right .mark {
    left: calc(-1 * var(--sq) / 2);
  }
</style>
