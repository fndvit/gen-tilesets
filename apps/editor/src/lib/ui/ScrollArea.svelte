<!--
  A scrolling region whose scrollbar never takes room: the native bar is
  hidden and a thin handle is drawn on top of the content, as in VS Code (Pol,
  Block E review). A classic scrollbar appearing would narrow the sidebar and
  shift every control under the pointer.

  Scrolling itself stays native (wheel, trackpad, keyboard, focus scrolling
  into view), so the handle is only a picture of the position plus a drag
  target. It is `aria-hidden`: assistive technology scrolls the viewport, not
  the handle.

  The handle shows while the pointer is over the area, while it scrolls, and
  while it is dragged, then fades out. It is mid grey at partial opacity, so it
  reads on the black bars and on paper alike, and darker when hovered or
  dragged.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { scrollForDrag, thumbFor } from "./scrollbar.js";

  interface Props {
    children: Snippet;
    /**
     * Make the content at least as tall as the area, as a flex column, so a
     * child with `flex: 1` can centre itself in the visible height and still
     * scroll once it is taller (the preview column).
     */
    fill?: boolean;
  }

  let { children, fill = false }: Props = $props();

  /** Never shorter than this, so a long sidebar keeps a handle worth grabbing. */
  const MIN_THUMB = 24;
  /** How long the handle stays after the last scroll. */
  const LINGER_MS = 800;

  let viewport: HTMLElement | undefined = $state();
  let content: HTMLElement | undefined = $state();
  let client = $state(0);
  let scroll = $state(0);
  let top = $state(0);
  let scrolling = $state(false);
  let dragging = $state(false);

  const thumb = $derived(thumbFor(client, scroll, top, MIN_THUMB));

  function measure(): void {
    if (!viewport) return;
    client = viewport.clientHeight;
    scroll = viewport.scrollHeight;
    top = viewport.scrollTop;
  }

  // The content changes height when sections fold or operations open, without
  // a scroll event, so both boxes are observed.
  $effect(() => {
    if (!viewport || !content) return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  });

  let linger: ReturnType<typeof setTimeout> | undefined;

  function onScroll(): void {
    measure();
    scrolling = true;
    clearTimeout(linger);
    linger = setTimeout(() => (scrolling = false), LINGER_MS);
  }

  $effect(() => () => clearTimeout(linger));

  let startY = 0;
  let startTop = 0;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !viewport) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    startY = event.clientY;
    startTop = viewport.scrollTop;
    dragging = true;
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging || !viewport) return;
    viewport.scrollTop = scrollForDrag(client, scroll, startTop, event.clientY - startY, MIN_THUMB);
  }

  function onPointerUp(): void {
    dragging = false;
  }
</script>

<div class="area" class:active={scrolling || dragging} class:dragging>
  <div class="viewport" bind:this={viewport} onscroll={onScroll}>
    <div bind:this={content} class:fill>
      {@render children()}
    </div>
  </div>
  {#if thumb.size > 0}
    <div
      class="thumb"
      aria-hidden="true"
      style:height="{thumb.size}px"
      style:transform="translateY({thumb.offset}px)"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    ></div>
  {/if}
</div>

<style>
  .area {
    position: relative;
    min-height: 0;
    height: 100%;
  }

  /* The native bar is hidden, so it never takes width. */
  .viewport {
    height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .fill {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .viewport::-webkit-scrollbar {
    display: none;
  }

  .thumb {
    position: absolute;
    top: 0;
    right: var(--scrollbar-inset);
    z-index: 3;
    width: var(--scrollbar-w);
    border-radius: var(--scrollbar-w);
    background: var(--color-scrollbar);
    opacity: 0;
    touch-action: none;
    transition: opacity var(--dur-slow) var(--ease);
  }

  .area:hover .thumb,
  .active .thumb {
    opacity: var(--scrollbar-opacity);
  }

  .thumb:hover,
  .dragging .thumb {
    opacity: var(--scrollbar-opacity-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
  }
</style>
