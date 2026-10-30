<!--
  The render box before its renderer exists: what `<Tileset>` and
  `<TileDecoration>` write into server-rendered HTML so the page reserves the
  tileset's space before any script runs (**S8**). `./placeholder.ts` computes
  it and says why it matches the renderer's own pre-measurement box; this only
  writes it out. Internal — not exported.

  The tree is the renderer's, element for element: the reservation's selectors
  are `[data-tileset-wrapper="<id>"]>[data-tileset-box]:not([data-measured])`,
  so the box must carry `data-tileset-box` and sit directly in the wrapper, and
  `tileset.css` must style it as it styles the real one. `data-tileset-placeholder`
  is what tells the two apart, for anyone who looks between the two renders.

  The stylesheet goes through `{@html}` because its selectors carry the id; every
  value in it is a number or the id, never text a page author wrote
  (`reservationCss`).
-->
<script lang="ts">
  import { WRAPPER_ATTRIBUTE } from "./measure.js";
  import type { PlaceholderBox } from "./placeholder.js";

  let { p }: { p: PlaceholderBox } = $props();
</script>

{#snippet box()}
  <div class={p.className} style={p.style} aria-hidden="true" data-tileset-box="" data-tileset-placeholder="">
    {#if p.substrate === "canvas"}
      <canvas class="presented" data-tileset-canvas=""></canvas>
    {:else if p.extent !== null}
      <div class="extent" data-tileset-extent="" style={p.extent}></div>
    {/if}
  </div>
{/snippet}

{#if p.wrapper !== null}
  <div {...{ [WRAPPER_ATTRIBUTE]: p.wrapper.id }} class="tileset-container">
    {@html `<style>${p.wrapper.css}</style>`}
    {@render box()}
  </div>
{:else}
  {@render box()}
{/if}
