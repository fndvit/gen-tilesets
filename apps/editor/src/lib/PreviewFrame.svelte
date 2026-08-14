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
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import ReferenceControls from "./ReferenceControls.svelte";
  import ReferenceLayer from "./ReferenceLayer.svelte";
  import { frameExtent, layerHeight, loadReference, type Reference } from "../reference.js";

  interface Props {
    /**
     * The render box's natural aspect ratio, from the package's `naturalRatio`.
     *
     * Passed in rather than measured. `07` §5.3: "the render box's natural
     * aspect ratio is a constant" of `Layout` and `rows`, with `Wpx` cancelled
     * out, and "**no measurement is required**". So the frame's height is
     * `width / ratio` exactly, which is both cheaper than observing the element
     * and the only version that cannot form a measurement cycle — see the
     * `align-items` note in the styles below.
     */
    ratio: number;

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

    /**
     * `true` while §7.3's brush owns the pointer.
     *
     * The reference image's drag surface is not rendered then, so the stroke is
     * never shadowed by it. The frame knows nothing else about the brush.
     */
    painting?: boolean;
  }

  let { ratio, children, painting = false }: Props = $props();

  /**
   * The narrowest the frame may be dragged, in px.
   *
   * A **UI constant with no authority anywhere**, recorded in `DECISIONS.md`. It
   * exists so the handles cannot be dragged past each other, not because any
   * width is illegal: `07` §5.3 makes the layout correct at *every* `Wpx`, with
   * no minimum anywhere in the contract.
   */
  const MIN_WIDTH = 160;

  /**
   * Preset widths, offered as a convenience on this control.
   *
   * §9.2: they "carry no spec content". **The term _breakpoint_ is reserved for
   * `06` §12's `layouts` extension point and is not used for them** — these
   * select a preview width and nothing in the file responds to them, where a
   * breakpoint would eventually select a `Layout`. UI constants; see
   * `DECISIONS.md`.
   */
  const PRESETS = [375, 768, 1024, 1440];

  /**
   * How much room each handle needs beside the frame, in screen px.
   *
   * The handles sit just outside the render box — `08` **S9** gives the
   * component's own element no padding and no border so `Wpx` is unambiguously
   * its width, and drawing a handle inside it would both contradict that and
   * hide 9px of the picture the author is judging. So the column reserves the
   * gutter instead. A UI constant.
   */
  const HANDLE = 9;

  /** The default backdrop, and the value the reset returns to. See `background`. */
  const WHITE = "#ffffff";

  /** How much room the editor's own column has. Not a limit on `Wpx` — see `zoom`. */
  let available = $state(0);

  /**
   * The column, less the two handle gutters. What "fill" fills and what the zoom
   * fits into.
   *
   * **Floored to a whole pixel.** `clientWidth` in a flex column is routinely
   * fractional, so *fill* otherwise handed the render box a `Wpx` with a
   * fractional part that nothing in the editor chose and no two layouts would
   * agree on. `07` §5.3 makes the layout correct at every `Wpx`, fractional
   * included, and `08` §12's placement holds there too — this is not what fixed
   * the seams. It removes one avoidable source of run-to-run variation, so the
   * same file at the same preset draws the same picture.
   */
  const room = $derived(Math.max(Math.floor(available) - 2 * HANDLE, MIN_WIDTH));

  /**
   * The requested width. `null` means *fill the column* — the state a fresh
   * editor is in, and the one a window resize keeps correct with no drag state
   * to reconcile.
   *
   * **This is transient UI state and writes no field** (E11). §4.1 puts such
   * state beside the file, never in it and never in `meta` (**E4**).
   */
  let requested = $state<number | null>(null);

  /**
   * The colour behind the render box. **Writes no field**, exactly as the width
   * does (**E11**) — §4.1 puts such state beside the file, never in it and never
   * in `meta` (**E4**).
   *
   * White is the default and stays the right one: `07` §4.5 makes the output
   * decorative, so a tileset is drawn over whatever a host page puts behind it,
   * and a tinted preview would have the author judging every tile's edge against
   * a colour no visitor gets. That argument is also why this control exists — a
   * tileset destined for a dark page cannot be judged against white either, and
   * the author is the one who knows which backdrop is the honest one. What the
   * editor must not do is *decide* on a backdrop; offering the choice and
   * defaulting to none is not that.
   */
  let background = $state(WHITE);

  /**
   * `Wpx`. **Not clamped to what the editor can display.**
   *
   * An earlier version clamped it to `available`, which meant asking for 1024 in
   * a 866px column silently produced a 866px preview — the author judging a
   * composition at a width the file was never asked about. That is `07` §3's
   * stated worst outcome in miniature: approving a picture the file does not
   * produce.
   */
  const width = $derived(requested === null ? room : Math.max(requested, MIN_WIDTH));

  /**
   * The **display zoom**, applied when `Wpx` exceeds the room the editor has.
   *
   * `07` §5.3 is what makes this exact rather than an approximation: "every
   * horizontal quantity is a fixed fraction of `Wpx`", so the render box at
   * `Wpx = 1440` is precisely what a 1440px viewport shows, and shrinking the
   * whole result to fit the screen changes nothing about the composition.
   *
   * **The zoom is not `s`.** `s = Wpx / referenceWidth` lives inside the
   * component and decides how design px become render px. This is the editor
   * scaling the finished render box down so it fits on the author's monitor —
   * two different scalings, and conflating them would mean reporting a `Wpx` the
   * component never saw.
   *
   * Only ever shrinks: magnifying a small `Wpx` would show the author a picture
   * at a size no visitor gets, and the width control already exists for that.
   */
  const zoom = $derived(width > 0 && available > 0 ? Math.min(1, room / width) : 1);

  /**
   * The frame's laid-out height, computed rather than observed (`07` §5.3).
   *
   * `<Tileset>` declares this ratio and no explicit height (**S8**), so its
   * element resolves to exactly this. The viewport below reserves the *zoomed*
   * figure, because a transform does not affect layout and the frame would
   * otherwise leave its full-size gap behind.
   */
  const frameHeight = $derived(ratio > 0 ? width / ratio : 0);

  /**
   * The reference image and its three viewing controls — **E11** state, in the
   * same place and for the same reason as `background`. `reference.ts` carries
   * the reasoning; none of this reaches the file.
   */
  let reference = $state<Reference | null>(null);
  let referenceError = $state<string | null>(null);
  let yOffset = $state(0);
  let opacity = $state(1);
  let inFront = $state(false);

  /** The image's height at the render box's width, or zero with none loaded. */
  const imageHeight = $derived(reference === null ? 0 : layerHeight(width, reference));

  /**
   * What the viewport must reserve, in frame px.
   *
   * With no reference this is `{0, frameHeight}` and everything below reduces to
   * what the frame did before the layer existed — the check that this is inert
   * when unused.
   */
  const extent = $derived(frameExtent(frameHeight, imageHeight, reference === null ? 0 : yOffset));

  async function pickReference(file: File): Promise<void> {
    let next: Reference;
    try {
      next = await loadReference(file);
    } catch (cause) {
      // The previous reference, if any, is still drawn. A refusal costs the
      // author nothing they had.
      referenceError = cause instanceof Error ? cause.message : String(cause);
      return;
    }
    referenceError = null;
    reference = next;
  }

  function clearReference(): void {
    reference = null;
    referenceError = null;
    yOffset = 0;
  }

  /**
   * The object URL's whole lifetime, in one place.
   *
   * The cleanup runs when `reference` changes and again on unmount, so a
   * replaced picture and an unmounted editor release identically and neither
   * `pickReference` nor `clearReference` has to remember to. The store does the
   * same thing by hand in `replaceAll`, where the ordering matters; here it does
   * not, because nothing else holds the URL.
   */
  $effect(() => {
    const held = reference;
    return () => {
      if (held !== null) URL.revokeObjectURL(held.url);
    };
  });

  /** The drop half of the picker. One file; the rest are ignored, not refused. */
  function onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file === undefined) return;
    event.preventDefault();
    void pickReference(file);
  }

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
    requested = drag.startWidth + 2 * delta;
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    drag = null;
  }

  /** Keyboard equivalent, so the control is not pointer-only. */
  function onKeyDown(event: KeyboardEvent, direction: number): void {
    const step = event.shiftKey ? 100 : 10;
    if (event.key === "ArrowRight") requested = width + 2 * step * direction;
    else if (event.key === "ArrowLeft") requested = width - 2 * step * direction;
    else return;
    event.preventDefault();
  }
</script>

<div class="controls">
  <span class="readout">
    render box <code>{Math.round(width)}px</code>
    <em>
      Wpx · writes no field{#if zoom < 1} · shown at {Math.round(zoom * 100)}%{/if}
    </em>
  </span>
  <div class="presets">
    {#each PRESETS as preset (preset)}
      <button
        class:on={requested === preset}
        onclick={() => (requested = preset)}
      >
        {preset}
      </button>
    {/each}
    <button class:on={requested === null} onclick={() => (requested = null)}>fill</button>

    <!--
      The backdrop. Beside the width because it is the same kind of control —
      it changes what the author is looking at and writes nothing (**E11**).
    -->
    <span class="divider" aria-hidden="true"></span>
    <input
      type="color"
      class="bg"
      bind:value={background}
      aria-label="Preview background colour"
      title="Preview background — writes no field. The render box is decorative (07 §4.5); a host page supplies the real backdrop."
    />
    {#if background !== WHITE}
      <!--
        Offered only off the default, the same shape as `controls/BlendControl`'s
        "back to {fallback}". A colour picker makes returning to exactly white
        fiddly, and white is the value the rest of the reasoning assumes.
      -->
      <button class="reset-bg" onclick={() => (background = WHITE)} title="Back to white">
        ⟲
      </button>
    {/if}
  </div>
</div>

<ReferenceControls
  {reference}
  error={referenceError}
  onPick={(file) => void pickReference(file)}
  onClear={clearReference}
  onMatchWidth={() => {
    if (reference !== null) requested = reference.width;
  }}
  {width}
  {opacity}
  {inFront}
  {yOffset}
  onOpacity={(next) => (opacity = next)}
  onInFront={(next) => (inFront = next)}
  onOffset={(next) => (yOffset = next)}
/>

<!--
  The track measures the room available; the viewport reserves the zoomed height
  so the page below does not jump; the frame is laid out at the true `Wpx` and
  scaled down for display only.

  The drop target for a reference image is the track rather than the frame: the
  frame carries the brush and the overlays, and a drop is not one of their
  gestures. `dragover` must be prevented or the browser navigates to the file.
-->
<div
  class="track"
  bind:clientWidth={available}
  ondragover={(event) => event.preventDefault()}
  ondrop={onDrop}
  role="presentation"
>
  <!--
    The height is the *union* of the render box and the image layer (`extent`),
    not the render box's own — with no reference the two are the same number.
  -->
  <div class="viewport" style="height: {(extent.bottom - extent.top) * zoom}px;">
    <div
      class="frame"
      style="width: {width}px; transform: scale({zoom}) translateY({-extent.top}px);
             --zoom: {zoom}; background: {background};"
    >
    <!--
      Before the children so the source order says what the picture is: the page
      underneath, then the tileset drawn on it. The layer's own `z-index` is what
      actually decides, and it says why.
    -->
    {#if reference !== null}
      <ReferenceLayer
        {reference}
        height={imageHeight}
        {yOffset}
        onOffset={(next) => (yOffset = next)}
        {opacity}
        {inFront}
        {zoom}
        draggable={!painting}
      />
    {/if}

    <!--
      Two handles, one per edge. They sit outside the render box: `08` **S9**
      gives the component's own element no padding and no border so that `Wpx` is
      unambiguously its width, and a handle drawn inside it would be a decoration
      the component did not put there.
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
    ></button>

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
    ></button>
    </div>
  </div>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
    font-size: 0.8rem;
    color: #4a5568;
  }

  .readout em {
    font-style: normal;
    font-size: 0.72rem;
    color: #a0aec0;
    margin-left: 0.4rem;
  }

  .presets {
    display: flex;
    gap: 0.25rem;
  }

  .presets button {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .presets button.on {
    background: #cbd5e0;
    color: #1a202c;
  }

  .divider {
    width: 1px;
    align-self: stretch;
    background: #e2e8f0;
    margin: 0 0.15rem;
  }

  /* Sized to sit level with the preset buttons beside it. */
  .bg {
    width: 1.7rem;
    height: 1.45rem;
    padding: 0;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    background: none;
    cursor: pointer;
  }

  /* Without these the swatch floats inside a wide inset border in Chrome and
     Safari, and the control stops reading as the colour it holds. */
  .bg::-webkit-color-swatch-wrapper {
    padding: 1px;
  }

  .bg::-webkit-color-swatch {
    border: 0;
    border-radius: 2px;
  }

  .bg::-moz-color-swatch {
    border: 0;
    border-radius: 2px;
  }

  .reset-bg {
    line-height: 1;
  }

  /* The frame is centred in the track, so dragging either edge keeps the
     render box's centre axis where it was. */
  .track {
    /* The frame overflows this when Wpx exceeds the column, before the zoom
       brings it back inside. Hidden so a wide preview cannot reach the sidebar.
       The gutter the handles need is reserved by `room` above rather than by
       padding here, because `clientWidth` includes padding and measuring it
       would hand that space straight back. */
    overflow: hidden;
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
  }

  .frame {
    position: relative;
    /*
      **White by default, not the page's off-white.** The render box is the
      picture, and `07` §4.5 makes the output decorative — a tileset is drawn
      over whatever a host page puts behind it. A tinted preview would have the
      author judging every tile's edge against a colour no visitor gets, which is
      `07` §3's worst outcome in its mildest form. The dashed outline is the
      editor saying where the box ends; the box itself says nothing.

      The colour is set inline from `background` above, which starts at white and
      is the author's to change for the session. The editor still chooses no
      backdrop; it only stops pretending white is the absence of one.
    */
    outline: 1px dashed #cbd5e0;
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
    position: absolute;
    top: 0;
    bottom: 0;
    /* Above every layer inside the frame. They do not overlap the reference
       image's rect, which stops at the frame's edges, but the width control
       must not become the one thing a picture can cover. */
    z-index: 4;
    /*
      Counter-scaled, so the grab target stays the same size on screen whatever
      the display zoom is. Without this a 60% zoom leaves a 5px handle, and at
      the wide presets it becomes hard to hit — which is how the handles appeared
      to vanish before the zoom existed at all.
    */
    width: calc(9px / var(--zoom, 1));
    padding: 0;
    border: 0;
    border-radius: 0;
    cursor: ew-resize;
    background: #cbd5e0;
    touch-action: none;
  }

  .handle:hover,
  .handle:focus-visible {
    background: #a0aec0;
    outline: none;
  }

  .handle.left {
    left: calc(-9px / var(--zoom, 1));
  }

  .handle.right {
    right: calc(-9px / var(--zoom, 1));
  }
</style>
