<!--
  The tile picker — `DESIGN_SYSTEM.md` *Tile picker*.

  A non-modal popover of thumbnails, opened from a palette entry's thumbnail,
  its menu's "Change tile…", or "Add entry". **Clear is always the first cell**:
  it is an ordinary palette entry (`04` §6.3), never a Tile in the library, so
  it is offered here and not in Tiles.

  It is placed `fixed` against its anchor, like `Menu`, so the sidebar's scroll
  area cannot clip it (`placeAt`, shared with `Explainer`). Arrow keys move between cells, Enter or a click picks,
  Esc or a click outside closes, and focus returns to the anchor.
-->
<script lang="ts">
  import type { Tile } from "@vit-foundation/gen-tilesets";
  import { placeAt, pressedOutside } from "../lib/ui/popover.js";
  import { nameOf, thumbOf } from "./palette.js";

  interface Props {
    anchor: HTMLElement;
    tiles: Tile[];
    /** The entry's tile, ringed; `undefined` when adding. */
    current?: string | null | undefined;
    onPick: (tileId: string | null) => void;
    /** `refocus` is false when the pointer went elsewhere: focus stays where it went. */
    onClose: (refocus: boolean) => void;
  }

  let { anchor, tiles, current, onPick, onClose }: Props = $props();

  const ids = $derived<(string | null)[]>([null, ...tiles.map((t) => t.id)]);

  let panel = $state<HTMLElement | undefined>(undefined);
  let place = $state({ top: 0, left: 0, up: false });

  $effect(() => {
    // Room for two rows of cells before it opens upward instead.
    place = placeAt(anchor.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, 200);
    // After the opener's own focus handling (Menu returns focus to its button on the next tick).
    const frame = requestAnimationFrame(() => {
      const at = Math.max(ids.indexOf(current ?? null), 0);
      cells()[current === undefined ? 0 : at]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  });

  function cells(): HTMLButtonElement[] {
    return panel ? Array.from(panel.querySelectorAll<HTMLButtonElement>(".cell")) : [];
  }

  /** How many cells sit on the first row, read from the layout so it follows the width. */
  function columns(all: HTMLButtonElement[]): number {
    const top = all[0]?.offsetTop;
    const n = all.findIndex((c) => c.offsetTop !== top);
    return n === -1 ? all.length : n;
  }

  function onkeydown(event: KeyboardEvent): void {
    const all = cells();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const cols = columns(all);
    const go = (i: number) => all[Math.min(Math.max(i, 0), all.length - 1)]?.focus();
    if (event.key === "ArrowRight") go(at + 1);
    else if (event.key === "ArrowLeft") go(at - 1);
    else if (event.key === "ArrowDown") go(at + cols);
    else if (event.key === "ArrowUp") go(at - cols);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(all.length - 1);
    else if (event.key === "Escape") onClose(true);
    else if (event.key === "Tab") onClose(false);
    else return;
    if (event.key !== "Tab") event.preventDefault();
  }

  function onpointerdown(event: PointerEvent): void {
    if (pressedOutside(event.target as Node, [panel, anchor])) onClose(false);
  }
</script>

<svelte:window {onpointerdown} onresize={() => onClose(false)} />

<div
  class="picker"
  class:up={place.up}
  role="dialog"
  aria-label="Choose a tile"
  tabindex="-1"
  bind:this={panel}
  style="--top: {place.top}px; --left: {place.left}px;"
  {onkeydown}
>
  <p class="title t-label">Choose a tile</p>
  <div class="grid">
    {#each ids as id (id ?? "")}
      {@const thumb = thumbOf(tiles, id)}
      <button
        type="button"
        class="cell"
        class:on={current !== undefined && id === current}
        aria-current={current !== undefined && id === current ? "true" : undefined}
        tabindex="-1"
        onclick={() => onPick(id)}
      >
        {#if thumb.url}
          <img src={thumb.url} alt="" />
        {:else}
          <span class="thumb" class:clear={thumb.clear}></span>
        {/if}
        <span class="name t-console">{nameOf(tiles, id)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .picker {
    position: fixed;
    top: calc(var(--top) + var(--space-2));
    left: var(--left);
    z-index: 20;
    box-sizing: border-box;
    width: min(var(--picker-w), calc(100vw - 2 * var(--space-7)));
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--color-panel);
    box-shadow: var(--shadow-float);
  }

  .picker.up {
    top: auto;
    bottom: calc(100vh - var(--top) + var(--space-2));
  }

  .title {
    padding: var(--space-2) var(--space-2) 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--picker-cell), 1fr));
    gap: var(--space-2);
    margin-top: var(--space-5);
  }

  .cell {
    display: grid;
    justify-items: center;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-3) var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .cell:hover {
    background: var(--color-hover);
  }

  .cell:focus-visible {
    outline-offset: calc(-1 * var(--focus-w));
  }

  /* The glyph grid's selected look: a 2px ink ring. */
  .cell.on {
    box-shadow: inset 0 0 0 var(--rule-strong) var(--color-selected);
  }

  img,
  .thumb {
    display: block;
    box-sizing: border-box;
    width: var(--picker-thumb);
    height: var(--picker-thumb);
    border-radius: var(--radius-xs);
    object-fit: cover;
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
  }

  .thumb {
    background: var(--color-field);
  }

  .thumb.clear {
    border: var(--rule-w) solid var(--color-edge);
    background: linear-gradient(
      to top right,
      transparent calc(50% - 0.5px),
      var(--color-edge) 50%,
      transparent calc(50% + 0.5px)
    );
    box-shadow: none;
  }

  .name {
    max-width: 100%;
    overflow: hidden;
    line-height: var(--leading-title);
    text-box: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
